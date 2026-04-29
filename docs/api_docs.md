# Flux Agents API Documentation

## Base URL
`http://localhost:3001`

## Endpoints

### 1. Create Lead
- **URL**: `/api/leads`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "name": "string",
    "email": "valid email",
    "phone": "min 8 digits",
    "message": "min 5 chars"
  }
  ```
- **Description**: Validates input, stores lead, and enqueues a background agent job.

### 2. List Leads
- **URL**: `/api/leads`
- **Method**: `GET`
- **Description**: Returns all captured leads.

### 3. Activity Logs
- **URL**: `/api/logs`
- **Method**: `GET`
- **Description**: Returns timeline logs with structured tool previews.

### 4. Platform Stats
- **URL**: `/api/stats`
- **Method**: `GET`
- **Description**: Returns top-level metrics for the dashboard.
