---
name: api-domain-workflow
description: "Use when adding or changing Django/DRF endpoints, serializers, domain services, or API contracts in Sudan Phones."
---

# API Domain Workflow

Read the task's screen ID, acceptance criteria and docs/ARCHITECTURE.md. Establish
what already exists before choosing dependencies or commands. This skill applies
the approved architecture; it does not authorize an application scaffold or a stack change.

## Procedure

1. Define caller, resource ownership, input constraints, response fields, error
   meanings and allowed state transitions. Surface missing business policy instead
   of inventing verification, inventory or appeal rules.
2. Map the domain slice across views, serializers, services and models:
   View: HTTP parsing, request/response, DRF permissions, error mapping.
   Serializer: DRF serializer validation and strict request/response shapes.
   Service: authorization, business rules and atomic transactions (`transaction.atomic()`).
   Model: Django ORM entities, field constraints and database indexes.
3. Test the behavior at its boundary: service authorization outside HTTP, invalid
   inputs, atomic writes/audit, rollback, public-field filtering, and HTTP error mapping.
   Use the real PostgreSQL test setup for database-specific behavior.
4. Keep persistence entities separate from public response serializers. Maintain
   store-scoped queries and verify cross-store access denials at the service boundary.
5. Run make openapi, review docs/openapi.json, update docs/api/<domain>.md and run
   make openapi-check plus the actual domain suite. A scaffold-pending skip proves
   no API behavior. The entrypoint is backend/manage.py once implemented.
6. Synchronize the live Slack API Contracts List (`F0CHJB5C939`): update existing rows
   or add missing rows with what the API does, stage/phase, how to use it, input formula
   (method, path, headers, query/body schema), output formula (status codes, JSON envelopes,
   headers), and set the status from Proposed to `Backend ready`. Run
   `python3 scripts/sync_slack_api_contracts.py --sync` (verified by `make api-check`).

## Example boundary

An approval request becomes a service command with the authenticated reviewer,
store ID and validated decision; that service commits the decision and audit event
atomically. The view never queries or mutates the store directly.

Deliver changed files, contract changes, test evidence and unresolved policy.
Reference: [architecture](../../../docs/ARCHITECTURE.md),
[Django REST Framework](https://www.django-rest-framework.org/).

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
