import os
import json
import asyncio
import urllib.parse
import traceback
from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient

# This helper function is now only used for the 'single' task type.
async def delegate_task_in_new_thread(
    create_thread_tool, send_message_tool, wait_for_mentions_tool, target_agent, request_data
):
    agent_id_str = target_agent['id']
    
    print(f"--- DELEGATE (Single): Creating thread for {agent_id_str}... ---")
    create_thread_result_str = await create_thread_tool.ainvoke({
        "threadName": f"Prediction task for {agent_id_str}",
        "participantIds": [agent_id_str]
    })
    create_thread_result = json.loads(create_thread_result_str)
    
    thread_id = create_thread_result.get('thread', {}).get('id')
    if not thread_id:
        raise ValueError(f"Could not get a valid threadId: {create_thread_result}")

    await send_message_tool.ainvoke({
        "threadId": thread_id,
        "content": json.dumps(request_data),
        "mentions": [agent_id_str]
    })

    print(f"--- DELEGATE (Single): Waiting for mention from {agent_id_str}... ---")
    reply_result_str = await wait_for_mentions_tool.ainvoke({"timeoutMs": 60000})
    reply_result = json.loads(reply_result_str)

    messages = reply_result.get("messages", [])
    if not messages:
        raise ValueError("wait_for_mentions succeeded but returned no messages.")

    for message in messages:
        sender_id = message.get("senderId")
        if message.get('threadId') == thread_id and sender_id == agent_id_str:
            return message['content']
    
    raise ValueError(f"Received messages, but none matched the expected reply in thread {thread_id}")


async def main():
    """ A deterministic orchestrator agent with a robust benchmark pattern. """
    load_dotenv()
    final_result = {}
    send_result_tool = None
    
    try:
        # --- Setup and Tool Acquisition (This part is correct) ---
        user_request_json = os.getenv("USER_REQUEST")
        request = json.loads(user_request_json)
        task_type = request.get("task")
        payload = request.get("payload", {})
        request_data = payload.get("request_data", {})
        
        base_url = os.getenv("CORAL_SSE_URL")
        agentID = os.getenv("CORAL_AGENT_ID")
        coral_params = {"agentId": agentID, "agentDescription": "A deterministic orchestrator."}
        query_string = urllib.parse.urlencode(coral_params)
        CORAL_SERVER_URL = f"{base_url}?{query_string}"
        
        client = MultiServerMCPClient(connections={"coral": {"transport": "sse", "url": CORAL_SERVER_URL}})
        coral_tools = await client.get_tools(server_name="coral")
        
        list_agents_tool = next((t for t in coral_tools if t.name == "coral_list_agents"), None)
        create_thread_tool = next((t for t in coral_tools if t.name == "coral_create_thread"), None)
        send_message_tool = next((t for t in coral_tools if t.name == "coral_send_message"), None)
        wait_for_mentions_tool = next((t for t in coral_tools if t.name == "coral_wait_for_mentions"), None)
        send_result_tool = next((t for t in coral_tools if t.name == "send_prediction_result"), None)

        if not all([list_agents_tool, create_thread_tool, send_message_tool, wait_for_mentions_tool, send_result_tool]):
            raise ValueError("FATAL: Could not acquire all necessary tools.")

        print(f"--- INTERFACE AGENT: Starting task of type '{task_type}'... ---")

        # --- Single Agent Task (Unchanged, already works) ---
        if task_type == "single":
            list_agents_str = await list_agents_tool.ainvoke({})
            list_agents_result = json.loads(list_agents_str)
            
            # Find the target prediction agent
            predict_agent_name = payload.get("agent_name")
            predict_agent = next((a for a in list_agents_result.get('agents', []) if a['id'] == predict_agent_name), None)
            if not predict_agent: raise ValueError(f"Predict agent '{predict_agent_name}' not found.")
            
            # Find the scoring agent
            scoring_agent = next((a for a in list_agents_result.get('agents', []) if a['id'] == 'scoring'), None)
            if not scoring_agent: raise ValueError("Scoring agent 'scoring' not found.")

            # === STEP 1: DELEGATE TO PREDICT AGENT ===
            print(f"--- INTERFACE: [Step 1/2] Delegating task to '{predict_agent_name}'... ---")
            prediction_str = await delegate_task_in_new_thread(
                create_thread_tool, send_message_tool, wait_for_mentions_tool, 
                predict_agent, request_data
            )
            prediction_obj = json.loads(prediction_str)
            print("--- INTERFACE: Received prediction successfully. ---")

            # === STEP 2: DELEGATE PREDICTION TO SCORING AGENT ===
            print("--- INTERFACE: [Step 2/2] Delegating prediction to 'scoring' agent... ---")
            # Note: We pass the *entire object* from the predict agent to the scoring agent
            score_str = await delegate_task_in_new_thread(
                create_thread_tool, send_message_tool, wait_for_mentions_tool,
                scoring_agent, prediction_obj
            )
            score_obj = json.loads(score_str)
            print("--- INTERFACE: Received score successfully. ---", score_obj, prediction_obj)

            # === STEP 3: COMBINE RESULTS ===
            # Inject the score object into the original prediction's response
            prediction_obj['scoring'] = score_obj
            final_result = prediction_obj
            print("--- INTERFACE: Combined prediction and score. ---")

        # --- BENCHMARK TASK (RE-ARCHITECTED) ---
        elif task_type == "benchmark":
            list_agents_str = await list_agents_tool.ainvoke({})
            list_agents_result = json.loads(list_agents_str)
            agent_prefix = payload.get("agent_prefix", "predict")
            worker_agents = [a for a in list_agents_result.get('agents', []) if a['id'].startswith(agent_prefix)]

            if not worker_agents: raise ValueError(f"No worker agents found with prefix '{agent_prefix}'.")
            print(f"--- INTERFACE AGENT: [Benchmark] Found {len(worker_agents)} workers. Dispatching all tasks... ---")
            
            # 1. Dispatch all tasks in parallel and map thread IDs to agent IDs
            thread_to_agent_map = {}
            dispatch_tasks = []
            for agent in worker_agents:
                async def dispatch(agent_to_dispatch):
                    create_thread_result_str = await create_thread_tool.ainvoke({
                        "threadName": f"Benchmark task for {agent_to_dispatch['id']}",
                        "participantIds": [agent_to_dispatch['id']]
                    })
                    create_thread_result = json.loads(create_thread_result_str)
                    thread_id = create_thread_result.get('thread', {}).get('id')
                    if not thread_id: return

                    await send_message_tool.ainvoke({
                        "threadId": thread_id,
                        "content": json.dumps(payload.get("request_data")),
                        "mentions": [agent_to_dispatch['id']]
                    })
                    thread_to_agent_map[thread_id] = agent_to_dispatch['id']
                dispatch_tasks.append(dispatch(agent))
            
            await asyncio.gather(*dispatch_tasks)
            print("--- INTERFACE AGENT: [Benchmark] All tasks dispatched. Entering central listening loop. ---")

            # 2. Enter a single, centralized loop to listen for all replies
            results = {}
            loop_timeout = 60 # seconds
            start_time = asyncio.get_event_loop().time()

            while len(results) < len(worker_agents):
                # Check for global timeout
                if (asyncio.get_event_loop().time() - start_time) > loop_timeout:
                    print("--- INTERFACE AGENT: [Benchmark] Global timeout reached. ---")
                    break

                print(f"--- INTERFACE AGENT: [Benchmark] Listening... ({len(results)}/{len(worker_agents)} received) ---")
                reply_result_str = await wait_for_mentions_tool.ainvoke({"timeoutMs": 10000}) # Short timeout for the loop
                reply_result = json.loads(reply_result_str)

                messages = reply_result.get("messages", [])
                for message in messages:
                    thread_id = message.get('threadId')
                    sender_id = message.get('senderId')
                    agent_id = thread_to_agent_map.get(thread_id)

                    if agent_id and sender_id == agent_id and agent_id not in results:
                        print(f"--- INTERFACE AGENT: [Benchmark] Received valid reply from {agent_id}. ---")
                        results[agent_id] = {"source": agent_id, "response": json.loads(message['content'])}
            
            # 3. Format the final result, noting any agents that did not reply
            final_responses = []
            for agent in worker_agents:
                agent_id = agent['id']
                if agent_id in results:
                    final_responses.append(results[agent_id])
                else:
                    final_responses.append({"source": agent_id, "error": "Agent did not reply within the timeout."})
            
            final_result = {
                "benchmark_summary": f"Received {len(results)} of {len(worker_agents)} expected responses.",
                "responses": final_responses
            }

    except Exception as e:
        print(f"--- INTERFACE AGENT: CRITICAL ERROR: {e}\n{traceback.format_exc()} ---")
        final_result = {"error": str(e)}

    # --- Send Final Result (Unchanged) ---
    if send_result_tool:
        print("--- INTERFACE AGENT: Sending final result back to microservice... ---")
        print(json.dumps(final_result, indent=2))
        await send_result_tool.ainvoke({"result": json.dumps(final_result)})
        print("--- INTERFACE AGENT: Orchestrator job complete. ---")

if __name__ == "__main__":
    asyncio.run(main())