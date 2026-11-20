# Backend development

Python 3.13, Django/DRF and PostgreSQL 16. Runtime dependencies remain pinned in
`requirements.txt`. Use an isolated environment; the host's default Python may
differ from the CI interpreter.

```sh
python3.13 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
export POSTGRES_DB=sudan_phones
export POSTGRES_USER=postgres
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5432
# Set POSTGRES_PASSWORD privately when required by your database.
.venv/bin/python backend/manage.py migrate --noinput
.venv/bin/python backend/manage.py runserver
```

Run these commands from the repository root. Without PostgreSQL configuration,
settings use local SQLite for convenience and PostgreSQL tests explicitly skip;
SQLite success does not certify PostgreSQL behavior. DATABASE_URL (PostgreSQL URL)
takes precedence over POSTGRES_* settings. Test databases require create/drop
permission on the isolated development/test server. CI runs an ephemeral PG16
service, applies migrations, verifies no pending model changes, and runs all backend
tests against PostgreSQL.

```sh
make check PYTHON=.venv/bin/python
make openapi PYTHON=.venv/bin/python
.venv/bin/python backend/manage.py makemigrations --check --dry-run
.venv/bin/python backend/manage.py migrate --check
```

Keep DJANGO_SECRET_KEY private; the built-in value is for local development only.
Set DJANGO_DEBUG=False and DJANGO_ALLOWED_HOSTS explicitly for a hosted environment;
this PR does not deploy a production service. MINIMUM_APP_VERSION controls the
public config minimum client version (default 1.0.0).

Backend through Step 6 implements the merchant verification, catalog, inventory,
public discovery and operations domains. See
[acceptance and coverage](../docs/plans/BACKEND_THROUGH_STEP6_ACCEPTANCE.md) and
[API catalog](../docs/api/CATALOG.md). No frontend changes or full joint gates are
claimed by backend tests.

Authentication uses Django server-side sessions and CSRF. Start with
GET /api/v1/auth/session, preserve cookies and send X-CSRFToken on unsafe requests;
login/registration rotate the CSRF token. Founder accounts are provisioned with
`backend/manage.py createsuperuser` (use a normalized phone as username for API
login). A staff flag alone does not grant marketplace privileges. Catalog brands,
models/specifications and variants are maintained in Django admin by authorized
founders; no fabricated production device dataset is bundled.

Configure these values privately; never put credentials in commands, PR text or chat:

| Purpose | Configuration |
| --- | --- |
| WhatsApp OTP | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION, WHATSAPP_OTP_TEMPLATE, WHATSAPP_TEMPLATE_LANGUAGE (ar default) |
| Email OTP | EMAIL_HOST, EMAIL_PORT (587 default), EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL; TLS enabled |
| R2 | R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PRIVATE_BUCKET, R2_PUBLIC_BUCKET, R2_PUBLIC_DOMAIN |
| Workers/cache | CELERY_BROKER_URL (Redis), REDIS_CACHE_URL for shared throttling |
| Trusted ingress | TRUSTED_PROXY_COUNT (0 default); only configure behind exclusively trusted proxies |
| Contact links | PUBLIC_LISTING_BASE_URL, the real client listing URL prefix |

WhatsApp requires a Meta-approved authentication template with code body and
copy-code URL button, and an operator-selected supported Graph API version. Email
uses SMTP; no console OTP backend or SMS is enabled. Account registration fails
closed if its provider fails. Email and phone verifications are independent.
OTP_DELIVERY_BACKEND is an explicit adapter hook for integration/test environments;
tests never deliver real customer messages.

Use separate private and public R2 buckets. Disable public access to the private
bucket; quarantine and verification originals/processed evidence belong there.
Only sanitized listing derivatives go to the public CDN. Configure upload CORS for
trusted client origins and private-bucket lifecycle expiry for quarantine objects
(one day). Uploads require matching content type/length and a server-validated
SHA-256. Size/image policies and retention are in [media contracts](../docs/api/media.md).

Start one Celery beat scheduler and workers from backend/ with the same environment:

```sh
cd backend
../.venv/bin/celery -A config worker --loglevel=WARNING --concurrency=1 --max-memory-per-child=512000
../.venv/bin/celery -A config beat --loglevel=WARNING
```

Run these as separate managed processes. Tasks poll committed queued media rows;
a broker restart cannot discard those rows. Set container memory/CPU limits in
addition to image bounds and task time limits. Manual bounded recovery command,
from repository root: `.venv/bin/python backend/manage.py process_media`.

Migrations core.0001..0011 add new domain tables, append-only audit triggers and a
nullable administrative actor IP column and submitted verification profile snapshots.
Review fixes add conditional verified-phone uniqueness, merchant-only moderation
feedback, bounded media retry scheduling, and pg_trgm brand/model search indexes.
The migration account needs CREATE privilege to install pg_trgm, or an operator
must preinstall the extension. PostgreSQL-specific indexes are skipped only for
the documented development SQLite fallback. Apply before starting new API/worker code.
Existing Django auth/session tables are retained; no destructive backfill runs.
Restoring the old globally unique phone constraint after provisional duplicate
claims exist is not a safe automatic rollback; use forward fixes or a reviewed
backup restore rather than deleting identities. Core rollback drops newly introduced data and is not a production recovery strategy
once onboarding starts. Prefer forward fixes/backups. Tests use disposable PG16
and do not manipulate an existing deployment.

Before enabling external onboarding: smoke-test both OTP channels, exact signed
PUT, private founder GET expiry, CDN output, real R2 private-bucket policy and CORS.
Configure real public links and shared Redis throttling for multiple API workers.
Local doubles do not certify provider delivery, staging latency or client rendering.

API changes require make openapi, API docs and live Slack contract synchronization.
Use scripts/sync_slack_api_contracts.py --sync; --prune explicitly removes unused
API proposals from the current contract List after preserving their planning docs.
Check with --check (or make api-check). Use an approved private --config path when
needed; never copy a token into the repository. GitHub/CI supplies supported PR and
CI Slack notifications; standalone notices need the Slack MCP connector.
