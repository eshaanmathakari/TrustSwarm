#!/usr/bin/env python3
"""
Coral Prediction Agent (Definitive, Robust Version)
"""

import urllib.parse
from dotenv import load_dotenv
import os, json, asyncio, traceback
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mistralai import ChatMistralAI
import logging

f = open("ffd", "w")
print("hello", file=f)
f.flush()
f.close()


def setup_logger(agent_id: str) -> logging.Logger:
    """Sets up a logger that writes to a file and to the console."""
    # Create logger
    logger = logging.getLogger(agent_id)
    logger.setLevel(logging.INFO)

    # Prevent logs from propagating to the root logger
    logger.propagate = False

    # Create file handler
    file_handler = logging.FileHandler(f'{agent_id}.log', mode='w')
    file_handler.setLevel(logging.INFO)

    # Create console handler
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)

    # Create formatter and add it to the handlers
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    stream_handler.setFormatter(formatter)

    # Add handlers to the logger if they aren't already added
    if not logger.handlers:
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)

    return logger



# --- Helper functions (These are correct, no changes needed) ---
def create_task_prompt(event_title: str, market_names: list) -> str:
    market_list_str = "\n".join([f"- {market}" for market in market_names])
    json_example = ",\n                ".join(
        [f'"{market}": <probability_value_from_0_to_1>' for market in market_names])

    return f"""
You are an AI assistant specialized in analyzing and predicting real-world events. You have deep expertise in predicting the outcome of the event: "{event_title}". Based on collected sources, your goal is to extract meaningful insights and provide well-reasoned predictions. You will be predicting the probability (as a float value from 0 to 1) of ONLY the following possible outcomes:
{market_list_str}
Your response MUST be in JSON format with the following structure:```json
{{
    "rationale": "<A short, concise, 3 sentence rationale>",
    "probabilities": {{
        {json_example}
    }}
}}
```
""".strip()

def create_user_prompt(sources: str, market_stats: dict = None) -> str:
    return f"HERE IS THE GIVEN DATA:\n{sources}".strip()

def format_sources(sources: list) -> str:
    if not sources: return "No sources available for this event."
    formatted_sources = []
    for source in sources:
        source_text = f"Source {source.get('ranking', 'N/A')}: {source.get('title', 'No title')}\n"
        source_text += f"URL: {source.get('url', 'No URL')}\n"
        source_text += f"Summary: {source.get('summary', 'No summary')}\n"
        formatted_sources.append(source_text)
    return "\n---\n".join(formatted_sources)

def parse_message_content(content: str) -> dict:
    try: return json.loads(content)
    except: return {"error": "Content was not valid JSON"}

def validate_request(data: dict) -> tuple[bool, str]:
    if not data.get('title'): return False, "Missing title"
    if not data.get('markets') or not isinstance(data.get('markets'), list) or len(data['markets']) == 0:
        return False, "Missing or empty markets list"
    return True, ""



async def make_prediction(logger, model, title: str, markets: list, sources: list = None, **kwargs) -> str:
    try:
        sources_text = format_sources(sources or [])
        task_prompt = create_task_prompt(title, markets)
        user_input = create_user_prompt(sources_text)
        messages = [{"role": "system", "content": task_prompt}, {"role": "user", "content": user_input}]
        
        logger.info("Invoking LLM for prediction...")
        response = await model.ainvoke(messages)
        content = response.content
        logger.info("LLM call successful. Extracting JSON...")
        
        json_start = content.find('{')
        json_end = content.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            json_content = content[json_start:json_end]
            return json.dumps(json.loads(json_content))
        else:
            logger.error("Could not extract valid JSON from LLM response.")
            return json.dumps({"error": "Could not extract valid JSON from prediction"})
    except Exception as e:
        logger.critical(f"CRITICAL ERROR during LLM prediction: {e}", exc_info=True)
        return json.dumps({"error": f"Prediction failed: {str(e)}"})

# --- Main Execution Logic ---
async def main():
    agentID = os.getenv("CORAL_AGENT_ID", "unknown_predict_agent")
    logger = setup_logger(agentID)
    logger.info("--- SCRIPT STARTED ---")

    runtime = os.getenv("CORAL_ORCHESTRATION_RUNTIME", None)
    if runtime is None:
        load_dotenv()

    base_url = os.getenv("CORAL_SSE_URL")
    coral_params = {"agentId": agentID, "agentDescription": "A worker agent that listens for prediction tasks."}
    query_string = urllib.parse.urlencode(coral_params)
    CORAL_SERVER_URL = f"{base_url}?{query_string}"
    logger.info(f"Connecting to: {CORAL_SERVER_URL}")

    # --- ARCHITECTURE FIX: CREATE ONE PERSISTENT CLIENT ---
    client = MultiServerMCPClient(connections={"coral": {"transport": "sse", "url": CORAL_SERVER_URL}})
    logger.info("Persistent Connection Client Established. Getting tools once...")
    
    try:
        coral_tools = await client.get_tools(server_name="coral")
        wait_for_mentions = next((t for t in coral_tools if t.name == "coral_wait_for_mentions"), None)
        send_message = next((t for t in coral_tools if t.name == "coral_send_message"), None)
        
        if not wait_for_mentions or not send_message:
            raise ValueError("FATAL: Missing required tools.")
            
        logger.info("All necessary tools acquired.")
    except Exception as e:
        logger.critical(f"Failed to initialize and get tools: {e}", exc_info=True)
        return # Exit if we can't get tools

    logger.info("Initializing Mistral model...")
    model = ChatMistralAI(
        model=os.getenv("MODEL_NAME", "mistral-large-latest"),
        mistral_api_key=os.getenv("MODEL_API_KEY"),
        temperature=float(os.getenv("MODEL_TEMPERATURE", "0.1")),
        max_tokens=int(os.getenv("MODEL_MAX_TOKENS", "8000")),
    )
    logger.info("Model initialized. Starting main listener loop...")

    while True:
        try:
            logger.info("Waiting for a mention...")
            # --- We now use the persistent tool object ---
            raw_result = await wait_for_mentions.ainvoke({"timeoutMs": 60000})
            
            result = json.loads(raw_result) if isinstance(raw_result, str) and raw_result else raw_result if isinstance(raw_result, dict) else {}
            logger.info(f"Woke up. Parsed result: {result}")

            messages = result.get("messages", [])
            if not messages:
                continue
            
            for message in messages:
                thread_id = message.get("threadId")
                sender_id_str = message.get("senderId") 
                content = message.get("content", "")
                
                if not thread_id or not sender_id_str:
                    logger.warning(f"Invalid mention received: {message}")
                    continue
                
                logger.info(f"Received task from {sender_id_str} in thread {thread_id}")
                
                request_data = parse_message_content(content)
                is_valid, error_msg = validate_request(request_data)
                
                if not is_valid:
                    logger.warning(f"Invalid request data: {error_msg}")
                    await send_message.ainvoke({"threadId": thread_id, "content": json.dumps({"error": error_msg}), "mentions": [sender_id_str]})
                    continue
                
                logger.info("Request is valid. Making prediction...")
                prediction_result_json = await make_prediction(logger, model, **request_data)
                
                logger.info(f"Sending prediction result back to {sender_id_str}...")
                await send_message.ainvoke({"threadId": thread_id, "content": prediction_result_json, "mentions": [sender_id_str]})
                logger.info("Successfully processed request and sent reply.")
            
        except Exception as e:
            logger.critical(f"CRITICAL ERROR in main loop: {e}", exc_info=True)
            # If the connection fails catastrophically, we might need to re-initialize it.
            # For now, we just wait and retry.
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())