# Authorized image ingestion — BE-08 / M-03, M-07, M-08, M-13

API-050 POST /api/v1/media/uploads: verified-store member requests a listing image
upload. API-056 requests private verification scans as the owner of an editable
store. API-063 POST /api/v1/media/uploads/{id}/complete: same-store member marks a
finished upload queued; returns 202 accepted. Cross-store asset IDs return 403/404.

Input is content_type (image/jpeg, image/png, image/webp), exact size in bytes,
lowercase hex sha256 and kind. Listing kinds: front, back, screen, seal, catalog;
private evidence kinds: id_front, id_back, commercial, signboard. User-chosen keys,
URLs, roles or purpose fields are rejected. Limits chosen under user delegation:
8 MiB per listing photo, 10 MiB per evidence scan, 24 million decoded pixels,
single-frame images, at most eight photos per listing, 100 upload requests per
store per day. PDF is not accepted; photograph/scan documents to supported images.

201 response example:
`{"data":{"id":"<uuid>","url":"<signed-put-url>","headers":{"Content-Type":"image/jpeg","Content-Length":"1234"},"expires_in":600}}`.
PUT the exact bytes with the indicated content type and length (browsers set
Content-Length automatically), then POST API-063. A 15-minute completion window
bounds abandoned requests; repeat completion is harmless for queued/ready assets.
Invalid/expired media returns 400; missing storage configuration returns 503.

All originals land in quarantine in R2_PRIVATE_BUCKET. R2_PUBLIC_BUCKET must be a
different bucket. Evidence/quarantine must have no public/CDN access. Signed PUT
URLs expire in ten minutes. Client completion never marks media valid. Celery
polls durable queued rows every 30 seconds, so API/broker response loss cannot drop
committed work. A manual process_media command runs a bounded batch too.

The worker checks byte count, SHA-256, actual image format, full decode, frames,
pixels and truncation. It applies EXIF orientation, copies pixel content into
metadata-free JPEG, bounds images to 1600x1600 and creates 320x320 thumbnails for
listings. Malformed images become failed; provider failures remain queued for
retry. API-034 exposes media_status; API-038 can replace failed photos with fresh
same-store uploads. Required images and verified store eligibility are rechecked
before automatic publication. Removed listings never republish due to late jobs.

Validated private evidence is copied to a separate immutable object key, so
reusing a still-valid original PUT URL cannot alter reviewed evidence. Only
processed listing derivatives are public. Duplicate workers are idempotent;
store/asset locks protect completion/publication. There is no public worker
callback endpoint or client-controlled ready flag. Run one scheduled poller;
overlapping delivery is safe but redundant. Set worker process memory/time limits
as documented before enabling untrusted uploads.

Quarantine originals can be removed after expiry once processing finishes; use a
private-bucket lifecycle rule with a one-day quarantine prefix expiry. Queued work
older than that needs re-upload. Validated private evidence is retained for the
registered store lifetime; deletion requires an explicit audited offboarding
policy. No automatic evidence deletion is introduced. CDN bytes already downloaded
cannot be recalled when a store is suspended; APIs revalidate current visibility.

Validation uses actual image decode and storage-boundary doubles, not real R2
credentials. Live R2 bucket policy, signed PUT/GET and browser CORS smoke tests
remain operator acceptance work. See [backend setup](../../backend/README.md).
