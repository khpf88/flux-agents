# Flux Agents Architecture

## Refactored Event-Driven Design
The system has been hardened into a production-grade, decoupled architecture.

## 1. Global Event Bus (Communication)
- **Unified Pub/Sub**: All modules communicate ONLY via the `GlobalEventBus`.
- **Event Metadata**: Every event includes `eventId`, `correlationId`, and `causationId`.
- **Idempotency**: In-memory tracking of processed event IDs to prevent duplicate side-effects.

## 2. Context Bus (Data)
- **Synchronous Assembly**: A dedicated service that aggregates business data, lead history, and agent experience memory at request-time.
- **No Side-Effects**: The Context Bus is a read-only data assembly layer.

## 3. Execution Pipeline
1. `POST /api/leads` -> Validate -> Store -> Emit `INPUT.LEAD_CREATED`.
2. `Orchestrator` -> Receives Input -> Emits `PROCESS.AGENT_TRIGGERED`.
3. `Worker` -> Enqueues Job -> Executes `Agent Engine`.
4. `Agent Engine` -> Calls `Context Bus` -> Reasoning -> Decision -> `Tool Executor`.
5. `Tool Executor` -> Runs Tool -> Emits `OUTPUT` event.
6. `Finalize` -> Update Lead Status -> Write to `Agent Memory`.

## 4. Observability & Resilience
- **Timeline Logs**: Real-time visualization of the event chain.
- **Failure Recovery**: System catches tool/agent crashes and triggers `system:retry_requested` events.
- **Agent Memory**: Execution outcomes are stored to improve future reasoning.
