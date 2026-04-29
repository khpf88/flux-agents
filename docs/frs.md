# Flux Agents FRS (Functional Requirements Specification)

## 1. Introduction
Flux Agents is a multi-tenant AI-powered SaaS platform for small business automation.

## 2. Core Concept: Event-Driven Intelligence
The system is built on a decoupled, modular architecture where components communicate via a unified Global Event Bus and a specialized Context Bus.

## 3. Key Features
- **Event-Driven Workflow**: Uses a single unified event bus with `input`, `process`, `output`, and `system` event categories.
- **Traceable Execution**: Every action is linked via `eventId`, `correlationId`, and `causationId`.
- **Idempotency**: Prevents duplicate processing of events to ensure system reliability.
- **Dual-Memory Model**:
  - **Context Memory**: Stores business state and lead data.
  - **Agent Memory**: Stores execution outcomes and patterns for experiential learning.
- **Validated Capture**: Strict Zod-based input validation with international phone support.
- **Interactive Dashboard (v1.4)**: Real-time event stream, lead status tracking, and AI reasoning transparency.

## 4. Technical Requirements
- Node.js / TypeScript (ESM)
- SQLite (better-sqlite3)
- Gemini 1.5 Flash
- Zod (validation)
- P-Queue (async worker)
- Bootstrap 5 UI
