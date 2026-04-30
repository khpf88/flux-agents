# Flux Agents Architecture

## Refactored Event-Driven Design
The system has been hardened into a production-grade, decoupled architecture.

## 1. Global Event Bus (Communication)
- **Unified Pub/Sub**: All modules communicate ONLY via the `GlobalEventBus`.
- **Event Metadata**: Every event includes `eventId`, `correlationId`, and `causationId`.
- **Persistent Idempotency**: Database-backed tracking of processed event IDs in `processed_events`.

## 2. Conversation Coordinator (Output Control)
- **Multi-Agent Aggregation**: Agents no longer send SMS directly. They emit a `PROCESS.AGENT_OUTPUT_READY` proposal.
- **Intelligent Merging**: The Coordinator waits for all agents (max 2s), then merges their suggestions (e.g., combining a greeting from one with availability slots from another).
- **Conflict Resolution**: Prioritizes higher-priority agents (like Scheduler) over general follow-ups.
- **Fail-safe**: If the coordinator fails, it defaults to a safe single-agent fallback.

## 3. Intent Classification Agent (The Router)
- All new leads are first processed by the **Intent Classifier Agent**.
- It can trigger multiple specialized agents simultaneously for the Coordinator to handle.

## 4. Context Bus (Data)
- **Synchronous Assembly**: A dedicated service that aggregates business data, lead history, and agent experience memory.

## 5. Execution Pipeline
1. `POST /api/leads` -> Validate -> Store -> Emit `INPUT.LEAD_CREATED`.
2. `Orchestrator` -> Receives Input -> Emit `AGENT_TRIGGERED` for `intent_classifier_agent`.
3. `Intent Agent` -> Analyzes Message -> Emits `PROCESS.INTENT_CLASSIFIED`.
4. `Orchestrator` -> Routes to downstream agent(s).
5. `Agents` -> Execute and Emit `AGENT_OUTPUT_READY` proposals.
6. `Coordinator` -> Aggregates -> Merges -> Emits `OUTPUT.FINAL_RESPONSE_READY`.
7. `Final Delivery` -> Executes `send_sms` tool -> Updates Lead Status.

## 6. Storage
- **Leads**: Customer contact info, messages, and intent analysis.
- **Bookings**: Scheduled appointments with double-booking protection.
- **Agent Logs**: Traceable event chain history with `correlation_id`.
- **Processed Events**: Persistent idempotency tracking.
