# Flux Agents Architecture

## Refactored Event-Driven Design
The system has been hardened into a production-grade, decoupled architecture.

## 1. Global Event Bus (Communication)
- **Unified Pub/Sub**: All modules communicate ONLY via the `GlobalEventBus`.
- **Event Metadata**: Every event includes `eventId`, `correlationId`, and `causationId`.
- **Persistent Idempotency**: Database-backed tracking of processed event IDs in `processed_events`.

## 2. Conversation Memory Agent (Stateful Intelligence)
- **State Machine**: Managed via `ConversationState` (e.g., 'scheduling_requested', 'awaiting_time_selection').
- **Memory Layer**: Stores a two-tier structure—structured state for deterministic flow control and an LLM-friendly summary of past turns to reduce token usage and improve continuity.
- **Context Awareness**: The `Context Bus` now injects `conversation_state` and `memory_summary` into every agent request.

## 3. Conversation Coordinator (Output Control)
- **Multi-Agent Aggregation**: Agents no longer send SMS directly. They emit a `PROCESS.AGENT_OUTPUT_READY` proposal.
- **Intelligent Merging**: The Coordinator reads `ConversationState` to prioritize agents (e.g., scheduler is high priority if the state is 'awaiting_time_selection').
- **Conflict Resolution**: Prioritizes higher-priority agents (like Scheduler) over general follow-ups based on the current conversational flow.
- **Fail-safe**: If the coordinator fails, it defaults to a safe single-agent fallback.

## 4. Intent Classification Agent (The Router)
- All new leads are first processed by the **Intent Classifier Agent**.
- It can trigger multiple specialized agents simultaneously for the Coordinator to handle.

## 5. Context Bus (Data)
- **Synchronous Assembly**: Aggregates business data, lead history, `conversation_state`, and `memory_summary`.

## 6. Execution Pipeline
1. `POST /api/leads` -> Store lead -> Record initial message as a turn.
2. `Orchestrator` -> Routes to `intent_classifier_agent`.
3. `Intent Agent` -> Classifies -> Triggers `MemoryAgent.updateState`.
4. `MemoryAgent` -> Updates flow (e.g., `scheduling_requested`).
5. `Agents` -> Receive full context (with state) -> Execute/Propose.
6. `Coordinator` -> Reads current `conversation_state` -> Merges proposals -> Emits `OUTPUT.FINAL_RESPONSE_READY`.
7. `Final Delivery` -> Record assistant turn -> Trigger summarization -> Deliver SMS.

## 7. Storage
- **Leads**: Customer contact info, messages, and intent analysis.
- **ConversationTurns**: Full transcript of user/assistant interactions.
- **ConversationMemory**: Persistent JSON state and summary per lead.
- **Bookings**: Scheduled appointments with double-booking protection.
- **Agent Logs**: Traceable event chain history with `correlation_id`.
- **Processed Events**: Persistent idempotency tracking.
