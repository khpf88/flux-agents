# Development Log - Flux Agents

## [2026-04-27] Initial Build
- Created basic Lead capture to SMS flow.

## [2026-04-28] Event-Driven Refactor
- Implemented Unified Event Bus and Context Bus.
- Introduced Dual-Memory Model (Experiential learning table).
- Moved to standard correlation/causation ID tracking.

## [2026-04-29] Hardening & UI Polish (v1.4)
- Added Idempotency protection to the Event Bus.
- Implemented retry logic for tool/agent failures.
- Polished Dashboard with timeline views, SMS previews, and dynamic duration stats.
- Automated status updates from "New" to "Followed-up".

## [2026-04-29] Scheduler Agent (v1.5)
- Implemented Scheduler Agent for automated booking.
- Added intent detection to Orchestrator (Lead vs. Booking).
- Created `check_availability` and `create_booking` modular tools.
- Updated Context Bus to supply real-time availability data.
- Added `bookings` table to database.
- Enhanced Dashboard to visualize scheduling events.
