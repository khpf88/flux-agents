# Flux Agents FRS (Functional Requirements Specification)

## 1. Introduction
Flux Agents is a multi-tenant AI-powered SaaS platform for small business automation.

## 2. Core Concept: Event-Driven Intelligence
The system is built on a decoupled, modular architecture where components communicate via a unified Global Event Bus and a specialized Context Bus.

## 3. Key Features
- **Event-Driven Workflow**: Uses a single unified event bus with `input`, `process`, `output`, and `system` event categories.
- **Intent Classifier Agent**: A central agent that interprets customer messages to determine the best routing path, replacing fragile keyword matching.
- **Conversation Coordinator (NEW)**: Aggregates outputs from multiple agents, intelligently merges them, and ensures a single, coherent final response is delivered to the user.
- **Scheduler Agent**: Parses natural language dates, checks availability, and creates formal bookings.
- **Persistent Idempotency**: Database-backed tracking of event IDs and finalized leads to prevent duplicate actions.
- **Interactive Dashboard (v1.7)**: Real-time event stream with intent analysis, multi-agent proposal tracking, and coordination transparency.

## 4. Technical Requirements
- Node.js / TypeScript (ESM)
- SQLite (better-sqlite3)
- Gemini 1.5 Flash
- Zod (v3 stable validation)
- P-Queue (async worker)
- Bootstrap 5 UI
