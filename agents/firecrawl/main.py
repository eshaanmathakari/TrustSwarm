#!/usr/bin/env python3
"""
Coral Firecrawl Agent (Definitive Architecture with Idiot-Proof Prompt)
"""

import urllib.parse
from dotenv import load_dotenv
import os, json, asyncio, traceback
import logging
from langchain_mistralai import ChatMistralAI
from langchain.prompts import ChatPromptTemplate
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_tool_calling_agent, AgentExecutor

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

def create_research_brain(llm, firecrawl_tools):
    """
    Creates an AgentExecutor with a highly specific prompt to prevent parameter hallucination.
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a simple function-calling AI. Your only job is to execute a Firecrawl tool.
- You will be given a user's query as the 'input'.
- Your task is to call the `firecrawl_search` tool.
- You MUST use the user's `input` as the value for the `query` parameter.
- Do not add, invent, or assume any other parameters. Your only job is to pass the input to the query parameter."""),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    agent = create_tool_calling_agent(llm, firecrawl_tools, prompt)
    return AgentExecutor(agent=agent, tools=firecrawl_tools, verbose=True, handle_parsing_errors=True)

# --- Main Execution and Communication Loop ---
async def main():
    agentID = os.getenv("CORAL_AGENT_ID", "firecrawl")
    logger = setup_logger(agentID)
    logger.info("--- SCRIPT STARTED ---")

    runtime = os.getenv("CORAL_ORCHESTRATION_RUNTIME", None)
    if runtime is None:
        load_dotenv()

    base_url = os.getenv("CORAL_SSE_URL")
    coral_params = {"agentId": agentID, "agentDescription": "An agent that uses the Firecrawl suite to perform web research."}
    query_string = urllib.parse.urlencode(coral_params)
    CORAL_SERVER_URL = f"{base_url}?{query_string}"
    logger.info(f"Connecting to: {CORAL_SERVER_URL}")

    client = MultiServerMCPClient(
        connections={
            "coral": {"transport": "sse", "url": CORAL_SERVER_URL},
            "firecrawl-mcp": {
                "transport": "stdio",
                "command": "npx",
                "args": ["-y", "firecrawl-mcp"],
                "env": {"FIRECRAWL_API_KEY": os.getenv("FIRECRAWL_API_KEY")},
            },
        }
    )
    logger.info("Persistent Multi-Server Client Established. Getting all tools...")
    
    try:
        coral_tools = await client.get_tools(server_name="coral")
        firecrawl_tools = await client.get_tools(server_name="firecrawl-mcp")

        wait_for_mentions = next((t for t in coral_tools if t.name == "coral_wait_for_mentions"), None)
        send_message = next((t for t in coral_tools if t.name == "coral_send_message"), None)
        
        if not all([wait_for_mentions, send_message]):
            raise ValueError("FATAL: Missing required Coral communication tools.")
        
        logger.info(f"Acquired {len(firecrawl_tools)} Firecrawl tools for the agent brain.")
    except Exception as e:
        logger.critical(f"Failed to initialize and get tools: {e}", exc_info=True)
        return

    logger.info("Initializing Mistral model for agent brain...")
    llm = ChatMistralAI(
        model=os.getenv("MODEL_NAME", "mistral-large-latest"),
        mistral_api_key=os.getenv("MODEL_API_KEY"),
        temperature=0.0, # Set to 0 for deterministic tool use
    )
    
    research_brain = create_research_brain(llm, firecrawl_tools)
    logger.info("Agent brain initialized. Starting main listener loop.")

    while True:
        try:
            logger.info("Programmatically waiting for a mention...")
            raw_result = await wait_for_mentions.ainvoke({"timeoutMs": 60000})
            result = json.loads(raw_result) if isinstance(raw_result, str) and raw_result else raw_result
            
            messages = result.get("messages", [])
            if not messages: continue
            
            for message in messages:
                thread_id, sender_id_str, search_query = message.get("threadId"), message.get("senderId"), message.get("content", "")
                if not all([thread_id, sender_id_str, search_query]): continue
                
                logger.info(f"Received task from {sender_id_str}. Passing query to research brain: '{search_query}'")
                
                brain_response = await research_brain.ainvoke({"input": search_query})
                research_result = brain_response.get("output", "No output from research.")
                
                logger.info("Research brain has completed its task.")
                
                logger.info(f"Sending research result back to {sender_id_str}...")
                await send_message.ainvoke({
                    "threadId": thread_id,
                    "content": json.dumps(research_result),
                    "mentions": [sender_id_str]
                })
                logger.info("Successfully processed request and sent reply.")
            
        except Exception as e:
            logger.critical(f"CRITICAL ERROR in main loop: {e}", exc_info=True)
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())