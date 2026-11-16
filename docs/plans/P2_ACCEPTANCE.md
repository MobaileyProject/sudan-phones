# P2 joint acceptance — INT-02 backend evidence

Scope of this delivery: remaining P2 **backend and joint backend checks only**.
BE-01 was delivered in merged PR #17. BE-02 implements the public bootstrap
contracts and shared conventions. Approval/merge of this PR accepts its backend
scope; it does not certify the unimplemented Flutter/React clients.

| Requirement | Evidence in this delivery | Full-gate status |
| --- | --- | --- |
| Django/DRF foundation | Merged PR #17; system checks and existing layer tests | Backend delivered |
| Public config/localization | API-019/API-021, Arabic/English HTTP and response/schema tests | Implemented; PR review pending |
| Liveness and error/contract conventions | API-061; HEAD/OPTIONS, errors, request IDs and cache tests | Implemented; PR review pending |
| PostgreSQL 16 migrations | Isolated local PG16 test run without skips; CI PG16 service and migration checks | Backend evidence; CI results in PR |
| Catalog/schema parity | Generated OpenAPI + exact current operation catalog; drift check in CI | Implemented; PR review pending |
| R2 bucket access | Configuration placeholders inherited from BE-01 | Live bucket connection unverified; no upload pipeline claimed |
| Flutter C-00 shell boots on Android/iOS | No client in this delivery | Pending frontend evidence |
| React responsive navigation shell boots | No client in this delivery | Pending frontend evidence |
| Both clients consume real config/bundles | Real local HTTP backend journey tested in both locales | Pending actual frontend integration |

**INT-02 / GATE-02 remains pending full acceptance.** Do not unlock P3 solely
because the backend PR passes. This is a dependency on frontend work and external
storage evidence, not a request to add frontend code to this PR.

## Reproducible backend checks

Use Python 3.13 and the pinned requirements as described in backend/README.md.
Set POSTGRES_DB, POSTGRES_USER, POSTGRES_HOST, POSTGRES_PORT and a private password
if required for your test database; then run:

```sh
make check PYTHON=.venv/bin/python
.venv/bin/python backend/manage.py makemigrations --check --dry-run
.venv/bin/python backend/manage.py migrate --noinput
.venv/bin/python backend/manage.py migrate --check
```

`BootstrapHttpAcceptanceTest` starts a real local HTTP server and exercises
config → bundle in both locales, invalid-locale JSON error handling, and liveness.
`P2BackendAcceptanceTest` verifies actual response bodies against generated schemas.
Neither test renders client screens or simulates a device reconnect.

## Frontend handoff and remaining joint work

Use docs/openapi.json and docs/api/bootstrap.md as the contract. For development,
React uses a same-origin Vite/reverse proxy; Flutter uses its configured API origin.
Load config first, then the selected bundle. Respect `direction`, display offline
copy from the last successful bundle, never cache errors, and branch on error codes.

Before accepting the full gate, attach Flutter Android/iOS boot evidence, React
shell build/navigation evidence, both clients calling the real endpoints, and the
remaining R2 configuration/connectivity evidence. Keep FE-00, C-00 and C-09 with
their frontend owner. No client task is marked complete by this backend delivery.

After merge, reconcile the Slack API catalog to the exact merged `operations.json`:
retain API-019 and API-021, add API-061, and remove the other 58 proposal rows from
the current catalog. All 60 original proposals remain in the planning archive.
