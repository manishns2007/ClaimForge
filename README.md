# ClaimForge — Autonomous Pre-Dispute Financial Claim Discovery Platform

ClaimForge is an autonomous, backend-first, real-time platform that discovers financially recoverable commercial claims from fragmented business evidence (contracts, amendments, invoices, emails, telemetry CSVs, field reports).

## Implementation Phase 1 — Backend Foundation

This repository contains the production-quality backend foundation for ClaimForge.

---

## Project Structure

```
backend/
  app/
    __init__.py
    main.py                 # FastAPI Application & Lifecycle
    api/
      __init__.py
      investigations.py     # Investigation CRUD, File Uploads, SSE Stream
      claims.py             # Claims & Evidence Queries
      dashboard.py          # Dynamic DB KPI Metrics & Health Check
    core/
      config.py             # Environment & Application Settings
      logging.py            # Structured JSON Application Logging
    db/
      database.py           # SQLAlchemy 2.0 SQLite Engine & Sessions
      models.py             # 12 Domain Schema Models (UUID keys, UTC timestamps)
    schemas/
      investigation.py      # Investigation Request/Response Models
      document.py           # Document & Chunk Schemas
      evidence.py           # Canonical Evidence Schemas
      claim.py              # Claim & ClaimEvidence Schemas
      events.py             # Persistent Event Log Schemas
    parsers/
      pdf_parser.py         # PyMuPDF PDF Text & Page Citation Parser
      csv_parser.py         # Pandas CSV Telemetry & Column Parser
      email_parser.py       # Python Email EML Parser
    services/
      document_ingestion.py # Multi-file Ingestion & State Machine
      event_service.py      # Event Persistence & SSE Queue Service
      evidence_service.py   # Canonical Evidence Model Creator
  storage/                  # SQLite DB & Persisted Uploaded Files

tests/
  test_backend_foundation.py # Automated Pytest Suite (10 Test Cases)

requirements.txt             # Dependency Definitions
.env.example                 # Environment Variable Template
README.md                    # System Documentation
```

---

## Getting Started

### 1. Requirements & Python Setup

- **Python**: 3.13 (or 3.10+)
- Install dependencies:
```bash
py -m pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run FastAPI Application Server

Start the Uvicorn server:
```bash
py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The server will automatically initialize SQLite database tables under `./storage/claimforge.db`.

Access interactive Swagger API Docs at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Application health check |
| `GET` | `/api/dashboard/stats` | Dynamic database aggregate KPIs |
| `POST` | `/api/investigations` | Create a new investigation session |
| `GET` | `/api/investigations` | List all investigations |
| `GET` | `/api/investigations/{id}` | Get detailed investigation status |
| `POST` | `/api/investigations/{id}/documents` | Upload PDF, CSV, EML, or TXT evidence files |
| `GET` | `/api/investigations/{id}/events` | Fetch persisted execution events log |
| `GET` | `/api/investigations/{id}/stream` | Server-Sent Events (SSE) stream for real-time progress |
| `GET` | `/api/claims` | List discovered claims |
| `GET` | `/api/claims/{id}` | Get claim details and evidence links |

---

## Running Tests

Run the full pytest suite:
```bash
py -m pytest tests/test_backend_foundation.py -v
```

Run manual E2E foundation verification against the running server:
```bash
py backend/verify_foundation.py
```
