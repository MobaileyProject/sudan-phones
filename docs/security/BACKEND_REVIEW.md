# Backend security review: local hardening

Scope: accepted backend at 8fe4a94 plus this branch, Python/Django/DRF, API/service
boundaries, settings, storage and operational tooling. No frontend, external scan,
real OTP delivery, live ingress configuration or independent penetration test.

## Addressed findings

1. **High — unsupported framework series.** `backend/requirements.txt` pinned
   Django 5.1.15. Django's support table marks 5.1 unsupported. Pin 5.2.19 LTS,
   retain the selected Django 5 architecture and validate the complete PostgreSQL
   suite/schema/migrations. Source: https://www.djangoproject.com/download/.
2. **High if deployed with development defaults — missing hosted profile.**
   `backend/config/settings.py` intentionally defaults to local debug/SQLite/key.
   `config.production` now rejects debug, weak/missing secret, wildcard/empty hosts,
   non-PostgreSQL DB and missing shared Redis/broker; keeps secure session/CSRF
   cookies. Existing local defaults are not evidence of a vulnerable live server.
   `ProductionSettingsTests` verifies startup failures without secret echo.
3. **Low — avoidable public read coupling/round trips.** Public CDN serialization
   constructed authenticated S3 clients and repeated media queries. BUG-2026-020/021
   record reproductions and regression tests. Public URL generation now needs only
   the configured CDN domain; private/upload operations still validate credentials.

## Operation and access matrix

| Actor/action | Required result | Evidence |
| --- | --- | --- |
| Guest public discovery | Published, in-stock, media-ready listings of verified stores with active owners only | test_discovery; warm-cache test_public_performance |
| Guest/session mutation without CSRF | Denied, including login/register | test_identity_stores; explicit AuthView csrf_protect |
| Merchant A edits B's listing or evidence | Denied in service, no row/audit change | test_listings; test_verification_media; member_store scoped lookup |
| Revoked/suspended member | Privileged action denied after lock acquisition | test_concurrency; test_identity_stores |
| Moderator reads private evidence | Denied; founder-only signed links, no-store, bounded expiry | test_verification_media; verification.services.documents |
| Founder critical suspension/role deletion | Two distinct active founders and immutable audit | test_operations; test_concurrency |
| Public cache warmed before suspension | Fresh eligibility excludes store immediately; no private payload cached | test_public_performance |

## Controls inspected

- Service-owned transactions and ORM parameterized filtering; query fields/sort
  are allowlisted by serializers. No request-controlled raw SQL/command execution
  or dynamic template source found in backend domain code.
- Django password hashing/validation, hashed expiring OTPs, bounded failed attempts,
  current memberships/roles, retry keys and versioned mutations remain enforced.
- Session authentication uses same-site cookies and CSRF. Same-origin web deployment
  is the default; no permissive API CORS is introduced. Any later separate portal
  origin needs exact origin rules plus cookie/CSRF integration acceptance.
- R2 evidence/originals stay private; public derivatives are separate. Media decode,
  size/pixel bounds, immutable evidence, worker retries and publication gates have
  existing tests. Real R2 CORS/anonymous access/link expiry remain unverified.
- API errors omit traces and return request IDs. Gunicorn logs status/duration only,
  omitting paths/query strings/cookies; media tasks log exception type only.
- Containers use a nonroot app user, read-only filesystem, capability drop and
  CPU/memory limits. DB/Redis have no published host ports in the deployment file.

## Before external exposure

Verify real HTTPS, exact host rejection, trusted proxy overwrite rules, Django admin
network restriction, CDN/private bucket settings and monitored worker failures.
Use separate least-privilege application/migration/backup DB roles; the bundled
local Compose initializes PostgreSQL's administrator for local acceptance only.
Configure encrypted off-host backup storage and prove PITR against the chosen host.
Set HSTS only after domain/TLS validation; the initial zero setting is deliberate.
OTP provider setup is deferred by user request; no production bypass was added.

This is a scoped code review and local regression evidence, not joint release
sign-off. The external controls above cannot be certified without a target host.
