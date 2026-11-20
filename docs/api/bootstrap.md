# Bootstrap contracts — P2 / BE-02 / INT-02

Consumers: C-00 startup and C-09 loading/offline/error states; Flutter customer
and React merchant/admin clients. All three operations are public, read-only and
independent of the database. They expose no user/store/private storage data and
set no cookies. Browser clients use a same-origin reverse proxy (or Vite dev
proxy); cross-origin credential/cookie/CORS deployment is not configured here.

## Shared HTTP conventions

Canonical paths use `/api/v1` without a trailing slash. Trailing slashes and
unknown versioned paths return 404, without redirects. Methods: GET, HEAD
(same status/headers, no body), OPTIONS; mutations receive 405 and an Allow header.
Successful GETs use `{"data": ...}`. Unknown, duplicate and invalid query parameters
receive 400, including an explicitly empty locale. These scalar/bootstrap
operations do not paginate or accept filter/sort parameters. Future collection
contracts should specify bounded pagination explicitly; no list API is invented.

Config and bundle take optional `locale=ar|en`. Explicit locale overrides
Accept-Language. Otherwise Django negotiates regional variants (ar-SD/en-US) and
falls back to Arabic. Language/session cookies do not influence public response
variants. Content-Language reports the selection. Config/bundle responses use
`Cache-Control: public, max-age=300` and `Vary: Accept-Language`; explicit locale
also forms part of the URL cache key. Liveness and all errors use `no-store`.
Do not cache errors or represent cached liveness as current readiness.

Every versioned response has a server-generated UUID in X-Request-ID. Client
supplied IDs are ignored. Use that header when reporting a failure; it is not
an authentication or idempotency token. No mutation/retry semantics are needed
for these read-only operations.

## API-019: GET /api/v1/config

Input: only optional locale. Authentication: none; authorization: public.
Response 200: API/minimum supported app version, SDG currency precision, Arabic
default and supported locales/direction, three pilot city IDs/localized labels with
reverse-geocoding administrative name `aliases` (for zero-math native device city identification),
and disabled customer-account/payment/paid-ad flags. A flag reports the agreed MVP
boundary; it does not imply the underlying feature is implemented.

```sh
curl -i 'http://127.0.0.1:8000/api/v1/config?locale=en'
```

```json
{"data":{"api_version":"1.0.0","minimum_app_version":"1.0.0","currency":{"code":"SDG","decimal_places":2},"default_locale":"ar","supported_locales":["ar","en"],"locale":"en","direction":"ltr","cities":[{"id":"port_sudan","name":"Port Sudan","aliases":["port sudan","portsudan","بورتسودان","red sea","البحر الأحمر","البحر الاحمر"]},{"id":"khartoum","name":"Khartoum","aliases":["khartoum","الخرطوم","khartoum state","ولاية الخرطوم"]},{"id":"omdurman","name":"Omdurman","aliases":["omdurman","أم درمان","ام درمان","امدرمان","أمدرمان"]}],"features":{"customer_accounts":false,"payments":false,"paid_ads":false}}}
```

MINIMUM_APP_VERSION defaults to `1.0.0` and can be configured by environment.
The public response uses a field allowlist rather than serializing Django settings.

## API-021: GET /api/v1/i18n/bundle

Input/auth/authorization: as config. Response 200: locale, direction (`rtl`/`ltr`),
bundle version and a flat string-key dictionary. Version `1` contains bootstrap,
loading, empty, offline/retry and shared error messages. Both locales have identical
keys. Increment the bundle version when changing its contents. These are server
bootstrap translations; complete client screens/RTL layouts remain frontend work.

```sh
curl -i -H 'Accept-Language: ar-SD' http://127.0.0.1:8000/api/v1/i18n/bundle
```

Example fields: `data.locale = "ar"`, `data.direction = "rtl"`,
`data.strings["common.retry"] = "حاول مرة أخرى"`. The complete exact response schema
and keys are in OpenAPI and `backend/core/bootstrap/locales/{ar,en}.json`.

## API-061: GET /api/v1/health

No inputs, authentication or state changes. Response 200:
`{"data":{"status":"ok"}}`. This is process liveness; it does not check PostgreSQL,
R2, Redis or Celery and must not be used as proof those services are ready.

## Shared errors

```json
{"error":{"code":"VALIDATION_ERROR","message":"Check the supplied information","details":[{"field":"locale","code":"invalid_choice","message":"Invalid value"}]}}
```

Messages follow the negotiated locale. Clients branch on stable codes, not message
text. Nested validation details use dotted field/index paths. Submitted values,
exception text and secret settings are never echoed. Unexpected DRF failures log
only exception class and request ID and return a generic 500 envelope.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Invalid/duplicate/unknown query field |
| 400 | PARSE_ERROR | Unreadable request in a DRF view |
| 401 | UNAUTHORIZED | Authentication required by a future protected view |
| 403 | FORBIDDEN | Permission denied |
| 404 | NOT_FOUND | Unknown versioned path/resource |
| 405 | METHOD_NOT_ALLOWED | Unsupported method; Allow header retained |
| 406 | NOT_ACCEPTABLE | Unsupported response representation |
| 415 | UNSUPPORTED_MEDIA_TYPE | Unsupported request content type |
| 429 | THROTTLED | Rate limited; Retry-After retained |
| 500 | INTERNAL_ERROR | Generic failure without private details |

The bootstrap endpoints require no authentication, parse no write bodies and
configure no throttle; those handler mappings are shared conventions, not new APIs.

## Acceptance evidence

`test_bootstrap.py` covers locale precedence, region tags, cookies/cache isolation,
public-field filtering, invalid queries, request IDs, errors, methods and liveness.
Its SimpleTestCase base prohibits database reads. `test_error_contract.py` checks
nested validation/parse/permission/throttle mappings. `test_p2_acceptance.py`
checks both locale journeys against actual generated response schemas;
`test_p2_http.py` repeats the bootstrap/error/recovery journey over real local HTTP.
Client rendering, physical devices and offline recovery are not exercised here.
