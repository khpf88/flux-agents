# Flux Agents Architecture

## Refactored Event-Driven Design
The system has been hardened into a production-grade, decoupled architecture.

## 1. Global Event Bus (Communication)
- **Unified Pub/Sub**: All modules communicate ONLY via the `GlobalEventBus`.
- **Event Metadata**: Every event includes `eventId`, `correlationId`, and `causationId`.
- **Persistent Idempotency**: Database-backed tracking of processed event IDs.

## 2. Intent Classification Agent (Router)
- All new leads are first processed by the **Intent Classifier Agent**.
- It replaces keyword routing with deep LLM reasoning.
- Outputs structured intent, confidence scores, and routing targets.
- **Confidence Threshold**: Routing falls back to general follow-up if confidence < 60%.

## 3. Context Bus (Data)
- **Synchronous Assembly**: A dedicated service that aggregates business data, lead history, availability, and agent experience memory.
- **Timezone Awareness**: Normalizes system UTC times to the business's local timezone.

## 4. Execution Pipeline
1. `POST /api/leads` -> Validate -> Store -> Emit `INPUT.LEAD_CREATED`.
2. `Orchestrator` -> Receives Input -> Trigger `intent_classifier_agent`.
3. `Intent Agent` -> Analyzes Message -> Emits `PROCESS.INTENT_CLASSIFIED`.
4. `Orchestrator` -> Receives Intent -> Routes to `scheduler_agent`, `lead_followup_agent`, etc.
5. `Worker` -> Enqueues Job -> Executes Agent.
6. `Agent Engine` -> Calls `Context Bus` -> reasoning -> `Tool Executor`.

## 5. Observability & UI
- **Timeline Logs**: Real-time visualization of the event chain.
- **Intent Analysis**: Dashboard shows detected intent and confidence per lead.
- **Agent Memory**: Execution outcomes improve future reasoning.
