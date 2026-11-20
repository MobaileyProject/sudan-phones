# Identity — BE-03 / M-01, C-07

All schemas and status envelopes are in [OpenAPI](../openapi.json). All responses
use `data`; errors use `error: {code,message,details}`. Arabic is the default;
`Accept-Language: en` selects English shared messages. Auth responses are `no-store`.

| API | Method / path | Caller and result |
| --- | --- | --- |
| API-049 | POST /api/v1/auth/register | Optional buyer identity; creates no store |
| API-051 | POST /api/v1/merchant/auth/register | Merchant identity, draft store, owner membership, OTP |
| API-047 | POST /api/v1/auth/login | Password authentication; rotates session and CSRF token |
| API-048 | POST /api/v1/auth/recover | Request OTP or consume it with replacement password |
| API-052 | POST /api/v1/merchant/auth/verify | Signed-in user; request or consume channel-specific OTP |
| API-062 | GET /api/v1/auth/session | Guest/session identity, role, permissions; bootstrap CSRF cookie |
| API-002 | DELETE /api/v1/auth/session | Clear current server-side session |

Registration requires `phone` (normalized +249 plus nine digits), `name`, validated
`password`; optional `email` and `channel` (`whatsapp`, default; or `email`). Email
channel requires email. Client-supplied roles and unknown fields return 400.
Successful registration returns 201 and signs in a provisional unverified user; sending
failure returns 503 and rolls back identity/store/challenge creation. A phone is provisionally claimed until WhatsApp verification; unverified claims
never reserve the number against its actual holder. Only a verified phone binding
is unique. An already verified phone returns 409 ACCOUNT_UNAVAILABLE. No OTP is returned or logged.

OTP codes have six digits, expire after five minutes, allow five failed attempts,
and are consumed once. Challenge attempts commit even on invalid-code responses.
Issuance is limited to one challenge per user/purpose/channel per minute. Verification
consumes `{ "code":"123456", "channel":"whatsapp" }`; omitting code requests
another challenge. Email verification never verifies the phone. Recovery first
accepts `{ "phone":"+249912345678", "channel":"email" }`; response is always
`{ "data": { "accepted": true } }` for existing/unknown contacts and delivery
failures. Recovery requires a previously verified channel. Supply `code` and
`password` together to reset; invalid/expired/consumed OTP returns 400 INVALID_OTP.
Phone/password login and recovery resolve the proved identity only; email-only
provisional sessions must complete WhatsApp proof before phone login. An unrelated
claimant retains only their separate provisional account and recovery address,
without inheriting or recovering the proved identity. Concurrent phone proofs can
bind only one account. Changing the password invalidates old Django sessions on
their next request; a two-cookie-jar HTTP test verifies this.

All unsafe auth requests, including login/registration, require CSRF. First GET
API-062 into a cookie jar; send that jar and its csrftoken as X-CSRFToken. After
login/registration, use the rotated csrftoken. Protected APIs use the same session
and CSRF header; there is no JWT issuance or bearer-token fallback in this delivery.
`role` is guest/buyer/merchant/admin; business services independently check current
membership/permissions. A Django staff flag alone grants no marketplace powers.

Auth traffic is throttled for anonymous and signed-in clients. Resend/attempt
limits are database-backed; HTTP throttling uses Django cache. Configure a shared
cache for multiple API processes. Throttle identity uses the connection address by
default and ignores untrusted forwarding headers. TRUSTED_PROXY_COUNT must only be
set when the API is reachable exclusively through a configured trusted ingress
chain that strips/appends forwarding headers correctly. Session cookies are HttpOnly, SameSite=Lax and
Secure when DEBUG=False. No guest browsing endpoint creates a session cookie.

WhatsApp uses a configured Meta authentication template (copy-code URL button),
phone number ID, access token and explicitly configured Graph API version. Email
uses Django SMTP with TLS. Neither provider is claimed live until operator smoke
tests pass. See backend README for configuration. No SMS provider is used.

Validation: `core.tests.test_identity_stores`, `core.tests.test_delivery_workers`.
