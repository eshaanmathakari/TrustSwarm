import os
import asyncio
import json
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import httpx

# Load environment variables from a .env file
load_dotenv()

app = FastAPI(
    title="Prediction Agent Microservice",
    description="A microservice to interact with the Coral Prediction Agent.",
)

# --- Environment Variables ---
# These would be in your .env file
# OPENAI_KEY = os.getenv("OPENAI_KEY")
MISTRAL_KEY = os.getenv("MISTRAL_KEY") # Your agent uses Mistral

CORAL_SERVER_HOST = os.getenv("CORAL_SERVER_HOST", "http://localhost:5555")
THIS_HOST = os.getenv("THIS_HOST", "http://localhost:8000")

# --- Agent Graph & Custom Tool Definition ---

# This custom tool is how the agent will send the final result back to us.
# The 'interface' agent will be granted access to this tool.
customTools = {
    "prediction-result": {
        "transport": {
            "type": "http",
            "url": f"{THIS_HOST}/mcp/prediction-result"
        },
        "toolSchema": {
          "name": "send_prediction_result",
          "description": "Send the final prediction result back to the user.",
          "inputSchema": {
            "type": "object",
            "properties": {
              "result": {
                "type": "string",
                "description": "The JSON string of the prediction result"
              }
            },
            "required": ["result"]
          }
        }
    }
}

# This is the static definition of our agent graph.
# We will dynamically insert the 'interface' agent into this structure.
agentGraphRequest = {
    "agents": [
        {},  # Placeholder for the dynamic interface agent
        {
            "id": {"name": "predict0", "version": "1.0.0"},
            "name": "predict0",
            "coralPlugins": [],
            "provider": {"type": "local", "runtime": "executable"},
            "blocking": True,
            "options": {
                "MODEL_API_KEY": {"type": "string", "value": MISTRAL_KEY},
                # Add other options from your coral-agent.toml if needed
            },
            "customToolAccess": [],
        },
    ],
    "groups": [["interface", "predict0"]],
    "customTools": customTools
}

def create_app_graph_request(query: str):
    """
    Creates the full agent graph request by injecting a temporary 'interface' agent.
    This interface agent's only job is to start the conversation and return the result.
    """
    interface_agent = {
        "id": {"name": "interface", "version": "0.0.1"},
        "name": "interface",
        "coralPlugins": [],
        "provider": {"type": "local", "runtime": "executable"},
        "blocking": True,
        "options": {
            "MODEL_API_KEY": {"type": "string", "value": OPENAI_KEY},
            # This is the crucial part: we pass the user's request directly
            # to the interface agent, which it will then send to the predict0 agent.
            "USER_REQUEST": {"type": "string", "value": query}
        },
        # We give this agent permission to call our custom tool to send the result back.
        "customToolAccess": ["prediction-result"],
    }
    
    final_req = agentGraphRequest.copy()
    final_req["agents"][0] = interface_agent
    return final_req

# --- API Endpoints ---

# Dictionary to hold pending prediction requests.
# The key is the sessionId and the value is an asyncio.Future.
pending_predictions: dict[str, asyncio.Future] = {}

# Pydantic models for request and response validation
class Source(BaseModel):
    url: str
    name: str

class PredictionRequest(BaseModel):
    title: str
    markets: list[str]
    sources: list[Source]

class PredictionResult(BaseModel):
    result: str

@app.post("/predict", response_model=PredictionResult)
async def predict(request: PredictionRequest):
    """
    This endpoint receives a prediction request from the frontend,
    starts a Coral session, and waits for the result.
    """
    # 1. Create a future to wait for the result from the callback
    loop = asyncio.get_event_loop()
    future = loop.create_future()
    
    # 2. Construct the payload for the Coral Server
    # We serialize the user's request into a JSON string to pass to the interface agent.
    request_json_string = request.model_dump_json()
    payload = {
        "privacyKey": "privkey",
        "applicationId": "predictionApp",
        "agentGraphRequest": create_app_graph_request(request_json_string),
    }

    # 3. POST request to coral server to create the session
    session_id = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print("Sending request to Coral Server...")
            response = await client.post(f"{CORAL_SERVER_HOST}/api/v1/sessions", json=payload)
            response.raise_for_status()  # Raise an exception for bad status codes
            data = response.json()
            session_id = data.get("sessionId")
            if not session_id:
                raise HTTPException(status_code=500, detail="Failed to create Coral session")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Could not connect to Coral Server: {e}")

    # 4. Store the future so the callback endpoint can find it
    pending_predictions[session_id] = future

    try:
        # 5. Wait for the future to be resolved by the callback endpoint
        print(f"Waiting for result from session: {session_id}")
        result = await asyncio.wait_for(future, timeout=300) # 5-minute timeout
        return {"result": result}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Prediction request timed out.")
    finally:
        # 6. Clean up the pending request dictionary
        pending_predictions.pop(session_id, None)


@app.post("/mcp/prediction-result/{session_id}/{agent_id}")
async def mcp_prediction_result(session_id: str, agent_id: str, body: PredictionResult = Body(...)):
    """
    This is the CALLBACK endpoint. The 'interface' agent calls this via the
    'send_prediction_result' custom tool to deliver the final prediction.
    """
    print(f"Received result for session {session_id} from agent {agent_id}: {body.result}")
    
    # Find the pending search future by its sessionId
    future = pending_predictions.get(session_id)
    if not future:
        raise HTTPException(status_code=404, detail="No pending request found for this session.")

    # Set the result on the future, which unblocks the original /predict request
    if not future.done():
        future.set_result(body.result)
    
    return {"status": "success"}