#!/usr/bin/env python3
"""
Coral Scoring Agent (Deterministic)
"""

import urllib.parse
from dotenv import load_dotenv
import os, json, asyncio, logging, traceback
from langchain_mcp_adapters.client import MultiServerMCPClient

# --- Logger Setup ---
def setup_logger(agent_id: str) -> logging.Logger:
    logger = logging.getLogger(agent_id)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if not logger.handlers:
        file_handler = logging.FileHandler(f'{agent_id}.log', mode='w')
        stream_handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        stream_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)
    return logger

def calculate_score(prediction_data: dict) -> dict:
    """Applies a hardcoded set of rules to score a prediction."""
    try:
        # Safely access the nested probabilities
        probabilities = prediction_data.get('response', {}).get('probabilities', {})
        anthropic_prob = probabilities.get("Anthropic", 0.0)
        openai_prob = probabilities.get("OpenAI", 0.0)

        if anthropic_prob > openai_prob:
            return {
                "score": 95,
                "comment": "High score awarded. The model correctly identified the higher potential of Anthropic based on the provided (or unprovided) sources."
            }
        else:
            return {
                "score": 60,
                "comment": "Standard score. The model favored OpenAI, which is a common but less nuanced take."
            }
    except Exception as e:
        return {
            "score": 0,
            "comment": f"Scoring failed due to an error: {str(e)}"
        }

async def main():
    agentID = os.getenv("CORAL_AGENT_ID", "scoring")
    logger = setup_logger(agentID)
    logger.info("--- SCRIPT STARTED ---")

    runtime = os.getenv("CORAL_ORCHESTRATION_RUNTIME", None)
    if runtime is None: load_dotenv()

    base_url = os.getenv("CORAL_SSE_URL")
    coral_params = {"agentId": agentID, "agentDescription": "A deterministic agent that scores predictions."}
    query_string = urllib.parse.urlencode(coral_params)
    CORAL_SERVER_URL = f"{base_url}?{query_string}"
    
    client = MultiServerMCPClient(connections={"coral": {"transport": "sse", "url": CORAL_SERVER_URL}})
    logger.info("Persistent Connection Client Established. Getting tools...")
    
    try:
        coral_tools = await client.get_tools(server_name="coral")
        wait_for_mentions, send_message = (next((t for t in coral_tools if t.name == name), None) for name in ["coral_wait_for_mentions", "coral_send_message"])
        if not all([wait_for_mentions, send_message]):
            raise ValueError("FATAL: Missing required Coral tools.")
    except Exception as e:
        logger.critical(f"Failed to initialize tools: {e}", exc_info=True)
        return

    logger.info("Initialization complete. Starting listener loop.")
    while True:
        try:
            logger.info("Waiting for a prediction to score...")
            raw_result = await wait_for_mentions.ainvoke({"timeoutMs": 60000})
            result = json.loads(raw_result) if isinstance(raw_result, str) and raw_result else raw_result
            
            messages = result.get("messages", [])
            if not messages: continue
            
            for message in messages:
                thread_id, sender_id_str, content = message.get("threadId"), message.get("senderId"), message.get("content", "")
                if not all([thread_id, sender_id_str, content]): continue
                
                logger.info(f"Received prediction to score from {sender_id_str}.")
                prediction_data = json.loads(content)
                
                # Perform the scoring
                score_result = calculate_score(prediction_data)
                
                logger.info(f"Scoring complete. Sending score back to {sender_id_str}...")
                await send_message.ainvoke({
                    "threadId": thread_id, 
                    "content": json.dumps(score_result), 
                    "mentions": [sender_id_str]
                })
                logger.info("Successfully scored and sent reply.")
            
        except Exception as e:
            logger.critical(f"CRITICAL ERROR in main loop: {e}", exc_info=True)
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())