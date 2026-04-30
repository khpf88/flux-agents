# System Snapshot

## Overview
- **Project:** Flux Agents (AI SaaS Platform)
- **Status:** Active Feature Development (Conversation Memory)

## Architecture
- **Event-driven system (Event Bus)**
- **Context Bus for data aggregation**
- **Multi-agent system (agent blocks)**
- **Conversation Coordinator (single response output)**
- **Stateful Memory Layer (Conversation Memory Agent)**

## Agents Implemented
1. **Intent Classifier Agent:** Strategic Router.
2. **Lead Follow-up Agent:** Friendly Sales Assistant.
3. **Scheduler Agent:** Efficient Booking Assistant.
4. **Conversation Memory Agent:** Stateful intelligence layer (state machine, summarization).

## Key Capabilities
- Multi-agent routing
- Tool execution (send_sms, check_availability, create_booking)
- Correlation ID tracing
- Structured logging
- **Multi-turn memory (Persistent state & summarization)**

## Recent Changes
- Implemented Conversation Memory Agent service (`src/memory/memory_agent.ts`).
- Added persistence for state (`conversation_memory`) and history (`conversation_turns`) in SQLite.
- Integrated Memory Agent into the `Context Bus` (data injection) and `Orchestrator` (event flow).
- **Hardened Architecture:**
    - Introduced `phase` management (`collecting` -> `coordinating` -> `finalized`) to conversation states.
    - Implemented hard execution guards in `Agent Engine` to prevent post-finalization agent activity.
    - Upgraded `EventBus` to use atomic `INSERT OR IGNORE` for robust event idempotency.
    - Added phase-based locking via Coordinator to ensure reliable, single-event finalization.

## Current Gap
- None (Memory implementation completed).

## Next Goals
- Monitor and refine state machine transitions based on real-world lead interactions.
- Consider further memory optimization for tokens if conversation length scales significantly.

## Instructions
- Continue development from this architecture. Do not redesign from scratch. Extend existing system.
- Maintain state machine integrity and adhere to the two-tier memory model.
