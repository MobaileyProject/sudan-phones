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

R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and
R2_PUBLIC_DOMAIN are existing configuration placeholders. No R2 client, upload
pipeline or live bucket connectivity is claimed in P2. Redis/Celery processing and
listing/verification models arrive in their scoped phases. No new migration is
needed for read-only config/localization.

Code is split by domain: `core/bootstrap/services.py` owns public metadata and
translation resources; serializers define the boundary; views handle HTTP;
`core/errors.py` and middleware implement shared conventions. Existing model/domain
transaction helpers remain available for later persistent features. See
[API contracts](../docs/api/bootstrap.md) and [P2 acceptance](../docs/plans/P2_ACCEPTANCE.md).
