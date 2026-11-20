# Backend hardening implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Complete locally testable Step 7 backend hardening and Step 8 operational preparation, excluding real OTP delivery and frontend work.

**Architecture:** Retain Django/DRF, Python 3.13, PostgreSQL 16, Redis/Celery and R2. Use production settings and a container deployment with explicit migrations, isolated services and backup tooling. Cache public catalog fragments and home ranking IDs only; reread listing eligibility, price and media from PostgreSQL on every request. Never cache private documents or session responses.

**Spec:** User-approved five-step backend continuation in this conversation; user explicitly requests local testing and defers WhatsApp/email OTP delivery. Existing scope and backend contracts remain authoritative.

**Tech Stack:** Django 5.2 LTS (upgrade from unsupported 5.1), DRF, Gunicorn, PostgreSQL 16, Redis, Celery, Docker Compose.

## Global constraints

- No frontend, OTP bypass, live service deployment or fabricated provider acceptance.
- Preserve all existing API shapes, 55 implemented operations and joint acceptance gates.
- External R2 acceptance remains pending without credentials; provide an opt-in smoke command and documented procedure.
- Home ranking/new arrivals and brand names may lag at most 15 seconds; eligibility and listing fields always come from live queries. Refill home sections when cached candidates become ineligible. Cache failures fall back to database reads; auth throttling remains fail closed.
- Test on a disposable PostgreSQL 16 database and Redis instance; never manipulate another session's runtime.

## Review focus

- Warm home cache must hide suspended stores, removed/zero-stock listings, inactive owners and failed media immediately.
- Cached ordering must not retain private data; TTL bounds new inventory/ranking freshness.
- Unsafe production configuration fails startup; proxy headers are trusted only by explicit configuration.
- Backup failure leaves no successful-looking dump; restore operates only on a fresh disposable database.
- Missing real provider configuration remains explicit, with no OTP bypass.

## Task 1: Production/security baseline

Files: backend/config/production.py, backend/core/tests/test_production.py, backend/requirements.txt, docs/security/BACKEND_REVIEW.md.
Interface: DJANGO_SETTINGS_MODULE=config.production; strict hosts, secret, PostgreSQL, shared Redis, proxy trust and secure cookies. No new endpoint.

- [x] Test production startup rejects missing secret, wildcard hosts, SQLite and missing shared Redis; verify CSRF/session and HTTPS protections.
- [x] Observe failing tests; implement strict settings and supported Django/Gunicorn pins.
- [x] Run production tests and the existing backend suite on PG16; document scoped security review evidence.

## Task 2: Public performance and safe caching

Files: backend/core/listings/services.py, backend/core/media/storage.py, backend/core/discovery/services.py, backend/core/catalog/services.py, backend/core/common/public_cache.py, backend/core/tests/test_public_performance.py.
Interfaces: listing_data(listing) reuses prefetched ordered media; R2Storage.client initializes lazily; cached(key, producer) returns public primitives with a 15 second TTL and read fallback.

- [x] Add failing tests for bounded page query count and CDN serialization without S3 construction.
- [x] Add cache reuse/failure tests, warm-cache eligibility tests and live price tests; verify bounded cache expiry.
- [x] Implement minimal fixes and caching. Run discovery/listing/journey/authorization suites.
- [x] Benchmark 10,000 synthetic listings on disposable PG16, with HTTP serialization and query counts; capture EXPLAIN ANALYZE/BUFFERS. Add indexes only if measurements justify them.

## Task 3: Local operational acceptance

Files: backend/Dockerfile, backend/gunicorn.conf.py, deploy/compose.yaml, deploy/.env.example, scripts/backend_backup.py, backend/core/management/commands/check_runtime.py, backend/core/management/commands/smoke_storage.py, docs/BACKEND_OPERATIONS.md, tests/test_backend_backup.py.
Interfaces: Compose services api/worker/beat/postgres/redis, explicit migrate command; runtime command checks DB/cache/broker; storage smoke uses unique isolated keys and deletes only those keys; backup is an atomic private custom-format dump.

- [x] Test backup failure cleanup and destination collision handling before implementation; add command validation tests.
- [x] Build/run nonroot container, apply/check migrations, run API smoke and real worker/beat/Redis checks.
- [x] Create a backup and restore into a fresh disposable PG16 database; compare domain rows and immutable audit enforcement.
- [x] Document daily backup scheduling, off-host encryption, PITR setup/restore drill, alerting and rollback. Mark unperformed external/PITR acceptance explicitly.
- [x] Regenerate/check OpenAPI, sync/check Slack contracts, run make check, context lint and staged secret scan.
- [x] Review whole diff, commit/push branch, open PR, monitor CI; retain personal review/merge gate.
