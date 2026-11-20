# Backend through Step 6 execution checklist

Implements the backend portions of ORDERED_STEP_BY_STEP_PLAN.md, from accepted
base e1c2f1d, under SPEC-SCOPE-01. User explicitly authorizes backend work through
Step 6; frontend and joint gates remain untouched. This is an execution breakdown
of the existing approved plan, not a replacement product scope.

1. BE-03/04: session/CSRF authentication, WhatsApp/email OTP, registration/recovery,
   trusted membership, owner-only profile/staff/settings. Boundary tests:
   `core.tests.test_identity_stores`.
2. BE-05/08: private evidence upload, validation, immutable evidence snapshot,
   founder queue/detail/documents/decisions; shared R2 media pipeline. Boundary tests:
   `core.tests.test_verification_media`.
3. BE-06/07/08: catalog/variants, new/used invariants, media readiness, automatic
   publication, merchant CRUD/status, price history, stale-version protection,
   durable idempotency, founder moderation. Tests: `core.tests.test_listings` and
   real PostgreSQL concurrency tests.
4. BE-09: guest home/search/detail/related/variant offers/featured stores/store
   detail/inventory; centralized public eligibility, pagination, filters, SDG.
   Tests: `core.tests.test_discovery`.
5. BE-10: contact methods and aggregate counters, merchant/admin metrics, scoped
   admin roles and assignments, immutable audit, distinct-founder dual approval.
   Tests: `core.tests.test_operations`.
6. Cross-domain integration, schema/catalog/docs, migrations fresh/upgrade checks,
   make check, secrets after staging, fresh review, push/PR/CI/Slack contracts.

For each task: write boundary tests, observe missing behavior, implement in domain
layers, run domain tests and core suite, then commit intended files only. Services
own transactions and authorization; views never query ORM. Explicit DRF serializers
allowlist input and public output. Preserve existing dependencies and bootstrap APIs.

Interfaces: identity Account and Store/Membership authorize all later domains;
MediaAsset ready state gates Verification and Listing publication; catalog Variant
identifies offers; listing visibility is shared by discovery, contact and metrics;
AuditEvent is append-only and is written atomically with critical mutations.

Review focus: private media leakage; spoofed roles/foreign resources; concurrent
retries/stale absolute stock updates; delayed media after suspension/removal;
OTP attempt persistence/channel confusion/session invalidation after recovery.

Implementation choices delegated by user: WhatsApp/email only, no SMS. JPEG/PNG/WebP
images and document scans; 8 MiB listing images, 10 MiB evidence scans, 24 MP decoded
limit. No PDF ingestion in this delivery. Private evidence links expire in 15 minutes.
External provider credentials and real delivery/R2 smoke checks remain deployment
prerequisites; automated tests use boundary doubles, not live customer messages.
