# Merchant stores and verification — BE-04/05 / M-02..04, M-11, A-02..04

| API | Method / path | Authorization / state change |
| --- | --- | --- |
| API-030 | GET /api/v1/stores/me | Current owner/staff membership only |
| API-060 | PUT /api/v1/stores/me/profile | Owner, verified phone, draft/changes_requested |
| API-059 | PUT /api/v1/stores/me | Owner; opening_hours settings |
| API-055 | POST /api/v1/stores/me/staff | Owner adds an existing active user; 201 membership ID |
| API-004 | DELETE /api/v1/stores/me/staff/{id} | Owner removes own store's staff membership |
| API-056 | POST /api/v1/stores/me/verification/documents | Owner requests private evidence upload; 201 |
| API-057 | POST /api/v1/stores/me/verification/submit | Owner submits ready evidence; 201 application |
| API-035 | GET /api/v1/stores/me/verification | Latest application or data:null |
| API-011 | GET /api/v1/admin/verifications | verify_stores permission; pending queue |
| API-012 | GET /api/v1/admin/verifications/{id} | verify_stores permission; application details |
| API-013 | GET /api/v1/admin/verifications/{id}/documents | verify_stores; private signed evidence links |
| API-046 | POST /api/v1/admin/verifications/{id}/decision | verify_stores; optimistic application decision |

All protected requests use session auth and CSRF on mutations. Guest/foreign-store,
non-owner, suspended/rejected merchant accesses are denied (403/404). Services
check authorization even outside HTTP. One owner store and one store membership
per user are enforced by database uniqueness. Staff cannot edit business identity,
settings, evidence or memberships; cannot remove the owner. Duplicate membership
returns 409. Reads never reveal another store's private evidence or member list.

Profile body requires name, city (`port_sudan`, `khartoum`, `omdurman`), address,
phone and whatsapp. Both contact numbers must equal the owner's verified phone.
Business identity is locked during review and after approval; this prevents edits
from bypassing evidence review. General settings accept opening_hours. Changing an
approved store's identity/contact requires a future explicit re-verification flow;
this delivery does not silently approve changed ownership/contact details.

Document upload body: kind (`id_front`,`id_back`,`commercial`,`signboard`),
content_type, size and sha256. See [media](media.md). Submission body:
`{"documents":["<front-uuid>","<back-uuid>","<signboard-uuid>"]}`. It requires a
complete profile and ready, same-store private evidence with front/back national
ID plus commercial registration OR signboard. Duplicate kinds/IDs, foreign IDs,
corrupt/unfinished images return 400. The application snapshots the submitted name/address/contacts and document links;
subsequent submissions do not replace historical evidence. Store and application
move to pending_verification atomically with audit.

Decision body: `{"decision":"verified","version":1,"reason":""}`. Alternatives
changes_requested/rejected require a nonblank reason. Current pending version and
store state must match; duplicate/stale decisions return 409 STALE_VERSION without
extra audit. A store owner cannot review their own store. A decision commits actor,
timestamp, reviewer reason, store state and immutable audit together. Requested
changes may be corrected/resubmitted; rejection is terminal. Submitted/private
identity data is never present in public discovery responses.

All queues use limit (1..100, default 20), offset (0..10000, default 0), stable ID
ordering. Responses use data; exact fields, 400/401/403/404/409/503 envelopes are in
[OpenAPI](../openapi.json). API-013 links expire in 900 seconds and accesses are
audited; links are never issued to merchants/guests. Sensitive responses are no-store.

Validation: `core.tests.test_identity_stores`, `core.tests.test_verification_media`.
