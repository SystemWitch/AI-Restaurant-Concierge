# AI Restaurant Concierge – Real-Time Voice & Avatar Agent

An interactive AI-powered restaurant concierge that allows customers to communicate naturally with a virtual maître d' through real-time voice conversations and an animated AI avatar.

Built with **Python, LiveKit Agents, OpenRouter, Cartesia, Silero VAD, and Synthesia**, the application combines conversational AI with real-time audio/video communication and frontend interaction.

### Key Features

- Real-time voice conversations with an AI restaurant assistant.
- Interactive Synthesia avatar with synchronized audio and video.
- AI-powered menu assistance and dish recommendations.
- Dietary preference filtering (vegan, vegetarian, gluten-free).
- Interactive menu navigation through AI function calling.
- Add dishes to an order through natural language.
- LiveKit-based real-time communication.
- Secure backend-generated access tokens.

### Tech Stack

- **Backend:** Python, Aiohttp
- **AI Agent:** LiveKit Agents, OpenRouter
- **Speech-to-Text:** Cartesia
- **Text-to-Speech:** Cartesia
- **Voice Activity Detection:** Silero VAD
- **Avatar:** Synthesia
- **Real-Time Communication:** LiveKit
- **Frontend:** HTML, CSS, JavaScript

### Architecture

The browser connects to a LiveKit room, where the AI agent handles voice input, processes user requests through an LLM, executes function tools, and responds with generated speech and an interactive avatar.

This project demonstrates real-time AI agents, tool calling, voice pipelines, and frontend-backend communication.
