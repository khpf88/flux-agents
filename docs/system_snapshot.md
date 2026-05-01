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
- Implemented **Response Composer Agent** (`agents/response_composer_agent.json`) to synthesize multi-agent outputs into a single, brand-aligned SMS.
- Re-architected `Conversation Coordinator` to delegate message merging to the composer agent.
- Hardened `Agent Engine` with **resilience layers**:
    - JSON extraction/healing for inconsistent model outputs.
    - Tool name mapping (healing) to resolve hallucinations like `schedule_meeting` -> `send_sms`.
    - Physical file checks for agents to prevent `ENOENT` crashes.
- Implemented **LLM Response Caching** in SQLite to minimize API calls and prevent 429 errors.
- Resolved **Idempotency Conflicts** in the Event Bus by tracking processing state per unique handler.
- Enhanced `Context Bus` with context trimming and optimized data injection for sub-5s latency.
- Optimized `Memory Agent` with granular booking state transitions (e.g., `awaiting_confirmation`).

## Current Gap
- None (Memory implementation completed).

## Next Goals
- Monitor and refine state machine transitions based on real-world lead interactions.
- Consider further memory optimization for tokens if conversation length scales significantly.

## Instructions
- Continue development from this architecture. Do not redesign from scratch. Extend existing system.
- Maintain state machine integrity and adhere to the two-tier memory model.
