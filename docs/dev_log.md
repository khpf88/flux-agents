# Development Log - Flux Agents

## [2026-04-27] Initial Build
- Created basic Lead capture to SMS flow.

## [2026-04-28] Event-Driven Refactor
- Implemented Unified Event Bus and Context Bus.
- Introduced Dual-Memory Model (Experiential learning table).
- Moved to standard correlation/causation ID tracking.

## [2026-04-29] Intent Engine & Decoupling (v1.6)
- Implemented central Intent Classifier Agent for LLM-driven routing.
- Fully decoupled Orchestrator from Worker using purely asynchronous event signals.

## [2026-04-30] Conversation Coordinator (v1.7)
- Implemented Conversation Coordinator to aggregate outputs from multiple agents.
- Refactored Agent Engine to use the "Proposal" pattern for output tools (SMS).
- Added intelligent message merging (Scheduler slots + Follow-up personalization).
- Enforced a single final response per lead interaction using a 2s aggregation window.
- Centralized lead status updates in the final delivery step.
