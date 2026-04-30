# Flux Agents FRS (Functional Requirements Specification)

## 1. Introduction
Flux Agents is a multi-tenant AI-powered SaaS platform for small business automation.

## 2. Core Concept: Event-Driven Intelligence
The system is built on a decoupled, modular architecture where components communicate via a unified Global Event Bus and a specialized Context Bus.

## 3. Key Features
- **Event-Driven Workflow**: Uses a single unified event bus with `input`, `process`, `output`, and `system` event categories.
- **Intent Classifier Agent (NEW)**: A central agent that interprets customer messages to determine the best routing path, replacing fragile keyword matching.
- **Traceable Execution**: Every action is linked via `eventId`, `correlationId`, and `causationId`.
- **Scheduler Agent**: Parses natural language dates, checks availability, and creates formal bookings.
- **Idempotency**: Persistent database-backed protection against duplicate event processing.
- **Dual-Memory Model**:
  - **Context Memory**: Stores business state, lead data, and bookings.
  - **Agent Memory**: Stores execution outcomes and patterns for experiential learning.
- **Interactive Dashboard (v1.6)**: Real-time event stream with intent analysis, confidence scores, and routing transparency.

## 4. Technical Requirements
- Node.js / TypeScript (ESM)
- SQLite (better-sqlite3)
- Gemini 1.5 Flash
- Zod (validation)
- P-Queue (async worker)
- Bootstrap 5 UI
