---
name: api-domain-workflow
description: "Use when adding or changing FastAPI endpoints, Pydantic schemas, domain services, or API contracts in Sudan Phones."
---

# API Domain Workflow

Read the task's screen ID, acceptance criteria and docs/ARCHITECTURE.md. Establish
what already exists before choosing dependencies or commands. This skill applies
the approved architecture; it does not authorize an application scaffold or a stack change.

## Procedure

1. Define caller, resource ownership, input constraints, response fields, error
   meanings and allowed state transitions. Surface missing business policy instead
   of inventing verification, inventory or appeal rules.
2. Map the smallest domain slice across backend/app/routers, schemas, services,
   repositories and models. Router: HTTP/DI/error mapping. Schema: explicit Pydantic
   validation/serialization. Service: authorization, business rules and transaction.
   Repository: SQLAlchemy 2 queries without HTTP errors or commits. Model: constraints.
3. Test the behavior at its boundary: service authorization outside HTTP, invalid
   inputs, atomic writes/audit, rollback, public-field filtering, and HTTP error mapping.
   Use the real PostgreSQL test setup for database-specific behavior.
4. Use Annotated dependencies where appropriate; choose sync/async from actual I/O
   dependencies. Do not run blocking calls inside async endpoints. Keep persistence
   entities separate from public response models. Retain SQLAlchemy; do not substitute
   SQLModel merely because a framework guide recommends it.
5. Run make openapi, review docs/openapi.json, update docs/api/<domain>.md and run
   make openapi-check plus the actual domain suite. A scaffold-pending skip proves
   no API behavior. The entrypoint is backend/app/main.py:app once implemented.

## Example boundary

An approval request becomes a service command with the authenticated reviewer,
store ID and validated decision; that service commits the decision and audit event
atomically. The router never queries the store directly.

Deliver changed files, contract changes, test evidence and unresolved policy.
Reference: [architecture](../../../docs/ARCHITECTURE.md),
[FastAPI dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/).

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
