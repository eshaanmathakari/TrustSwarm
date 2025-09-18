# TrustSwarm Coral Protocol Integration

This directory contains the TrustSwarm integration with Coral Protocol, enabling TrustSwarm agents to communicate and collaborate through the Coral multi-agent system.

## 🏗️ Architecture

The integration consists of several key components:

- **BaseCoralAgent**: Base class for all TrustSwarm agents that need to connect to Coral Protocol
- **CoralMCPClient**: Low-level MCP client wrapper for Coral Protocol communication
- **Agent Registry**: Configuration for TrustSwarm agents in Coral Protocol
- **Example Agents**: Sample TrustSwarm agents demonstrating different capabilities

## 📁 Directory Structure

```
coral-integration/
├── base-coral-agent.js          # Base class for Coral Protocol integration
├── mcp-client.js                # MCP client wrapper
├── package.json                 # Node.js dependencies
├── application.yaml             # Coral Protocol application configuration
├── trustswarm-registry.yaml     # TrustSwarm agent registry
├── test-coral-agent.js          # Integration test suite
├── README.md                    # This file
└── agents/                      # Example TrustSwarm agents
    ├── trust-analyzer.js        # Trust analysis agent
    ├── communicator.js          # Communication agent
    ├── coordinator.js           # Task coordination agent
    ├── predictor.js             # Prediction agent (placeholder)
    └── voice-agent.js           # Voice synthesis agent (placeholder)
```

## 🚀 Quick Start

### Prerequisites

1. **Coral Protocol Server**: Ensure Coral Protocol server is running (see main README)
2. **Node.js**: Version 18.0.0 or higher
3. **Dependencies**: Install required packages

### Installation

```bash
# Navigate to coral-integration directory
cd coral-integration

# Install dependencies
npm install
```

### Running Tests

```bash
# Run the integration test suite
npm test

# Or run directly
node test-coral-agent.js
```

### Running Example Agents

```bash
# Run a specific agent
node agents/trust-analyzer.js
node agents/communicator.js
node agents/coordinator.js

# Or use npm scripts
npm start
```

## 🔧 Configuration

### Environment Variables

TrustSwarm agents support the following environment variables:

#### Coral Protocol Variables (Auto-provided by Coral)
- `CORAL_CONNECTION_URL`: MCP server connection URL
- `CORAL_AGENT_ID`: Unique agent identifier
- `CORAL_SESSION_ID`: Session identifier
- `CORAL_ORCHESTRATION_RUNTIME`: Runtime type (docker/executable)

#### TrustSwarm Agent Variables
- `OPENAI_API_KEY`: OpenAI API key for AI models
- `ELEVENLABS_API_KEY`: ElevenLabs API key for voice synthesis
- `TRUST_MODEL`: Trust analysis model (default: gpt-4)
- `COMMUNICATION_MODEL`: Communication model (default: gpt-4)
- `COORDINATION_MODEL`: Coordination model (default: gpt-4)

### Agent Registry

The `application.yaml` file configures TrustSwarm agents for Coral Protocol:

```yaml
registry:
  trustswarm-trust-analyzer:
    options:
      - name: "OPENAI_API_KEY"
        type: "string"
        description: "OpenAI API Key for trust analysis"
    runtime:
      type: "executable"
      command: ["node", "coral-integration/agents/trust-analyzer.js"]
      environment:
        - name: "API_KEY"
          from: "OPENAI_API_KEY"
```

## 🤖 Available Agents

### 1. Trust Analyzer Agent
- **Purpose**: Analyzes trust scores and relationships
- **Capabilities**: Trust scoring, reputation analysis, risk assessment
- **Configuration**: Analysis depth, scoring threshold, trust model

### 2. Communication Agent
- **Purpose**: Handles inter-agent communication
- **Capabilities**: Message routing, broadcasting, notifications
- **Configuration**: Message style, max length, communication model

### 3. Coordinator Agent
- **Purpose**: Manages task coordination and workflow
- **Capabilities**: Task assignment, workflow management, agent coordination
- **Configuration**: Max concurrent tasks, task timeout, coordination model

### 4. Predictor Agent (Placeholder)
- **Purpose**: Makes predictions and forecasts
- **Capabilities**: Trend analysis, forecasting, prediction confidence
- **Configuration**: Prediction horizon, confidence threshold, prediction model

### 5. Voice Agent (Placeholder)
- **Purpose**: Handles voice synthesis and audio processing
- **Capabilities**: Text-to-speech, voice synthesis, audio processing
- **Configuration**: Voice model, audio quality, voice ID

## 🔌 Integration with Coral Protocol

### Connection Process

1. **Agent Initialization**: Agent starts and reads configuration
2. **Coral Connection**: Connects to Coral Protocol MCP server
3. **Tool Registration**: Registers available tools and capabilities
4. **Message Listening**: Starts listening for messages from other agents
5. **Task Processing**: Processes incoming requests and tasks

### Available Tools

TrustSwarm agents have access to the following Coral Protocol tools:

- `list_agents`: List all registered agents
- `create_thread`: Create a new conversation thread
- `send_message`: Send messages to threads
- `wait_for_mentions`: Wait for messages mentioning the agent
- `add_participant`: Add participants to threads
- `remove_participant`: Remove participants from threads
- `close_thread`: Close threads with summaries

### Message Flow

```
Agent A → Coral Protocol → Agent B
    ↓           ↓            ↓
  Request → Thread Creation → Response
    ↓           ↓            ↓
  Processing → Message → Task Execution
```

## 🧪 Testing

### Test Suite

The integration includes a comprehensive test suite that verifies:

- ✅ Connection to Coral Protocol
- ✅ Agent listing functionality
- ✅ Thread creation and management
- ✅ Message sending and receiving
- ✅ Agent status and capabilities

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
node test-coral-agent.js
```

### Test Results

The test suite provides detailed results including:
- Test pass/fail status
- Execution time
- Error messages
- Detailed logs

## 🚀 Deployment

### Local Development

For local development and testing:

```bash
# Start Coral Protocol server in dev mode
cd server
./gradlew run --dev

# Run TrustSwarm agents
cd coral-integration
node agents/trust-analyzer.js
```

### Production Deployment

For production deployment:

1. **Configure Coral Server**: Update `application.yaml` with production settings
2. **Deploy Agents**: Package agents as Docker containers or executables
3. **Environment Setup**: Configure production environment variables
4. **Monitoring**: Set up monitoring and logging

## 📚 API Reference

### BaseCoralAgent Class

```javascript
class BaseCoralAgent extends EventEmitter {
    constructor(config)
    async connect()
    async disconnect()
    async listAgents(includeDetails)
    async createThread(threadName, participantIds)
    async sendMessage(threadId, content, mentions)
    async waitForMentions(timeoutMs)
    getStatus()
}
```

### Event Handlers

```javascript
agent.on('connected', () => {})
agent.on('disconnected', () => {})
agent.on('message', (message) => {})
agent.on('toolsInitialized', (tools) => {})
```

## 🔍 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check Coral Protocol server is running
   - Verify connection URL is correct
   - Check network connectivity

2. **Agent Not Found**
   - Ensure agent is registered in Coral Protocol
   - Check agent ID matches configuration
   - Verify agent is running and connected

3. **Message Delivery Issues**
   - Check thread creation
   - Verify participant list
   - Ensure proper message formatting

### Debug Mode

Enable debug logging:

```bash
DEBUG=trustswarm:* node agents/trust-analyzer.js
```

### Logs

Check Coral Protocol server logs:

```bash
docker logs <container-id>
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the main project LICENSE file for details.

## 🆘 Support

For support and questions:

- Check the [Coral Protocol documentation](https://docs.coralprotocol.org/)
- Review the test suite for usage examples
- Check the main TrustSwarm documentation
- Open an issue in the repository

## 🔮 Future Enhancements

- [ ] Complete predictor agent implementation
- [ ] Complete voice agent implementation
- [ ] Add more sophisticated trust analysis algorithms
- [ ] Implement agent discovery and capability negotiation
- [ ] Add support for custom tools and capabilities
- [ ] Implement agent persistence and state management
- [ ] Add comprehensive monitoring and metrics
- [ ] Support for distributed agent deployment
