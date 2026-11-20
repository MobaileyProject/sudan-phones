# Merchant and founder operations — BE-10 / M-05, M-11, C-05, A-01, A-06, A-07

| API | Method / path | Caller/result |
| --- | --- | --- |
| API-032 | GET /api/v1/stores/me/dashboard | Verified store member; listing/stock/view/lead aggregates |
| API-024 | GET /api/v1/listings/{id}/contact-methods | Guest; verified contact links for visible offer |
| API-064 | POST /api/v1/listings/{id}/contact-events | Guest; retry-safe contact intent count |
| API-009 | GET /api/v1/admin/overview | view_metrics permission; platform aggregates |
| API-010 | GET /api/v1/admin/roles | Founder; role definitions, assignments, allowed permissions |
| API-045 | POST /api/v1/admin/roles | Founder; create/update and optionally assign a custom role |
| API-001 | DELETE /api/v1/admin/roles/{id} | Founder; 202 pending dual approval |
| API-006 | GET /api/v1/admin/audit-events | view_audit permission; append-only audit search |
| API-065 | GET /api/v1/admin/dual-approvals | Founder; pending destructive operations |
| API-043 | POST /api/v1/admin/dual-approvals/{id}/decision | Distinct active founder approves/rejects |

Contact GET is side-effect free and returns phone_url (`tel:+249...`) and
whatsapp_url (`https://wa.me/249...?text=...`) with encoded model, condition, SDG
price and configured public listing link. When contact is actually selected,
POST `{"event_id":"<fresh-uuid>","method":"whatsapp"}` (or phone). Retain this
per-action event_id after timeout: retries increment once; changed listing/method
with the same ID conflicts (409). This counts contact intent, not confirmation
that a WhatsApp message/call was delivered. No guest IP/name/phone/cookie is stored.
Both APIs apply current public eligibility, including after suspension.

Dashboard returns active_listings, out_of_stock, views and contact_leads. Overview
adds stores, verified_stores, pending_verifications, daily_searches. Counts are
aggregate requests/intents, not unique customers. Search day follows Africa/Khartoum.
PUBLIC_LISTING_BASE_URL must be configured to the real customer listing route.

Custom role permissions are verify_stores, moderate_listings, view_audit,
view_metrics. Example create:
`{"name":"Listings moderator","permissions":["moderate_listings"],"user_ids":[7]}`.
201 returns id/name/permissions/version/user_ids. Update adds id and expected version
(200); stale version is 409. Supplying user_ids replaces this role's assignments;
omitting it preserves assignments. A user holds one custom admin role. Only active
existing non-founder users may be assigned. Invalid permissions/users are 400,
name conflicts are 409. Staff flag alone grants no marketplace power. Custom roles
cannot create/grant/delete roles or confirm dual approvals. Founders are provisioned
out-of-band with Django createsuperuser; APIs cannot grant superuser status.

Destructive operations requiring two founders: store suspension and custom role
deletion/revocation. API-044 suspend_store/API-001 produce a pending proposal;
API-065 lists proposals. Decision body: `{"decision":"approve","version":1}`
(or reject). The requester cannot decide; both must remain active superusers.
Target version/state is rechecked, so intervening edits cause 409 STALE_TARGET.
Decisions are single-use/versioned; repeats return 409 and never execute twice.
Approval atomically suspends the store (immediately excluding all public inventory)
or deletes the role/assignments, and writes immutable audit. Rejection has no target
side effect. Reversible listing removals and verification decisions follow their
single-reviewer scope policies; no implicit privilege escalation is allowed.

Audit query: action, actor_id, resource plus limit 1..100/offset 0..10000. Stable
newest-ID order. Critical changes record actor, action, resource, metadata and time;
admin request addresses are recorded only for administrative actions, never guest
browsing. Database triggers reject UPDATE/DELETE even through QuerySet/raw SQL.
Application users cannot mutate audit records. Queue/role lists use bounded
limit/offset. Response/error field definitions are in [OpenAPI](../openapi.json).
All protected APIs require session and CSRF on unsafe methods; all are no-store.

Validation: core.tests.test_operations and PostgreSQL audit/tenant tests.
