# Catalog and inventory — BE-06/07 / M-06..10, M-13, A-05, C-10

| API | Method / path | Behavior |
| --- | --- | --- |
| API-014 | GET /api/v1/brands | Public phone brands |
| API-018 | GET /api/v1/categories | Public phones category; accessories remain outside MVP |
| API-015 | GET /api/v1/catalog/brands | Verified merchant selector |
| API-016 | GET /api/v1/catalog/models | Verified merchant; optional brand_id |
| API-017 | GET /api/v1/catalog/variants | Verified merchant; optional model_id |
| API-054 | POST /api/v1/stores/me/listings | Verified owner/staff; 201 retry-safe creation |
| API-033 | GET /api/v1/stores/me/listings | Own inventory including processing/removed items |
| API-034 | GET /api/v1/stores/me/listings/{id}/status | Own listing and media processing status |
| API-038 | PATCH /api/v1/stores/me/listings/{id} | Own condition details/warranty/media replacement |
| API-039 | PATCH /api/v1/stores/me/listings/{id}/price | Absolute SDG price and immutable history entry |
| API-040 | PATCH /api/v1/stores/me/listings/{id}/stock | Absolute stock with optimistic version |
| API-008 | GET /api/v1/admin/moderation/queue | moderate_listings permission; live pending/flagged items |
| API-044 | POST /api/v1/admin/listings/{id}/moderate | Scoped reviewer; approve/flag/remove/restore/suspend_store |

All list selectors support limit 1..100 (default 20), offset 0..10000 (default 0),
stable ID ordering. Catalog models include JSON specifications; variants have
storage_gb, ram_gb and color with unique model/storage/RAM/color. Founders maintain
catalog through Django admin; there is no fabricated external phone dataset.

Create body example (real variant/media IDs required):
`{"variant_id":1,"condition":"new","price":"500000.00","quantity":3,"warranty_months":12,"is_sealed":true,"media":["<seal-uuid>"]}`.
New stock requires sealed packaging and warranty_months, grade=new, battery=100,
no defects/used warranty. Used items require quantity=1, grade in like_new,
excellent, good, fair, explicit battery_health (50..100 or null), defects string,
warranty_days, has_original_box and separate front/back/powered-screen real photos.
A used unit can be marked sold with stock=0; it can never have stock>1. New stock
may be set to zero. All stock must be <=1,000,000. Price is strictly positive SDG
Decimal with two fractional digits, at most 12 integer digits; no float arithmetic.

Create/update APIs require a UUID Idempotency-Key header. Preserve the key and exact
body after timeout. Keys are durable, scoped to actor/store/operation/resource and
retained without automatic expiry. Identical retries return the original snapshot,
including original version; changed payload returns 409 IDEMPOTENCY_CONFLICT.
Updates require version: `{"version":1,"quantity":0}` or
`{"version":2,"price":"510000.00"}`. Concurrent stale edits return 409
STALE_VERSION; store/row locks make mutation, history, audit and replay result atomic.
No payments, reservations, decrement sales or checkout are invented.

Automatic publication requires verified store and every referenced image ready.
While awaiting images, status=processing. Ready images trigger published immediately;
manual founder approval is post-publication oversight per the signed scope.
Price/stock edits never restore removed listings. Replacing media on an active
listing returns to processing and pending moderation until validation completes.
Foreign/private/reused/failed media IDs are denied. Suspended/rejected merchants
cannot operate inventory; direct foreign listing IDs return 404 or an earlier 403.

Moderation body: `{"action":"remove","version":1,"reason":"Wrong device"}`.
Approve clears the live queue and merchant feedback; flag retains visibility and
marks flagged. Flag/remove reasons are returned only in merchant/admin feedback;
guest responses omit them. A merchant amendment to a flagged listing returns it to
pending review while retaining the correction reason. Remove
hides immediately; restore requires verified store and ready media. Non-approve
actions require reason. Moderator cannot act on their own store. Response contains
`data: {listing,approval}`. suspend_store requests a distinct-founder approval;
store remains verified until approved. See [operations](operations.md).

Current result fields and errors are explicit in [OpenAPI](../openapi.json).
All merchant/admin responses are no-store. Database constraints duplicate critical
quantity, money and condition invariants. Validation: core.tests.test_listings,
core.tests.test_concurrency (separate real PostgreSQL connections).
