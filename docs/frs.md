# Flux Agents FRS (Functional Requirements Specification)

## 1. Introduction
Flux Agents is a multi-tenant AI-powered SaaS platform for small business automation.

## 2. Core Concept: Event-Driven Intelligence
The system is built on a decoupled, modular architecture where components communicate via a unified Global Event Bus and a specialized Context Bus.

## 3. Key Features
- **Event-Driven Workflow**: Uses a single unified event bus with `input`, `process`, `output`, and `system` event categories.
- **Traceable Execution**: Every action is linked via `eventId`, `correlationId`, and `causationId`.
- **Intent Classification**: Uses LLM to classify incoming messages into 'scheduling' or 'general' intents for accurate routing.
- **Scheduler Agent (Hardened)**: 
  - Parses natural language dates (e.g., "this Friday") into structured ISO dates.
  - Checks availability and suggests slots via SMS.
  - Prevents double-booking at the database level.
  - Normalizes all user-facing output to the business timezone.
- **Persistent Idempotency**: Uses a database-backed event log to prevent duplicate processing of the same event.
- **Dual-Memory Model**:
  - **Context Memory**: Stores business state, lead data, and bookings.
  - **Agent Memory**: Stores execution outcomes and patterns for experiential learning.
- **Interactive Dashboard (v1.5)**: Real-time event stream with correlation tracking and specialized booking rendering.

## 4. Technical Requirements
- Node.js / TypeScript (ESM)
- SQLite (better-sqlite3)
- Gemini 1.5 Flash
- Zod (validation)
- P-Queue (async worker)
- Bootstrap 5 UI
