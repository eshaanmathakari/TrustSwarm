import os
import asyncio
import json
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import httpx

# ... (FastAPI app setup, load_dotenv, etc. remains the same) ...
load_dotenv()
app = FastAPI()

# --- Environment Variables ---
MISTRAL_KEY = os.getenv("MISTRAL_KEY")
CORAL_SERVER_HOST = os.getenv("CORAL_SERVER_HOST", "http://localhost:5555")
THIS_HOST = os.getenv("THIS_HOST", "http://localhost:8000")

# --- Custom Tool Definition (This part stays the same) ---
customTools = {
    "prediction-result": {
        "transport": { "type": "http", "url": f"{THIS_HOST}/mcp/prediction-result" },
        "toolSchema": {
          "name": "send_prediction_result",
          "description": "Send the final prediction result back.",
          "inputSchema": {
            "type": "object",
            "properties": { "result": { "type": "string" } },
            "required": ["result"]
          }
        }
    }
}

# --- MODIFIED Agent Graph Creation ---

def create_app_graph_request(query: str):
    """
    MODIFIED: This function now attempts to call the 'predict0' agent directly.
    - We remove the 'interface' agent.
    - We give the 'USER_REQUEST' option directly to 'predict0'.
    - We give 'predict0' access to the callback tool.
    """
    predict_agent_config = {
        "id": {"name": "predict0", "version": "1.0.0"},
        "name": "predict0",
        "coralPlugins": [],
        "provider": {"type": "local", "runtime": "executable"},
        "blocking": True,
        "options": {
            "MODEL_API_KEY": {"type": "string", "value": MISTRAL_KEY},
            # We are now passing the user's request directly to this agent
            "USER_REQUEST": {"type": "string", "value": query}
        },
        # We grant predict0 the ability to call our callback tool
        "customToolAccess": ["prediction-result"],
    }
    
    final_req = {
        "agents": [predict_agent_config], # Only our agent is in the graph
        "groups": [], # No groups needed for a single agent
        "customTools": customTools
    }
    return final_req


# --- API Endpoints (These remain the same) ---
pending_predictions: dict[str, asyncio.Future] = {}

class Source(BaseModel):
    url: str
    name: str

class PredictionRequest(BaseModel):
    title: str
    markets: list[str]
    sources: list[Source]

class PredictionResult(BaseModel):
    result: str

@app.post("/predict")
async def predict(request: PredictionRequest):
    loop = asyncio.get_event_loop()
    future = loop.create_future()
    
    request_json_string = request.model_dump_json()
    payload = {
        "privacyKey": "privkey",
        "applicationId": "predictionApp",
        "agentGraphRequest": create_app_graph_request(request_json_string),
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

    pending_predictions[session_id] = future

    try:
        print(f"Waiting for result from session: {session_id} with predict0 as the direct agent.")
        # We will set a shorter timeout here to see the result faster
        result = await asyncio.wait_for(future, timeout=45) 
    except asyncio.TimeoutError:
        print("Request timed out as predicted.")
        raise HTTPException(status_code=504, detail="Prediction request timed out. The agent never called back.")
    finally:
        pending_predictions.pop(session_id, None)
    
    # This line will likely not be reached
    return {"result": result}


@app.post("/mcp/prediction-result/{session_id}/{agent_id}")
async def mcp_prediction_result(session_id: str, agent_id: str, body: PredictionResult = Body(...)):
    print(f"SUCCESS: Received result for session {session_id} from agent {agent_id}")
    future = pending_predictions.get(session_id)
    if not future:
        raise HTTPException(status_code=404, detail="No pending request for this session.")
    if not future.done():
        future.set_result(body.result)
    return {"status": "success"}