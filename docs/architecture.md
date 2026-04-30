# Flux Agents Architecture

## Refactored Event-Driven Design
The system has been hardened into a production-grade, decoupled architecture.

## 1. Global Event Bus (Communication)
- **Unified Pub/Sub**: All modules communicate ONLY via the `GlobalEventBus`.
- **Event Metadata**: Every event includes `eventId`, `correlationId`, and `causationId`.
- **Persistent Idempotency**: Database-backed tracking of processed event IDs in `processed_events` table to prevent duplicate side-effects.

## 2. Intent Classification Layer
- Before routing to a specific agent, the `Orchestrator` calls an **Intent Classifier** (LLM-based) to categorize the message.
- This replaces fragile keyword-based routing.

## 3. Context Bus (Data)
- **Synchronous Assembly**: A dedicated service that aggregates business data, lead history, availability, and agent experience memory at request-time.
- **Timezone Awareness**: Injects the business's local timezone into the agent context for proper scheduling.

## 4. Execution Pipeline
1. `POST /api/leads` -> Validate -> Store -> Emit `INPUT.LEAD_CREATED`.
2. `Orchestrator` -> Receives Input -> **Classify Intent** -> Emit `PROCESS.INTENT_CLASSIFIED`.
3. `Orchestrator` -> Receives Intent -> Route to `scheduler_agent` or `followup_agent`.
4. `Worker` -> Enqueues Job -> Executes `Agent Engine`.
5. `Agent Engine` -> Calls `Context Bus` -> Reasoning -> Decision -> `Tool Executor`.
6. `Finalize` -> Update Lead Status -> Write to `Agent Memory`.

## 5. Observability & Resilience
- **Timeline Logs**: Real-time visualization of the event chain with specialized booking rendering.
- **Failure Recovery**: System catches tool/agent crashes and triggers `system:retry_requested` events.
- **Agent Memory**: Execution outcomes are stored to improve future reasoning.

## 6. Storage
- **Leads**: Customer contact information and original messages.
- **Bookings**: Scheduled appointments with status and **Double-Booking Protection**.
- **Agent Logs**: Traceable event chain history with `correlation_id`.
- **Processed Events**: Table for persistent idempotency.
