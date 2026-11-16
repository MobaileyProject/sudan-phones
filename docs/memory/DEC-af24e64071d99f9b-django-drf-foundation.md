+++
id = "DEC-af24e64071d99f9b"
title = "Adopt Django REST Framework foundation, PostgreSQL 16 baseline and OpenAPI tooling"
created = "2026-11-16"
topic = "django-drf-foundation"
paths = ["backend/", "docs/ARCHITECTURE.md", "scripts/export_openapi.py", ".agents/skills/"]
refs = ["file:docs/plans/STACK_TRANSITION.md", "file:docs/plans/ORDERED_STEP_BY_STEP_PLAN.md"]
+++
BE-01 implementation establishes the confirmed backend architecture (SPEC-SCOPE-01):

1. **Django REST Framework Foundation:**
   - Scaffolded `backend/` (`config/settings.py`, `manage.py`, `core/`).
   - Pinned dependencies in `backend/requirements.txt` (Django 5.1.15, DRF 3.17.2, drf-spectacular 0.30.0, psycopg 3.3.9).
   - Configured Arabic first (`ar`) and `Africa/Khartoum` timezone.
   - Enforced layer boundaries (`views -> serializers -> services -> models`).

2. **PostgreSQL 16 & Migrations:**
   - Configured PostgreSQL 16 connection via `POSTGRES_DB` or `DATABASE_URL`.
   - Verified migrations and tests against PostgreSQL 16.
   - Clean prerequisite reporting when PostgreSQL environment is absent.

3. **OpenAPI Tooling:**
   - Configured `drf-spectacular` schema generator.
   - Adapted `scripts/export_openapi.py` to export `docs/openapi.json` without production secrets.
   - Contract drift checks enforced via `make openapi-check`.

4. **Task Skills Alignment:**
   - Aligned `api-domain-workflow`, `migration-safety`, `inventory-transactions`, and `supabase-postgres-best-practices` with Django/DRF patterns.
   - Updated `docs/ARCHITECTURE.md` and `docs/SKILLS.md`. All 14 skills validated.
