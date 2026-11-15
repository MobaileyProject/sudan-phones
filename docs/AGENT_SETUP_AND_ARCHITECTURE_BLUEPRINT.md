# Agent Setup, Architecture & Optimization Blueprint
*A Strategic Architecture Guide for AI-Driven API Development, Token Efficiency, and Automated Collaboration*

---

## Executive Summary
This document establishes the foundational rules, tools, and practices for developing our API-first marketplace application with Antigravity AI agents. It establishes strict separation of concerns, exhaustive API contract documentation, a standardized bug/defect schema, a local Retrieval-Augmented Generation (RAG) indexing engine to eliminate token burning, recommended custom skills, and an Antigravity Slash Commands playbook.

---

## 1. Modular API Architecture & Separation of Concerns

To prevent massive monolithic files where agents lose context or overwrite concurrent work, the project adopts a strict, decoupled 5-tier architecture:

| Layer | Path | Responsibilities & Invariants |
|---|---|---|
| **1. Routers** | `backend/app/routers/<domain>.py` | Pure HTTP boundary: URL routes, HTTP verbs, request parameters, FastAPI dependency injection (auth, DB session), status codes. No database queries or business logic. |
| **2. Schemas** | `backend/app/schemas/<domain>.py` | Pydantic models for request bodies, query validation, and response serialization. Enforces field constraints, regex, and OpenAPI examples. |
| **3. Services** | `backend/app/services/<domain>.py` | Business logic, transaction orchestration, domain invariants, role/permission verification, and event emission. |
| **4. Repositories** | `backend/app/repositories/<domain>.py` | SQLAlchemy 2 database queries, filters, joins, and pagination. Pure data access; never raises HTTP exceptions. |
| **5. Models** | `backend/app/models/<domain>.py` | SQLAlchemy declarative ORM tables, columns, constraints, foreign keys, and indexes. |

> **Golden Rule of Separation:** Never allow database models or raw queries into routers, and never raise HTTP exceptions inside repositories. This guarantees each layer can be unit-tested in isolation without mocking the entire database stack.

---

## 2. Exhaustive API Endpoint Documentation Protocol

Every endpoint requires dual documentation:

### A. Machine-Readable OpenAPI 3.1
- Derived directly from Pydantic schemas and FastAPI route declarations.
- Serialized to `docs/openapi.json` via `make openapi`.
- Verified in CI via `make openapi-check`.

### B. Human- & Agent-Readable Markdown Catalogs (`docs/api/<domain>.md`)
Each endpoint must be cataloged with:
- Endpoint URL & HTTP Method
- Description & Business Rules
- Authentication & RBAC permissions required
- Request payload fields table (with types, defaults, validation)
- Possible HTTP Status Codes (200/201, 400, 401, 403, 404, 409, 500)
- Example curl / request payload

---

## 3. Standardized Bug & Defect Logging Schema

Debugging without persistent history forces agents to rediscover previous fixes and burn context tokens. We establish a structured, searchable bug registry stored in `docs/bugs/BUG-XXXX.json` (or Markdown with structured YAML frontmatter).

```json
{
  "id": "BUG-2026-001",
  "title": "Token refresh replay triggers false positive revocation",
  "status": "resolved",
  "severity": "high",
  "category": "auth",
  "date_reported": "2026-11-15T22:30:00Z",
  "date_resolved": "2026-11-15T23:15:00Z",
  "affected_files": [
    "backend/app/routers/auth.py",
    "backend/app/services/auth_service.py"
  ],
  "affected_endpoints": [
    "POST /api/v1/auth/refresh"
  ],
  "reproduction_steps": [
    "1. Issue login to receive access and refresh token",
    "2. Send two concurrent refresh requests within 50ms",
    "3. Observe session family revocation due to race condition"
  ],
  "root_cause": "Race condition in SQLAlchemy session commit where token rotation lock did not use SELECT FOR UPDATE.",
  "fix_summary": "Added row-level lock (with_for_update) on the session token row during rotation.",
  "regression_test": "tests/test_auth.py::test_concurrent_refresh_rotation",
  "resolved_in_commit": "a1b2c3d4"
}
```

### Benefits:
- **Instant Querying:** Bugs can be queried by category (`auth`, `db`, `cors`, `ui`), severity, or affected file.
- **Zero Memory Loss:** When an agent encounters an error, it queries the bug index first. If the error occurred before, the root cause and fix are retrieved in under 1 second.

---

## 4. Lightweight Local RAG & Fast Codebase Search (Token Preservation Engine)

Reading multiple large source files across conversation turns consumes 50,000–100,000 tokens per task, inflating cost and risking context overflow.

### The Solution: Local SQLite FTS5 Code Indexer
A lightweight Python script (`scripts/index_codebase.py` and `scripts/search_codebase.py`) that builds an in-memory or SQLite Full-Text Search (FTS5) index over all symbols, functions, API routes, database models, and bug records:
- **Context Usage:** Fetches only the top 3 relevant code snippets (~1.5k tokens) instead of reading 15 files (~60k tokens).
- **Bug Resolution:** Allows querying `search_bugs.py "concurrent refresh"` to find historical fixes instantly.
- **Zero Dependencies:** Uses Python's standard `sqlite3` module with FTS5 enabled—zero external APIs, zero cost, instant response.

---

## 5. Custom Agent Skills & Recommended Ecosystem Tooling

Skills extend Antigravity's capabilities by providing documented, repeatable workflows:

| Skill Name | Type | Purpose & Workflow |
|---|---|---|
| **`api-scaffold`** | Custom Project Skill | Automates generating the 5-layer API files (router, schema, service, repo, test) from a single CLI command with proper typing and Pydantic validators. |
| **`code-search` (RAG)** | Custom Project Skill | Allows agents to run targeted semantic/FTS queries against the codebase, symbols, and past bugs before modifying code. |
| **`bug-recorder`** | Custom Project Skill | Prompts the agent to automatically document any bug fix according to the JSON schema in `docs/bugs/` after completing a task. |
| **`slack`** | Global Plugin / MCP | Enables real-time notifications, thread replies, and milestone broadcasts into `#project-updates` and `#dev-chat`. |
| **`gdrive`** | Global Plugin / CLI | Exports specifications, architecture diagrams, and progress reports to Google Drive for offline founder review. |

---

## 6. Antigravity Slash Commands & Capabilities Playbook

How founders and agents leverage Antigravity's slash commands:

- **`/plan`**: Run at the start of any new feature or architectural pivot. Forces the agent to formulate an executable, step-by-step implementation plan with risks and rollback strategies before writing code.
- **`/goal`**: Run for long-running, autonomous tasks (e.g. implementing full auth or test suites). Directs the agent to work deeply across multiple turns, running tests and verifying each step until the goal is fully achieved.
- **`/boost`**: Run for complex coding, security-sensitive auth, or high-risk DB refactoring. Enables enhanced reasoning, multi-angle verification, and rigorous edge-case analysis.
- **`/learn`**: Run whenever the agent learns a repository-specific convention or corrects a bug. Persists the learned behavior into project memory so future agents never repeat the mistake.
- **`/compact`**: Run when a conversation session reaches high context usage. Summarizes conversational history and discards intermediate outputs, preserving token capacity.
- **`/schedule`**: Run for background checks or recurring operations (e.g. periodic CI health checks or daily Slack digests).

---

## 7. Pre-Coding Architecture Checklist

- [x] **GitHub & Slack Linked:** CI pushes automated alerts to `#project-updates`.
- [x] **Code Ownership:** `.github/CODEOWNERS` assigns both founders (`@marco47t` & `@MoatazAbdElmutaal`).
- [x] **Pre-Commit Security:** `scripts/check_secrets.py` blocks accidental token or private key commits.
- [ ] **API Layering Scaffold:** Directory hierarchy established (`routers/`, `schemas/`, `services/`, `repositories/`, `models/`).
- [ ] **Local Search / RAG Utility:** `scripts/search_codebase.py` initialized for instant symbol and bug lookups.
- [ ] **Bug Registry Directory:** `docs/bugs/` created with schema validation.
