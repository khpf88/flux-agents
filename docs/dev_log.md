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
- Added Agent ID Normalization to handle diverse LLM naming conventions.
- Stabilized Zod environment by downgrading to stable v3.24.1.
- Implemented persistent database-backed idempotency.
- Enhanced Dashboard with Intent Analysis and Confidence metrics.
