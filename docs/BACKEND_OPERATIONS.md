# Backend operations and local acceptance

The backend remains Django/DRF, Python 3.13, PostgreSQL 16, Redis/Celery and R2.
This delivery prepares deployment and tests it locally. It does not deploy a live
service or close joint/frontend gates. Real WhatsApp/email OTP delivery is deferred
by request; existing verification requirements remain enforced.

## Build and start

Docker Engine and Compose v2 are prerequisites. Copy `deploy/.env.example` to a
private absolute path outside the repository, chmod it 600 and supply a random
secret of at least 50 characters, explicit hosts and database password. Never print
`docker compose config` or `docker inspect` with secrets; `config --quiet` is safe.

```sh
export BACKEND_ENV_FILE=/absolute/private/backend.env
export BACKEND_TAG=reviewed-commit-sha
export BACKEND_PORT=8000
docker compose -f deploy/compose.yaml config --quiet
docker compose -f deploy/compose.yaml build api
docker compose -f deploy/compose.yaml up -d postgres redis
docker compose -f deploy/compose.yaml run --rm api python manage.py migrate --noinput
docker compose -f deploy/compose.yaml run --rm api python manage.py migrate --check
docker compose -f deploy/compose.yaml up -d api worker beat
docker compose -f deploy/compose.yaml exec -T api python manage.py check_runtime --worker
```

API binds only loopback. App containers run UID 10001 with a read-only filesystem,
resource limits, capability drop and a bounded temporary directory. Redis/PG have
no published ports. Start only one beat scheduler; media jobs remain durable in PG.
A Redis outage must not evict auth-throttle entries to make room for public caches;
the bundled Redis uses `noeviction`. Monitor memory and separate caches/broker hosts
when traffic requires it. Keep API/worker/beat on the same reviewed image tag.

The initial Compose DB is an administrator for **local acceptance**. Before hosted
use, provision separate application/migration/backup roles and configure app DB
credentials privately; use the migration role only for migration jobs. Preinstall
pg_trgm as an operator, grant table/sequence permissions and retain audit triggers.
Do not publish PG/Redis or use the local administrator for public application traffic.

For guest-only local HTTP smoke, set `DJANGO_SECURE_SSL_REDIRECT=False` in the private
local file and include localhost/127.0.0.1 in allowed hosts. This does not enable
browser session authentication over HTTP: secure cookies remain enabled. Use the
HTTPS test client suite for session/CSRF acceptance, or local TLS ingress. Restore
HTTPS redirection before external exposure.

## HTTPS, ingress and Django admin

Terminate TLS at the chosen host's managed ingress. Permit only expected Host
headers, cap API JSON bodies to 256 KiB, reject unknown origins and keep API responses
with `Cache-Control: no-store`. No wildcard CORS is configured. Prefer same-origin
routing for the web portal. A separate portal origin requires exact HTTPS CSRF and
CORS configuration plus cookie integration testing; it is not certified here.

Set `DJANGO_TRUST_PROXY_SSL=True` only behind exclusively trusted ingress that
**overwrites** client X-Forwarded-Proto. Set `TRUSTED_PROXY_COUNT` only after verifying
that ingress replaces X-Forwarded-For with the known chain. Keep the application
port unreachable from outside that ingress. Restrict `/admin/` to an operator VPN
or network allowlist; serve collected static assets through ingress/CDN.

```sh
docker compose -f deploy/compose.yaml cp api:/app/backend/staticfiles /private/artifacts/static
docker compose -f deploy/compose.yaml run --rm api python manage.py check --deploy
```

`collectstatic` runs at image build time. Publish the copied static artifact through
ingress/CDN; the running API filesystem stays read-only. HSTS defaults to zero
until the actual domain and TLS have been verified. Then set an initially small
`DJANGO_HSTS_SECONDS`; do not enable preload/includeSubdomains by guesswork.

## Provider acceptance (pending real R2 configuration)

Use distinct private/public R2 buckets. Disable public access to originals/evidence;
only processed product derivatives belong on the CDN. Configure private quarantine
expiry after one day and exact trusted-origin PUT/GET/HEAD CORS. Real configuration
is not supplied by local tests. References:
[Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/),
[Django deployment checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/).

```sh
docker compose -f deploy/compose.yaml exec -T api python manage.py smoke_storage --origin https://merchant.your-domain.example
```

The opt-in command uses unique smoke keys, verifies a signed PUT, private roundtrip,
anonymous denial, one-second signed GET expiry, exact-origin preflight and CDN bytes,
then deletes only those keys. It prints no credentials or signed URLs. Inspect
smoke-prefix cleanup privately if the command fails. Anonymous S3 API denial does
not prove an independently configured bucket/custom domain is private: verify
those R2 dashboard settings too. Do not enable real onboarding until this passes.

## Backups and disposable restore

Backups contain private identities/evidence references. Store them outside the
checkout in an owner-only directory on encrypted storage. Custom-format dumps are
written to a private temporary file and atomically published only after success;
existing files are never overwritten. The container's PostgreSQL client handles
authentication; never put passwords in command arguments.

```sh
python3 scripts/backend_backup.py backup --container sudan-backend-postgres-1 --database sudan_phones --file /private/backups/unique-timestamp.dump
python3 scripts/backend_backup.py restore-disposable --container sudan-backend-postgres-1 --database restore_drill_unique --file /private/backups/unique-timestamp.dump
```

Restore refuses existing databases and requires the `restore_drill_` prefix. On
restore failure, retain the isolated target for inspection; it never overwrites
the source. Verify migration count, representative row counts, relationships,
immutable audit enforcement and API behavior on the restored database before
removing the disposable target. Use a separately administered restore host for
production drills. Inspect backup job exit status; file existence alone proves
neither freshness nor restorability.

Schedule daily backups with the supplied systemd service/timer templates. Set the
container/database/output location via a private environment file with
`BACKUP_CONTAINER`, `BACKUP_DATABASE` and `BACKUP_DIRECTORY`. The dedicated host
user needs authorized Docker daemon access and ownership of the backup directory. Send systemd
failure events and backup-age (>26 hours) alerts through the chosen host's alert
service. Encrypt and copy dumps off-host; choose retention with the founders.
This repository does not invent a cloud account, retention policy or alert recipient.

Daily dumps are not PITR. Before production, configure managed PostgreSQL PITR or
base backups plus continuous WAL archiving, encrypted off-host storage and retention
covering the agreed recovery window. Test recovery to a timestamp *between* two
writes on an isolated target and verify the earlier write exists and later write
does not. Record recovered timestamp, elapsed recovery time and data-loss window.
No WAL archive/PITR service exists locally, so PITR acceptance remains pending.

## Monitoring and release/rollback

- External monitor: HTTPS `/api/v1/health` for API liveness; verify expected status,
  host/TLS and latency from outside ingress. It intentionally discloses no dependencies.
- Private probe: `check_runtime --worker` verifies PG, shared cache read/write,
  broker connection and worker ping. API Compose health runs the dependency portion;
  an external HTTP check is still required to detect stalled web workers.
- Alert on repeated 5xx, sustained p95 search latency above 500ms, unhealthy containers,
  missing worker ping, failed/old backups, Redis memory exhaustion and overdue queued
  media rows (e.g. >15 minutes). Configure actual recipients on the selected host.
- Gunicorn logs status/duration only, media jobs exception type only. Use request IDs
  for correlation. Never ship headers, cookies, bodies, OTPs, evidence URLs or raw
  provider responses to external error tracking. Enable a selected error service
  only after reviewing its redaction/access/retention settings.

Before a release: run CI/PG tests, migration/schema drift checks, provider smoke and
backup restore; build an immutable reviewed image and back up before migrations.
Apply migrations once before starting new API/workers; never race every replica's
startup through migrate. Stop/replace API and workers together. For rollback, use
the previously reviewed image only when schema-compatible. Prefer forward fixes;
do not reverse populated domain migrations or drop identities/audit data. No new
schema migration is introduced by this hardening work.

## Performance and cache contract

Redis stores only public brand ID/name pages and bounded home-ranking ID lists for
15 seconds. Candidate IDs are revalidated against current PG eligibility on each
request; current prices/stock/details are serialized from PG. Missing candidates
trigger live refill. New arrivals/ranking and brand edits may lag up to 15 seconds.
Search/details/contact paths are not payload-cached. No private evidence, sessions,
feedback or response headers enter this cache; public HTTP no-store stays intact.
Cache read/write outages fall back to database browsing. Authentication throttles
remain shared and fail closed on cache failure.

```sh
# Point only to an isolated PG16 server and dedicated disposable Redis cache.
python3 scripts/benchmark_backend.py --disposable --listings 10000 --runs 30 --output /private/local-benchmark.json
```

The command creates/drops a unique Django test database, seeds 100 stores and 10,000
synthetic listings with 20,000 media assets, exercises rendered HTTP API responses,
and captures EXPLAIN ANALYZE/BUFFERS for the representative filtered query.
It clears the configured cache; never point it at a shared/live cache. Reported
latencies exclude network, CDN/provider latency and concurrent load. See the
committed local benchmark artifact and PR for exact revision/results. Existing
indexes are retained unless measured query plans justify another migration.
