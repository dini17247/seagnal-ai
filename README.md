# SEAGNAL AI

**Maritime Threat Intelligence and Geographic Surveillance Platform**

SEAGNAL AI is a maritime intelligence prototype designed to support vessel monitoring, anomaly detection, restricted-zone surveillance, alert investigation, and incident reporting. The platform presents vessel telemetry and maritime threats through a centralized operations dashboard and interactive map.

> **Project status:** Frontend prototype completed. BigQuery datasets and Cloud SQL operational tables have been prepared. Real BigQuery data access and WorkOS authentication are currently being integrated and tested. Gemini-based incident analysis is planned for a later phase.

---

## Core Capabilities

- Maritime operations dashboard with vessel and alert indicators
- Interactive Leaflet vessel map with heading markers and movement trails
- Restricted maritime-zone polygon visualization
- Vessel profile and telemetry history pages
- Detection and presentation of maritime anomalies, including:
  - AIS signal gaps
  - Restricted-zone entry
  - Speed anomalies
  - Loitering
  - Route deviation
  - Fishing-like movement
- Alert Center for active and under-review incidents
- Resolved incident archive and dossier workspace
- Configurable AIS-gap and risk-score thresholds
- Authentication and role-based access preparation using WorkOS AuthKit

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Mapping | Leaflet, CARTO map tiles |
| Icons and UI | Lucide React, Motion |
| Backend | Node.js and Express |
| Maritime analytics | Google BigQuery |
| Operational records | Cloud SQL for PostgreSQL |
| Authentication | WorkOS AuthKit |
| AI layer | Gemini API or Vertex AI, planned |
| Deployment target | Google Cloud Run |

---

## System Architecture

```text
WorkOS AuthKit
  Authentication, sessions, roles and permissions
                         |
                         v
React + TypeScript frontend
                         |
                         v
Node.js + Express API
             /                           \
            v                             v
Google BigQuery                    Cloud SQL PostgreSQL
Maritime and analytical data      Operational application records
            \                             /
             v                           v
          Gemini AI layer — planned for summaries and explanations
```

The browser must not connect directly to BigQuery, Cloud SQL, WorkOS server APIs, or Gemini. All protected operations should pass through the Express backend.

---

## Data Architecture

### BigQuery

Dataset:

```text
seagnal_ai
```

Tables:

| Table | Purpose |
|---|---|
| `vessels` | Vessel identity, classification, latest telemetry and risk information |
| `vessel_movements` | Historical AIS coordinates, speed, heading and timestamps |
| `alerts` | Detected maritime anomalies and recommended actions |
| `maritime_zones` | Restricted zones and geofence definitions |

BigQuery is used for read-heavy maritime data, historical analysis and dashboard aggregation.

### Cloud SQL PostgreSQL

Database:

```text
seagnal_ai
```

Prepared tables:

| Table | Purpose |
|---|---|
| `app_users` | Links authenticated WorkOS users to application records |
| `alert_reviews` | Stores alert assignment, review and resolution details |
| `incident_reports` | Stores dossier drafts and finalized reports |
| `incident_report_alerts` | Connects reports with one or more alerts |
| `system_settings` | Stores operational threshold configuration |
| `audit_logs` | Records significant user actions |

Cloud SQL is intended for frequently changing operational records. Full CRUD modules are outside the current MVP scope.

---

## Authentication Scope

WorkOS AuthKit is used for:

- Hosted sign-in
- Secure sessions
- Sign-out
- Organization membership
- Role-based page and action access

The current MVP can use two roles:

| Role | Access |
|---|---|
| `system_admin` | All current views and prototype actions |
| `viewer` | Read-only access to maritime information |

Authentication secrets must remain on the server. Do not expose the WorkOS API key or session secrets through variables prefixed with `VITE_`.

---

## Project Structure

```text
seagnal-ai/
├── server/                         # Express API and server integrations
│   ├── auth/                       # WorkOS session handling
│   ├── config/                     # Environment configuration
│   ├── middleware/                 # Authentication and error middleware
│   ├── routes/                     # API routes
│   ├── services/                   # BigQuery and external services
│   └── mappers/                    # BigQuery-to-frontend data mapping
├── src/
│   ├── auth/                       # React authentication context
│   ├── components/                 # Dashboard and operational views
│   ├── services/                   # Frontend API clients
│   ├── App.tsx                     # Main view navigation
│   ├── data.ts                     # Mock development data
│   ├── types.ts                    # Shared frontend interfaces
│   └── main.tsx                    # React entry point
├── .env.example
├── package.json
├── vite.config.ts
└── README.md
```

The exact server folders may vary while the real integration is being completed.

---

## Prerequisites

Install the following before running the project locally:

- Node.js 20 or later
- npm
- Google Cloud CLI
- Access to the Seagnal AI Google Cloud project
- WorkOS Staging credentials for real authentication testing

---

## Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd seagnal-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the local environment file

Copy the example file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 4. Configure Google Cloud authentication

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_GCP_PROJECT_ID
```

Application Default Credentials are required for the local Node.js BigQuery client.

### 5. Configure the WorkOS callback

In the WorkOS Staging environment, register:

```text
http://localhost:3000/callback
```

The application should use:

```text
APP_BASE_URL=http://localhost:3000
WORKOS_REDIRECT_URI=http://localhost:3000/callback
```

### 6. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Environment Variables

Create a `.env` file in the project root. Never commit this file.

```env
# Application mode
NODE_ENV=development
AUTH_MODE=workos
AUTH_REQUIRED=true
USE_MOCK_AUTH=false
USE_MOCK_DATA=false
CLOUD_SQL_ENABLED=false

# Application URLs
APP_BASE_URL=http://localhost:3000
WORKOS_REDIRECT_URI=http://localhost:3000/callback

# WorkOS — server only
WORKOS_API_KEY=
WORKOS_CLIENT_ID=
WORKOS_COOKIE_PASSWORD=
CSRF_SECRET=
WORKOS_ORGANIZATION_ID=

# Google Cloud and BigQuery
GCP_PROJECT_ID=
BIGQUERY_DATASET_ID=seagnal_ai
BIGQUERY_VESSELS_TABLE=vessels
BIGQUERY_MOVEMENTS_TABLE=vessel_movements
BIGQUERY_ALERTS_TABLE=alerts
BIGQUERY_ZONES_TABLE=maritime_zones

# Cloud SQL — optional during current MVP
CLOUD_SQL_INSTANCE_CONNECTION_NAME=
CLOUD_SQL_DATABASE=seagnal_ai
CLOUD_SQL_USER=seagnal-ai
CLOUD_SQL_PASSWORD=

# Gemini — optional and currently deferred
GEMINI_API_KEY=
GEMINI_MODEL=
```

For mock-only frontend testing:

```env
AUTH_MODE=mock
AUTH_REQUIRED=false
USE_MOCK_AUTH=true
USE_MOCK_DATA=true
CLOUD_SQL_ENABLED=false
```

When `USE_MOCK_DATA=false`, database errors must be displayed clearly and must not silently fall back to mock records.

---

## Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run the development application |
| `npm run build` | Create a production build |
| `npm run lint` | Run TypeScript validation |
| `npm run preview` | Preview the built frontend |

The final full-stack setup should start both the Vite frontend and Express backend through `npm run dev`.

---

## Expected API Endpoints

### Health and authentication

```text
GET  /api/health
GET  /api/health/auth
GET  /api/health/bigquery
GET  /login
GET  /callback
GET  /api/auth/me
POST /logout
```

### Maritime data

```text
GET /api/dashboard/summary
GET /api/vessels
GET /api/vessels/:vesselId
GET /api/vessels/:vesselId/movements
GET /api/vessels/:vesselId/alerts
GET /api/alerts
GET /api/maritime-zones
```

Some endpoints may remain under implementation until the Express and BigQuery integration is completed.

---

## Verification Checklist

Before deploying, verify that:

- [ ] `npm install` completes successfully
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] WorkOS `/login` redirects to AuthKit
- [ ] WorkOS `/callback` creates a session
- [ ] `/api/auth/me` returns the authenticated user
- [ ] Logout clears the user session
- [ ] Role-based menus and actions behave correctly
- [ ] `/api/health/bigquery` confirms database access
- [ ] `/api/vessels` returns real BigQuery records
- [ ] Dashboard metrics use database values
- [ ] Vessel map uses real coordinates and zones
- [ ] Production mode does not silently use mock data
- [ ] No credentials are present in the browser bundle or Git history

---

## Deployment Plan

The intended deployment target is Google Cloud Run.

Production deployment requires:

1. A stable Cloud Run service URL
2. The Cloud Run callback URL registered in WorkOS
3. WorkOS secrets stored securely
4. A Cloud Run service account with minimum BigQuery permissions
5. Cloud SQL Client access when operational persistence is enabled
6. Cloud SQL and WorkOS secrets stored through Secret Manager
7. Production environment variables configured on the Cloud Run revision

Example production callback:

```text
https://YOUR-CLOUD-RUN-URL/callback
```

---

## Security Principles

- Never commit `.env` files, passwords, API keys or service-account keys.
- Never expose WorkOS, Cloud SQL or Gemini secrets in React code.
- Use server-side WorkOS session validation.
- Use HTTP-only and secure session cookies in production.
- Enforce authorization in backend routes, not only in the UI.
- Use Application Default Credentials for BigQuery.
- Use parameterized queries for Cloud SQL.
- Use least-privilege IAM roles.
- Do not allow the browser to query BigQuery or Cloud SQL directly.

---

## MVP Scope and Roadmap

### Current MVP

- Frontend operations dashboard
- Vessel map and profiles
- Alert visualization and prototype review workflow
- Incident dossier interface
- BigQuery maritime datasets
- Cloud SQL schema preparation
- WorkOS authentication integration

### Planned next steps

- Complete and validate the Express API layer
- Replace runtime mock data with BigQuery responses
- Complete WorkOS login, logout and role testing
- Connect selected operational actions to Cloud SQL
- Add deterministic maritime anomaly processing
- Add Gemini-assisted incident summaries after the core data flow is stable
- Deploy and validate the complete application on Cloud Run

---

## Important Notice

SEAGNAL AI is currently an MVP and demonstration platform. Maritime alerts, risk scores, recommendations and AI-generated content must not be treated as verified operational decisions without review by an authorized officer.

---

## Project Documentation

For detailed interface behaviour, refer to:

```text
UI_FUNCTIONAL_SPECIFICATION.md
```

