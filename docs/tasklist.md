# Flux Agents Tasklist

## Phase 1: Setup
- [x] Directory structure
- [x] Initial documentation
- [x] npm init & dependencies
- [x] TypeScript config
- [x] .env & .gitignore

## Phase 2: Core Refactor (Event-Driven)
- [x] Unified Global Event Bus (EventEmitter)
- [x] Decoupled Orchestrator (Input -> Process)
- [x] Dedicated Context Bus Service
- [x] Dual-Memory Model (Context + Agent Experience)
- [x] Modular Tool Registry

## Phase 3: Hardening & Reliability
- [x] Event IDs & Correlation IDs
- [x] Idempotency Protection
- [x] Structured Failure Handling (AGENT_FAILED, TOOL_FAILED)
- [x] Retry Mechanism (MVP)
- [x] Removal of "Context Ready" events (Pure sync data assembly)

## Phase 4: Frontend Polish (v1.4)
- [x] Color-coded Event Stream (Input, Process, Output)
- [x] Lead Journey Header (Name, Email, Message)
- [x] SMS Message Previews
- [x] Real-time Status Updates (Followed-up badge)
- [x] Dynamic Performance Metrics (Avg Speed, ⚡ Duration)

## Phase 5: Advanced Features
- [x] Scheduler Agent (Intent detection + Bookings)
- [x] Merge to Main
- [x] Documentation Update
- [ ] Redis + BullMQ (For multi-node scaling)
- [ ] Advanced Agent Learning algorithms
