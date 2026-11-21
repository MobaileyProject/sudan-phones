# Step 7 Backend Hardening Acceptance and Verification

Accepted starting point: `8fe4a94` (merged backend through Step 6).
This delivery covers the backend scope of **Step 7 (Phase 7: Testing, Hardening & Security)** and deployment preparation (`BE-12`). Frontend source code and joint gates remain untouched.

## Delivered Backend Behavior

| Task / Domain | Delivered Behavior | Verification Evidence |
| --- | --- | --- |
| **Security & Production Baseline** | `config.production` enforces strict settings: fails closed if missing `SECRET_KEY`, rejects wildcard/empty hosts, rejects SQLite, requires PostgreSQL, requires shared Redis, enforces secure cookies and CSRF. Upgraded Django from 5.1 to 5.2.19 LTS. Scoped OWASP Top 10 security review. | `test_production.py` (all fail-closed tests pass), `docs/security/BACKEND_REVIEW.md` |
| **Public Performance & Safe Caching** | Redis caching for public catalog fragments (`/brands`) and home ranking IDs (`/home`) with 15s TTL. Zero private/session data cached. Live recheck of store suspension, active owner, and stock on every request with immediate live refill. | `test_public_performance.py`, `DEC-3c0483aa01ee2991` |
| **Media Serialization & Query Bounding** | Resolved `BUG-2026-020` (reused prefetched media in `listing_data` to eliminate N+1 queries) and `BUG-2026-021` (lazy S3 client initialization for CDN URLs). | `test_public_performance.py`, `BUG-2026-020.json`/`.md`, `BUG-2026-021.json`/`.md` |
| **Scale & Latency Benchmarks** | Benchmarked 10,000 listings, 20,000 assets, 100 stores on PostgreSQL 16 under realistic composite multi-filtering and serialization. | `scripts/benchmark_backend.py`, `/tmp/hardening-benchmark.log` (filtered search p50: 90ms, p95: 192ms; home p50: 19ms; brands p50: 0.69ms) |
| **Operational Tooling & Backups** | Non-root container (`backend/Dockerfile`), Compose v2 setup (`deploy/compose.yaml`), runtime health command (`check_runtime`), storage smoke command (`smoke_storage`), atomic custom-format PostgreSQL backup tool with failure cleanup (`scripts/backend_backup.py`, `tests/test_backend_backup.py`), and systemd timer templates. | `test_runtime_commands.py`, `test_backend_backup.py`, `docs/BACKEND_OPERATIONS.md` |

## Verification Results

Verification executed on Python 3.13.18, PostgreSQL 16.0, and Redis:
- `make check PYTHON=/tmp/sudan-phones-hardening-venv/bin/python`:
  - 142 tool tests passed.
  - 88 backend tests passed (including all production, performance, runtime command, and backup tests).
  - Secret scanning passed (`check_secrets.py`).
  - OpenAPI generation and drift check passed (`export_openapi.py --check`).
  - Catalog check passed (`export_api_catalog.py --check`).
  - Context lint passed (18 records, 0 errors, 0 conflicts).
  - Migration check passed with zero pending migrations.
- Docker Compose build and runtime check:
  - Non-root API container built and executed.
  - Gunicorn application server started and passed health check.
  - Celery worker and beat daemonized against Redis.

## Remaining External Acceptance

1. **External WhatsApp Cloud API:** Real credentials and Meta-approved authentication template required for live OTP delivery to Sudanese numbers (`+249`).
2. **External SMTP:** Production mail server credentials for fallback OTP.
3. **Cloudflare R2 Storage:** Real private and public buckets, CORS rules, and CDN domain configuration.
4. **Ingress TLS:** Production host reverse proxy with TLS termination, IP rate limiting, and exact CORS allowlisting.

See [HND-6674b8de36efe728](file:///mnt/3AFCC56CFCC522CD/sudan-phones-codex-backend-hardening/docs/memory/HND-6674b8de36efe728-backend-hardening-external-acceptance.md) and [BACKEND_OPERATIONS.md](file:///mnt/3AFCC56CFCC522CD/sudan-phones-codex-backend-hardening/docs/BACKEND_OPERATIONS.md).
