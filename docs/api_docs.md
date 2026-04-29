# Flux Agents API Documentation

## Base URL
`http://localhost:3001`

## Event Categories
Every action in the system is an event.

- `input:*` : Data entry (Lead capture).
- `process:*`: AI reasoning, decisions, and context prep.
- `output:*`: External actions (SMS sent).
- `system:*`: Errors, retries, and maintenance.

## Endpoints

### 1. Create Lead
- **URL**: `/api/leads`
- **Method**: `POST`
- **Body**: `{ name, email, phone, message }`
- **Action**: Triggers the `input:lead_created` event chain.

### 2. Activity Logs
- **URL**: `/api/logs`
- **Method**: `GET`
- **Response**: List of events with full `correlationId` tracking and structured tool results.

### 3. Statistics
- **URL**: `/api/stats`
- **Method**: `GET`
- **Metrics**: `totalLeads`, `totalResponses`, `avgResponseTime`.
