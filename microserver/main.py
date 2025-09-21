import os
import asyncio
import json
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

# --- Boilerplate Setup ---
load_dotenv()
app = FastAPI(title="Coral Agent Microservice Gateway")

# --- Environment Variables & Global Config ---
MISTRAL_KEY = os.getenv("MISTRAL_KEY")
FIRECRAWL_KEY = os.getenv("FIRECRAWL_API_KEY") # Added for the Firecrawl agent

CORAL_SERVER_HOST = os.getenv("CORAL_SERVER_HOST", "http://localhost:5555")
THIS_HOST = os.getenv("THIS_HOST", "http://localhost:8000")

# The custom tool allows the InterfaceAgent to call back to this service.
customTools = {
    "prediction-result": {
        "transport": {"type": "http", "url": f"{THIS_HOST}/mcp/prediction-result"},
        "toolSchema": {
          "name": "send_prediction_result",
          "description": "Send the final, aggregated prediction result back.",
          "inputSchema": {
            "type": "object",
            "properties": {"result": {"type": "string"}},
            "required": ["result"]
          }
        }
    }
}

# --- Agent Graph Creation ---

def create_app_graph_request(user_request_str: str, worker_agent_names: list[str]):
    """
    Creates the agent graph for a session.
    It now includes the Interface, Predict, AND Firecrawl agents.
    """
    # 1. Define the InterfaceAgent (The Orchestrator)
    interface_agent_config = {
        "id": {"name": "interface", "version": "0.0.1"},
        "name": "interface",
        "provider": {"type": "local", "runtime": "executable"},
        "coralPlugins": [],
        "blocking": True,
        "options": {
            "USER_REQUEST": {"type": "string", "value": user_request_str}
        },
        "customToolAccess": ["prediction-result"],
    }

    # 2. Define the PredictAgent(s) (The Workers)
    worker_agent_configs = []
    for name in worker_agent_names:
        worker_agent_configs.append({
            "id": {"name": name, "version": "1.0.0"},
            "name": name,
            "provider": {"type": "local", "runtime": "executable"},
            "coralPlugins": [],
            "blocking": True,
            "options": {
                # The worker agents DO need their API key.
                "MODEL_API_KEY": {"type": "string", "value": MISTRAL_KEY},
            },
            "customToolAccess": [],
        })
        
    # 3. *** NEW: Define the Firecrawl Agent (The Tool) ***
    firecrawl_agent_config = {
        "id": {"name": "firecrawl", "version": "0.0.1"},
        "name": "firecrawl",
        "provider": {"type": "local", "runtime": "executable"},
        "coralPlugins": [],
        "blocking": True,
        "options": {
            # Pass the required API keys from our environment
            "FIRECRAWL_API_KEY": {"type": "string", "value": FIRECRAWL_KEY},
            "MODEL_API_KEY": {"type": "string", "value": MISTRAL_KEY},
        },
        "customToolAccess": [],
    }

    # 4. Combine all agents into one list
    all_agents = [interface_agent_config, firecrawl_agent_config] + worker_agent_configs
    
    # 5. *** NEW: Add firecrawl to the communication group ***
    #    This allows the predict agents to talk to it.
    all_agent_names = ["interface", "firecrawl"] + worker_agent_names
    
    return {
        "agents": all_agents,
        "groups": [all_agent_names],
        "customTools": customTools
    }

# --- Pydantic Models for API Validation ---

class PredictionData(BaseModel):
    title: str
    markets: list[str]

class PredictionResult(BaseModel):
    result: str

# Dictionary to hold pending requests while they are being processed by the agents
pending_predictions: dict[str, asyncio.Future] = {}


# --- Core API Logic (Shared by all endpoints) ---

async def start_session_and_wait_for_result(agent_graph: dict):
    """Handles session creation and awaits the callback from the InterfaceAgent."""
    loop = asyncio.get_event_loop()
    future = loop.create_future()
    
    payload = {
        "privacyKey": "privkey",
        "applicationId": "predictionApp",
        "agentGraphRequest": agent_graph,
    }

    session_id = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(f"{CORAL_SERVER_HOST}/api/v1/sessions", json=payload)
            response.raise_for_status()
            data = response.json()
            session_id = data.get("sessionId")
            if not session_id:
                raise HTTPException(status_code=500, detail="Failed to create Coral session")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Could not connect to Coral Server: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Coral Server Error: {e.response.text}")


    pending_predictions[session_id] = future

    try:
        print(f"Waiting for result from InterfaceAgent in session: {session_id}")
        # Give the agents up to 5 minutes to complete the work
        result = await asyncio.wait_for(future, timeout=300) 
        return json.loads(result)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="The agent orchestration timed out.")
    finally:
        pending_predictions.pop(session_id, None)


# --- API Endpoints ---

@app.post("/predict/single/{agent_name}")
async def predict_single(agent_name: str, request_data: PredictionData):
    """Endpoint for a single prediction from a specific agent."""
    # Create the structured USER_REQUEST for the InterfaceAgent
    user_request_str = json.dumps({
      "task": "single",
      "payload": {
        "agent_name": agent_name,
        "request_data": request_data.model_dump()
      }
    })
    
    # Create an agent graph with the interface and the one targeted worker
    agent_graph = create_app_graph_request(user_request_str, worker_agent_names=[agent_name])
    
    return await start_session_and_wait_for_result(agent_graph)


@app.post("/predict/benchmark")
async def predict_benchmark(request_data: PredictionData):
    """Endpoint for running a benchmark across multiple agents."""
    # Here we hardcode the agents we want to use for the benchmark.
    # This could also come from a config file or another service.
    benchmark_agents = ["predict0", "predict1",] # "predict2"] 

    # Create the structured USER_REQUEST for the InterfaceAgent
    user_request_str = json.dumps({
      "task": "benchmark",
      "payload": {
        "agent_prefix": "predict", # The interface will find all agents with this prefix
        "request_data": request_data.model_dump()
      }
    })

    # Create an agent graph with the interface and all benchmark workers
    agent_graph = create_app_graph_request(user_request_str, worker_agent_names=benchmark_agents)

    return await start_session_and_wait_for_result(agent_graph)


# --- Callback Endpoint (No changes needed) ---

@app.post("/mcp/prediction-result/{session_id}/{agent_id}")
async def mcp_prediction_result(session_id: str, agent_id: str, body: PredictionResult = Body(...)):
    """This is the callback URL that the InterfaceAgent calls to deliver the final result."""
    print(f"SUCCESS: Received result for session {session_id} from {agent_id}")
    future = pending_predictions.get(session_id)
    if not future:
        # This can happen if the request already timed out
        print(f"Warning: Received result for an unknown or timed-out session: {session_id}")
        return {"status": "ignored"}
        
    if not future.done():
        future.set_result(body.result)
    
    return {"status": "success"}