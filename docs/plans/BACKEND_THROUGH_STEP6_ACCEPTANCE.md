# Backend through Step 6 acceptance and coverage

Accepted starting point: e1c2f1d (merged BE-01/BE-02 and city configuration).
This delivery covers backend work through Step 6 only. Frontend source is untouched.
New BE-03..10 master-plan checkboxes remain pending personal review/merge; full
INT-02..06 and GATE-02..06 remain pending frontend and external-service evidence.

| Plan task | Delivered backend behavior | Boundary evidence |
| --- | --- | --- |
| BE-01 | Existing Django/DRF/PG16 foundation preserved | foundation/database/schema tests |
| BE-02 | Existing config/localization/errors/city aliases preserved | bootstrap/P2 HTTP and acceptance tests |
| BE-03 | Optional buyer/merchant registration, session/CSRF login/logout, WhatsApp/email OTP verification and recovery | test_identity_stores, test_delivery_workers |
| BE-04 | Owner store, membership, profile/settings, add/remove staff, tenant boundaries | test_identity_stores |
| BE-05 | Private evidence uploads, immutable evidence snapshots, founder queue/detail/links/decisions and audit | test_verification_media |
| BE-06 | Public/merchant brands, phones category, models/specifications, unique storage/RAM/color variants | test_listings, test_backend_journey |
| BE-07 | New/used invariants, inventory/status/edit, versioned prices/stock, price history, durable retries, founder moderation | test_listings, test_concurrency |
| BE-08 | R2 presigned quarantine uploads, completion, durable Celery polling, bounded decode/sanitization/thumbnails and publication | test_verification_media, test_backend_journey |
| BE-09 | Guest home/search/details/related/exact-variant offers/featured stores/store profile/inventory, central visibility | test_discovery |
| BE-10 | Contact links/events, merchant/admin metrics, granular admin roles/assignments, immutable audit, two-founder decisions | test_operations |

The generated catalog contains all **50 planned operations through Step 6**
(including the two existing BE-02 operations) and five supporting operations:
API-061 liveness, API-062 session/CSRF bootstrap, API-063 upload completion,
API-064 retry-safe contact intent, API-065 pending dual approvals. Deferred BE-11
operations and Step 7/8 delivery work are not fabricated as implemented APIs.

The signed scope controls automatic publication after validation and verified
store eligibility. Founder moderation happens afterward. Backend continuation is
explicitly requested by the user; it does not certify joint release gates.

## Verification

Use Python 3.13 and disposable PostgreSQL 16, not SQLite as concurrency evidence.
The complete backend suite includes independent-connection simultaneous duplicate
creation and conflicting versioned stock edits. Boundary doubles replace only
WhatsApp delivery and object storage; database/services/image decode are real.
The HTTP journey covers signup -> OTP -> store profile -> evidence upload/decode ->
founder approval -> new/used upload -> automatic publication -> filtered search ->
variant comparison -> seller contact -> dashboard/audit, without frontend claims.

Commands used (final counts/results are recorded in the PR):

- `POSTGRES_DB=step6 POSTGRES_USER=postgres POSTGRES_PORT=<isolated-port> python backend/manage.py test core --noinput`
- `make check PYTHON=<Python-3.13-venv>/bin/python` with the same PostgreSQL environment
- `python backend/manage.py spectacular --validate --format openapi-json --file <temporary-path>`
- `make openapi` and `make openapi-check` with the pinned backend environment
- `python backend/manage.py makemigrations --check --dry-run`
- `python backend/manage.py migrate --noinput` and `migrate --check`
- `python scripts/ctx.py lint` and secret scan after staging
- `python scripts/sync_slack_api_contracts.py --sync --prune --config <approved-private-config>`
- `python scripts/sync_slack_api_contracts.py --check --config <approved-private-config>`

Migrations were also exercised after an auth-only baseline with a pre-existing
Django user. Upgrade preserved that user. Disposable rollback of core.0006/0005
then reapplication verifies reversible nullable-column/trigger operations. This is
not evidence that dropping populated core domain tables is safe in production.

## Remaining external acceptance

Configure and smoke-test real WhatsApp authentication templates, SMTP delivery,
R2 private/public policies, signed upload/download expiry, CDN output and browser
CORS. Configure the real PUBLIC_LISTING_BASE_URL, shared Redis throttle cache and
managed worker/beat processes with resource limits. Live delivery/storage secrets
were not supplied or printed. Functional local tests do not certify <500ms at
production scale; staging dataset benchmarks remain required.

The user selected WhatsApp and email, with no SMS, and delegated image limits.
Supported uploads are image scans/photos; PDF is rejected. Business identity is
locked while under review/verified, preventing unreviewed contact/location changes.
An explicit post-approval re-verification workflow remains future work.

Slack API-contract rows are synchronized via the existing repository integration;
standalone milestone messages cannot use Slack MCP in this session. The existing
GitHub Slack app/CI handles supported PR/CI events. Remaining provider/client and
standalone-notification work is captured in HND-4e1d8bff30a0edbb. No existing context
records are closed, edited or deleted by this PR.

## Independent review fixes

The read-only review of 63da7d7 identified eight issues, reproduced by named
regressions in BUG-2026-011..018. A follow-up authorization audit reproduced and
fixed the analogous delegated-role revocation race in BUG-2026-019. Corrections enforce founder-only private document
links; prevent missing uploads from starving the worker; recheck membership after
store-lock waits; keep unproved phone claims provisional; reflect current staff
membership in sessions; deliver merchant-only moderation feedback; match combined
brand/model terms with PostgreSQL trigram index support; and ignore untrusted
forwarding headers for login throttling. Supplemental tests cover two existing
session jars after recovery, competing phone proofs and transient retry exhaustion.

Deferred minor performance work: avoid per-listing R2 client construction for CDN
URLs and redundant media queries on public listing serialization. The current
implementation remains functionally correct; those optimizations and realistic
latency measurements belong to Step 7. No <500ms production claim is made.

Final local verification after review corrections: `make check` passed 140 tool
and 76 backend tests on Python 3.13/PostgreSQL 16, with no backend skips. All nine
authorization/logic regressions were observed failing before their corrections
and passing afterward. OpenAPI validation/drift, migration upgrade through 0011,
no pending models, staged secret scanning and bug JSON validation passed. A
separate temporary SQLite database applied the development fallback migrations.
A forced-index compatibility EXPLAIN uses brand_name_trgm; this is not a latency
benchmark. Header/authorization schema metadata was validated again after the suite.
