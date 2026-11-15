---
name: secure-media-workflow
description: "Use when adding or reviewing listing image uploads, private store-verification documents, media processing jobs, signed URLs, or publication readiness callbacks."
---

# Secure Media Workflow

Map two distinct asset purposes: public processed product media and private
verification evidence. Confirm formats, quotas, retention/access policy and provider
before implementing storage or choosing third-party processing services.

## Procedure

1. Bind upload authorization to the authenticated actor, store, purpose and generated
   object key. Recheck ownership for completion/replacement/read/delete operations;
   reject cross-store IDs and user-chosen paths. Keep size/count limits explicit.
2. Keep uploads quarantined until server-side validation and actual decode/processing
   succeed. Check content rather than trusting extension/MIME, bound decoded pixel
   dimensions and processing resources, reject malformed/truncated media, and remove
   unwanted metadata from public derivatives. Treat documents according to the agreed
   verification policy rather than assuming every document is an image.
3. Authorize private evidence reads separately; prevent public bucket/CDN access and
   public response/log/cache leakage. Signed access is short-lived and scoped; object
   names and difficult-to-guess URLs are not authorization controls.
4. Authenticate worker callbacks and bind them to the expected asset/job/version.
   Use durable state and idempotent transitions for duplicates, retries and out-of-order
   completions; failed/stale processing cannot publish a listing prematurely.
5. Test cross-store access, forged/expired access, corrupt content, resource limits,
   partial writes, replayed callbacks, cleanup retries and store suspension during
   processing. Verify access to original objects as well as public derivatives.

Example: successful product-image processing must not turn an unrelated private
verification document into a public asset, even when completion callbacks are replayed.

Deliver the asset-access matrix, publication state checks, storage/worker tests and
any retention/provider decisions needing founder agreement.
Reference: [product](../../../docs/PRODUCT.md).

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
