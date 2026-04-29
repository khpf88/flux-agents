# Flux Agents Architecture

## High-Level Design
The system follows a hardened, event-driven, modular architecture designed for stability and traceability.

## Core Components
1. **Validation Layer (Zod)**: Enforces data integrity at all entry points.
2. **Agent Engine**: Executes agent logic using LLM with a strict 9-step pipeline and JSON guardrails.
3. **Context Bus**: Assembles read-only state (business, lead, history) for agents.
4. **Worker Queue (P-Queue)**: Manages asynchronous execution of agent tasks to keep the API responsive.
5. **Orchestrator**: Simple routing mapping events to agent jobs.
6. **Tool Executor**: Secure registry for executing allowlisted tools.
7. **Structured Logger**: Produces JSON-line logs for observability.

## System Flow
1. `Client` -> `POST /api/leads`
2. `Validation` -> Rejects or Accepts
3. `Lead Service` -> Persists to `DB`
4. `Event Bus` -> Emits `LEAD_CREATED`
5. `Orchestrator` -> Enqueues job to `Worker Queue`
6. `Worker` -> Picks up job
7. `Agent Engine` -> `Context` -> `LLM` -> `Validation` -> `Tool Executor`
8. `Audit Trail` -> Logs written to `agent_logs` and `Structured Logger`
9. `Dashboard` -> Real-time polling of leads and logs.
