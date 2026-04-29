# Flux Agents FRS (Functional Requirements Specification)

## 1. Introduction
Flux Agents is a multi-tenant AI-powered SaaS platform for small business automation.

## 2. Core Concept
Modular AI Agent Blocks that interact via a shared Context Bus.

## 3. MVP Features
- **Validated Lead Capture**: Form to collect name, email, phone, and message with strict Zod validation.
- **Async Event Trigger**: Lead creation enqueues a background job using P-Queue.
- **Structured Logging**: All system and agent events are logged in structured JSON and persistent SQLite.
- **Agent Logic**: Personalized SMS follow-up with LLM guardrails and structured tool output.
- **Dashboard**: Real-time admin view with top-level metrics (Leads, Responses, Speed) and interactive log filtering.

## 4. Technical Requirements
- Node.js / TypeScript (ESM)
- SQLite (better-sqlite3)
- Gemini 1.5 Flash
- Zod (validation)
- P-Queue (async worker)
- Bootstrap 5 UI
