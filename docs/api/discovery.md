# Guest discovery — BE-09 / C-01..04, C-06, C-10

| API | GET path | Result |
| --- | --- | --- |
| API-020 | /api/v1/home | Organic brands, latest phones, cheapest available offers, stores |
| API-022 | /api/v1/listings | Composite search |
| API-023 | /api/v1/listings/{id} | Device/variant/store details and processed media |
| API-025 | /api/v1/listings/{id}/related | Same model and city, excluding current item |
| API-027 | /api/v1/product-variants/{id}/listings | Exact variant merchant offers |
| API-029 | /api/v1/stores/featured | Verified store spotlights, deterministic ID order |
| API-036 | /api/v1/stores/{id} | Verified public store profile |
| API-037 | /api/v1/stores/{id}/listings | Visible offers belonging to this store |

No login, sessions, tracking cookies or guest personal data are required/collected.
All listing entry points share a single query: store verified and owner active,
listing published, quantity>0, at least one media link and all images ready. Direct
IDs cannot bypass it. Suspended stores and removed/processing/sold/invalid-media
listings yield 404 or are absent from lists. Public store profiles also require
verified active stores. Private evidence keys/URLs, staff and reviewer fields are
not public. Public media points only to sanitized listing derivatives.

Search parameters: q (model/brand substring, <=120 characters), brand_id, model_id,
condition=new/used, city=port_sudan/khartoum/omdurman, min_price/max_price SDG decimals,
storage_gb, sort=latest/price_asc/price_desc, limit=1..100 (default 20), offset=0..10000
(default 0). Inverted price ranges, repeated/unknown keys, invalid sort/city/limits
return 400. Sort includes an ID tie breaker. No-match search returns 200 with empty
data and count=0. Related/variant/store listing APIs support the same filters.

Example: GET `/api/v1/listings?q=iPhone%2013&condition=used&city=khartoum&sort=price_asc`.
Result: `{"data":[{"id":1,"price":"500000.00","currency":"SDG",...}],"meta":{"count":1,"limit":20,"offset":0}}`.
Exact schemas, media URLs, battery health and variant fields are in
[OpenAPI](../openapi.json). Details/home/stores use data envelopes. Home's deals are
cheapest available phones, not paid promotion or a fabricated discount/rating score.

Valid search GETs increment daily aggregate request count; detail GETs increment
aggregate listing views. HEAD requests do not increment. These are request counts,
not unique people. No guest identity is stored. APIs are no-store through Step 6,
so every request rechecks eligibility; heavy cache work is deferred to Step 7.
Indexed status/condition/price, store/status and variant/status paths support
filtering. Production <500ms and high-volume query plans need staging dataset
benchmarks; local functional tests alone do not certify that acceptance target.

Validation: core.tests.test_discovery and operations metric checks.
