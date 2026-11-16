# Proposed transition to the diagram stack

User direction, 2026-11-16: use the diagram stack and propose repository changes.
Rasheed (@marco47t) owns backend; Moataz (@MoatazAbdElmutaal) owns frontend.
This is a reviewed-change proposal, not a claim that the new application exists.
The existing Slack runtime and context PRs #9/#10 are separate work.

## Selected application direction

- Django REST Framework backend and PostgreSQL; retain Python 3.13/PostgreSQL 16
  as targets pending actual dependency/runtime verification in the foundation task.
- Django ORM and Django migrations replace SQLAlchemy/Alembic for the future app.
  Preserve service-owned transaction boundaries and domain authorization; adapt them
  to Django atomic transactions, serializers, views and store-scoped queries.
- Flutter customer app; React merchant and founder administration surfaces.
- Object storage compatible with the diagram's R2 architecture; Redis/Celery jobs
  when the approved media pipeline needs them. Validate availability for the pilot.
- Preserve verified-store publication gates, private verification evidence, separate
  new-stock quantities/used units, auditability, Arabic/RTL and weak-network behavior.

## Required follow-up change set before application tasks become Ready

| Existing contract | Proposed change | Evidence required |
| --- | --- | --- |
| AGENTS.md, docs/PRODUCT.md, docs/ARCHITECTURE.md | Replace FastAPI/Kotlin-specific architecture with the selected stack; preserve general review/security/domain rules | Reviewed coherent operating contract, no contradictory defaults |
| scripts/export_openapi.py and tests/test_workspace_tools.py | Replace FastAPI app loading with a deterministic Django/DRF export from the chosen schema generator | Export actual registered endpoints without live secrets/DB; drift and incomplete-scaffold regressions |
| Makefile and .github/workflows/ci.yml | Add real backend/client dependency/build checks when each scaffold exists | Clean-runner Django checks, migrations/tests, Flutter/React checks; explicit prereq skips before scaffolding |
| .agents/skills/api-domain-workflow, inventory-transactions, migration-safety, store-authorization, secure-media-workflow, supabase-postgres-best-practices | Review adapters for Pydantic/SQLAlchemy/Alembic assumptions; adapt only relevant project guidance | make skills-check; deliberate provenance/hash changes if vendored payloads change |
| .agents/skills/navigation-3 and testing-setup | Retain historical packages if useful, but remove them from required Flutter task triggers | No Kotlin/Compose work auto-selected for Flutter; scoped Flutter test workflow agreed |
| docs/SKILLS.md and skill manifest | Reflect the chosen client/backend triggers | Discovery/integrity checks pass; do not fabricate upstream provenance |
| Proposed API catalog | Agree request/response/error schemas and ownership before FE/BE implementation | Contract review and fixtures; no placeholder docs/openapi.json |

This proposal does not install dependencies, rewrite skills, scaffold an app, change
permissions, deploy services or edit private worker configuration. Those changes
belong to the scoped foundation tasks after personal review. Do not treat a queued
blueprint task as permission to rewrite operating contracts or worker security.

## Publication policy still to agree

SCOPE-01 must state what moves pending inventory to published: eligible-store/media
readiness automatically, or a separately agreed manual approval action. The source
moderation screen specifies remove/suspend/restore; this proposal does not invent
an approve action for that endpoint. P4 tests the agreed publication pipeline and
moderation/merchant status; P5 tests actual public-search visibility after moderation.

## Completion gate

The transition is complete only when its concrete contract/tooling PR is merged,
Django/DRF and client scaffolds have real checks, required skills match the stack,
and both founders can develop against the agreed API contract. Until then the
blueprint is planning data; no imported feature is automatically Ready for agy.
