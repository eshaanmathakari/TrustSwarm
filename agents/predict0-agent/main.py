#!/usr/bin/env python3
"""
Coral Prediction Agent

Receives betting questions and returns predictions with probabilities and rationale.
"""

import urllib.parse
from dotenv import load_dotenv
import os, json, asyncio, traceback
from langchain.chat_models import init_chat_model
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mistralai import ChatMistralAI


def create_task_prompt(event_title: str, market_names: list) -> str:
    """Create the task prompt for market prediction."""
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
    """Create the user prompt for providing source data."""
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
    """Parse the incoming message to extract prediction request."""
    try:
        # Try JSON first
        return json.loads(content)
    except:
        # Simple text parsing
        result = {"title": "", "markets": [], "sources": []}
        
        lines = content.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line.lower().startswith('title:'):
                result['title'] = line[6:].strip()
            elif line.lower().startswith('markets:') or line.lower().startswith('answers:'):
                markets_text = line.split(':', 1)[1].strip()
                if '[' in markets_text:  # JSON array
                    try:
                        result['markets'] = json.loads(markets_text)
                    except:
                        result['markets'] = [m.strip() for m in markets_text.split(',')]
                else:  # Comma separated
                    result['markets'] = [m.strip() for m in markets_text.split(',')]
        
        return result


def validate_request(data: dict) -> tuple[bool, str]:
    """Validate the prediction request."""
    if not data.get('title'):
        return False, "Missing title"
    if not data.get('markets') or len(data.get('markets', [])) == 0:
        return False, "Missing or empty markets"
    return True, ""


async def make_prediction(model, title: str, markets: list, sources: list = None, market_stats: dict = None) -> str:
    """Make a prediction and return JSON response."""
    try:
        # Format sources
        sources_text = format_sources(sources or [])
        
        # Create task and user prompts (like original script)
        task_prompt = create_task_prompt(title, markets)
        user_input = create_user_prompt(sources_text, market_stats)
        
        # Create messages with system/user structure
        messages = [
            {"role": "system", "content": task_prompt},
            {"role": "user", "content": user_input}
        ]
        
        # Get prediction from LLM
        response = model.invoke(messages)
        content = response.content
        
        # Extract JSON from response
        json_start = content.find('{')
        json_end = content.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            json_content = content[json_start:json_end]
            # Validate it's proper JSON
            parsed = json.loads(json_content)
            return json.dumps(parsed)
        else:
            return json.dumps({"error": "Could not extract valid JSON from prediction"})
            
    except Exception as e:
        return json.dumps({"error": f"Prediction failed: {str(e)}"})


async def main():
    runtime = os.getenv("CORAL_ORCHESTRATION_RUNTIME", None)
    if runtime is None:
        load_dotenv()

    while 1:
        user_request_json = os.getenv("USER_REQUEST")
        if not user_request_json:
            continue
        else:
            break

    print(f"Received user request: {user_request_json}")

    # Step 2: Connect to the Coral Server to get access to the tools.
    base_url = os.getenv("CORAL_SSE_URL")
    agentID = os.getenv("CORAL_AGENT_ID")
    coral_params = {"agentId": agentID}
    query_string = urllib.parse.urlencode(coral_params)
    CORAL_SERVER_URL = f"{base_url}?{query_string}"

    client = MultiServerMCPClient(
        connections={"coral": {"transport": "sse", "url": CORAL_SERVER_URL}}
    )
    print("Coral Connection Established")
    send_result_tool = None # Define here for use in the finally block

    try:
        # Step 3: Find the custom tool for sending the result back.
        coral_tools = await client.get_tools(server_name="coral")
        for tool in coral_tools:
            # The tool name 'send_prediction_result' comes from the microservice.
            if tool.name == "send_prediction_result":
                send_result_tool = tool
                break
        
        if not send_result_tool:
            print("FATAL: Could not find the 'send_prediction_result' tool. Cannot send response.")
            return

        # Step 4: Parse, validate, and perform the prediction.
        request_data = parse_message_content(user_request_json)
        is_valid, error_msg = validate_request(request_data)

        if not is_valid:
            error_response = json.dumps({"error": f"Invalid request: {error_msg}"})
            print(f"Sending error response: {error_response}")
            await send_result_tool.ainvoke({"result": error_response})
            return

        model = ChatMistralAI(
            model=os.getenv("MODEL_NAME"),
            mistral_api_key=os.getenv("MODEL_API_KEY"),
            temperature=float(os.getenv("MODEL_TEMPERATURE", "0.1")),
            max_tokens=int(os.getenv("MODEL_MAX_TOKENS", "8000")),
        )

        print("Making prediction...")
        prediction_result = await make_prediction(
            model,
            title=request_data['title'],
            markets=request_data['markets'],
            sources=request_data.get('sources', []),
            market_stats=request_data.get('market_stats', None)
        )

        # Step 5: Use the custom tool to send the result back to the microservice.
        print(f"Sending prediction result: {prediction_result}")
        await send_result_tool.ainvoke({"result": prediction_result})
        print("Successfully processed request. Agent's job is done.")

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print(traceback.format_exc())
        # Try to send an error back to the user if the tool was found
        if send_result_tool:
            await send_result_tool.ainvoke({"result": json.dumps({"error": str(e)})})
    finally:
        # Cleanly close the connection to the server
        # await client.close()
        print("Job Finished Succssfully")


if __name__ == "__main__":
    asyncio.run(main())