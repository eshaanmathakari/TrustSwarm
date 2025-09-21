#!/usr/bin/env python3
"""
Coral Prediction Agent
"""

import urllib.parse
from dotenv import load_dotenv
import os, json, asyncio, traceback
import logging
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate


# --- Logger Setup (Correct and necessary) ---
def setup_logger(agent_id: str) -> logging.Logger:
    """Sets up a logger that writes to a file and to the console."""
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


def create_task_prompt(event_title: str, market_names: list) -> str:
    """Create the detailed task prompt for market prediction."""
    market_list_str = "\n".join([f"- {market}" for market in market_names])
    json_example = ",\n                ".join(
        [f'"{market}": <probability_value_from_0_to_1>' for market in market_names])

    return f"""
You are an AI assistant specialized in analyzing and predicting real-world events. 
You have deep expertise in predicting the outcome of the event: "{event_title}"

Note that this event occurs in the future. You will be given a list of sources with their summaries, rankings, and expert comments.
Based on these collected sources, your goal is to extract meaningful insights and provide well-reasoned predictions based on the given data.
You will be predicting the probability (as a float value from 0 to 1) of ONLY the following possible outcomes:
{market_list_str}

IMPORTANT CONSTRAINTS:
1. You MUST ONLY provide probabilities for the exact possible outcomes listed above
2. Do NOT create or invent any additional outcomes
3. Use exactly the same outcome names as provided (case-sensitive)
4. Ensure all probabilities are between 0 and 1

Your response MUST be in JSON format with the following structure:
```json
{{
    "rationale": "<text_explaining_your_rationale>",
    "probabilities": {{
        {json_example}
    }}
}}
```

In the rationale section of your response, please provide a short, concise, 3 sentence rationale that explains:
- How you weighed different pieces of information
- Your reasoning for the probability distribution you assigned
- Any key factors or uncertainties you considered
""".strip()

def create_user_prompt(sources: str, market_stats: dict = None) -> str:
    """Create the user prompt, including optional market stats."""
    market_stats_info = ""
    if market_stats:
        market_stats_info = f"""
CURRENT ONLINE TRADING DATA:
You also have access to the predicted outcome probability (last trading price of each outcome turned out to be yes) from a popular prediction market at the moment of your prediction:
{json.dumps(market_stats, indent=2)}

Note: Market data can provide insights into the current consensus of the market influenced by traders of various beliefs and private information. However, you should not rely on market data alone to make your prediction.
Please consider both the market data and the information sources to help you make a well-calibrated prediction. 
"""
    return f"""
HERE IS THE GIVEN DATA: it is a list of sources with their summaries, rankings, and user comments. 
The smaller the ranking number, the more you should weight the source in your prediction. 
{sources} 
{market_stats_info}
""".strip()


# --- NEW: Function for Step 1: Generating the Search Query ---
async def generate_search_query(logger, model, task_title: str) -> str:
    """Uses an LLM to create a search query from a task title."""
    logger.info(f"Generating search query for title: '{task_title}'")
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert at creating concise, effective web search queries. Given the user's question, provide a single search query string that would be best for finding relevant sources. Return ONLY the search query string and nothing else."),
        ("human", task_title)
    ])
    chain = prompt | model
    response = await chain.ainvoke({})
    search_query = response.content.strip().strip('"')
    logger.info(f"Generated search query: '{search_query}'")
    return search_query

# --- NEW: Helper for delegating any sub-task ---
async def delegate_sub_task(
    create_thread_tool, send_message_tool, wait_for_mentions_tool, target_agent_id, task_content
):
    """A generic function to delegate a task to another agent and await its response."""
    print(f"--- SUB-DELEGATE: Creating thread for {target_agent_id}... ---")
    create_thread_result_str = await create_thread_tool.ainvoke({
        "threadName": f"Sub-task for {target_agent_id}",
        "participantIds": [target_agent_id]
    })
    create_thread_result = json.loads(create_thread_result_str)
    thread_id = create_thread_result.get('thread', {}).get('id')
    if not thread_id: raise ValueError("Could not get a valid threadId for sub-task.")

    content_to_send = json.dumps(task_content) if isinstance(task_content, dict) else str(task_content)
    await send_message_tool.ainvoke({
        "threadId": thread_id, "content": content_to_send, "mentions": [target_agent_id]
    })

    print(f"--- SUB-DELEGATE: Waiting for mention from {target_agent_id}... ---")
    reply_result_str = await wait_for_mentions_tool.ainvoke({"timeoutMs": 180000}) # 3 min timeout for research
    reply_result = json.loads(reply_result_str)

    messages = reply_result.get("messages", [])
    if not messages: raise ValueError(f"Agent {target_agent_id} did not reply.")

    for message in messages:
        if message.get('threadId') == thread_id and message.get("senderId") == target_agent_id:
            return message['content']
    raise ValueError(f"Could not find the expected reply from {target_agent_id}.")



def format_sources(sources: list) -> str:
    """Format sources list into a string for the prompt."""
    if not sources:
        return "No sources available for this event."
    formatted_sources = []
    for source in sources:
        source_text = f"Source {source.get('ranking', 'N/A')}: {source.get('title', 'No title')}\n"
        source_text += f"URL: {source.get('url', 'No URL')}\n"
        source_text += f"Summary: {source.get('summary', 'No summary')}\n"
        formatted_sources.append(source_text)
    return "\n---\n".join(formatted_sources)

def parse_message_content(content: str) -> dict:
    """Robustly parse the incoming message to extract prediction request."""
    try:
        return json.loads(content)
    except Exception:
        return {"error": "Content was not valid JSON"}

def validate_request(data: dict) -> tuple[bool, str]:
    """Validate the prediction request."""
    if not data.get('title'):
        return False, "Missing title"
    if not data.get('markets') or not isinstance(data.get('markets'), list) or len(data.get('markets', [])) == 0:
        return False, "Missing or empty markets list"
    return True, ""

async def make_final_prediction(logger, model, title: str, markets: list, sources: str = None, market_stats: dict = None, **kwargs) -> str:
    """Make a prediction using the high-quality prompts and return a JSON response."""
    try:
        # sources_text = format_sources(sources or [])
        task_prompt = create_task_prompt(title, markets)
        user_input = create_user_prompt(sources, market_stats)
        messages = [{"role": "system", "content": task_prompt}, {"role": "user", "content": user_input}]
        
        logger.info("Invoking LLM for prediction with detailed prompts...")
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
    coral_params = {"agentId": agentID, "agentDescription": "A worker agent that provides expert event predictions."}
    query_string = urllib.parse.urlencode(coral_params)
    CORAL_SERVER_URL = f"{base_url}?{query_string}"
    logger.info(f"Connecting to: {CORAL_SERVER_URL}")

    client = MultiServerMCPClient(connections={"coral": {"transport": "sse", "url": CORAL_SERVER_URL}})
    logger.info("Persistent Connection Client Established. Getting tools once...")
    
    try:
        coral_tools = await client.get_tools(server_name="coral")
        wait_for_mentions = next((t for t in coral_tools if t.name == "coral_wait_for_mentions"), None)
        send_message = next((t for t in coral_tools if t.name == "coral_send_message"), None)
        create_thread_tool = next((t for t in coral_tools if t.name == "coral_create_thread"), None)
        
        if not all([wait_for_mentions, send_message, create_thread_tool]):
            raise ValueError("FATAL: Missing required tools for orchestration.")
            
        logger.info("All necessary tools acquired.")
    except Exception as e:
        logger.critical(f"Failed to initialize and get tools: {e}", exc_info=True)
        return

    logger.info("Initializing Mistral model...")
    model = ChatGroq(
        model_name=os.getenv("MODEL_NAME", "llama3-70b-8192"),
        groq_api_key=os.getenv("MODEL_API_KEY"),
        temperature=float(os.getenv("MODEL_TEMPERATURE", "0.1")),
        max_tokens=int(os.getenv("MODEL_MAX_TOKENS", "8000")),
    )
    logger.info("Model initialized. Starting main listener loop...")

    while True:
        original_thread_id, original_sender_id = None, None
        try:
            logger.info("Waiting for a prediction task...")
            raw_result = await wait_for_mentions.ainvoke({"timeoutMs": 60000})
            result = json.loads(raw_result) if isinstance(raw_result, str) and raw_result else raw_result
            
            messages = result.get("messages", [])
            if not messages: continue
            
            for message in messages:
                original_thread_id = message.get("threadId")
                original_sender_id = message.get("senderId")
                content = message.get("content", "")
                
                if not all([original_thread_id, original_sender_id]): continue
                
                logger.info(f"Received prediction task from {original_sender_id}")
                request_data = parse_message_content(content)
                is_valid, error_msg = validate_request(request_data)
                
                if not is_valid:
                    logger.warning(f"Invalid request data: {error_msg}")
                    await send_message.ainvoke({"threadId": original_thread_id, "content": json.dumps({"error": error_msg}), "mentions": [original_sender_id]})
                    continue
                
                # === STEP 1: FORMULATE SEARCH QUERY ===
                search_query = await generate_search_query(logger, model, request_data['title'])

                # === STEP 2: DELEGATE TO FIRECRAWL ===
                logger.info(f"Delegating to firecrawl agent with query: '{search_query}'")
                firecrawl_response_str = await delegate_sub_task(
                    create_thread_tool, send_message, wait_for_mentions,
                    "firecrawl", search_query
                )
                

                print(firecrawl_response_str)
                logger.info(f"Received {len(firecrawl_response_str)} {type(firecrawl_response_str)} {firecrawl_response_str} sources from firecrawl.")

                # === STEP 3: MAKE FINAL PREDICTION ===
                data_for_prediction = {**request_data, "sources": firecrawl_response_str}
                logger.info("Making final prediction with retrieved sources...")
                final_prediction_json = await make_final_prediction(logger, model, **data_for_prediction)

                # === STEP 4: SEND FINAL REPLY ===
                logger.info(f"Sending final prediction back to {original_sender_id}...")
                await send_message.ainvoke({
                    "threadId": original_thread_id, "content": final_prediction_json, "mentions": [original_sender_id]
                })
                logger.info("Successfully completed full orchestration and sent final reply.")
            
        except Exception as e:
            logger.critical(f"CRITICAL ERROR during orchestration loop: {e}", exc_info=True)
            if original_thread_id and original_sender_id:
                await send_message.ainvoke({"threadId": original_thread_id, "content": json.dumps({"error": str(e)}), "mentions": [original_sender_id]})
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())