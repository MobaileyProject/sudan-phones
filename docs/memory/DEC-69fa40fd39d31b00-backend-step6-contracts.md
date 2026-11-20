+++
id = "DEC-69fa40fd39d31b00"
title = "Backend session, media and retry contracts through Step 6"
created = "2026-11-20"
topic = "backend-step6-contracts"
paths = ["backend/", "docs/api/", "docs/plans/"]
refs = ["file:docs/plans/BACKEND_THROUGH_STEP6.md", "file:docs/plans/MVP_SCOPE_AND_INVARIANTS.md"]
+++
Backend implementation uses Django server sessions with CSRF, channel-specific
WhatsApp/email OTP and no SMS. Verified email does not prove phone ownership.
Media limits selected under user delegation: JPEG/PNG/WebP scans/photos only,
8 MiB listing photos, 10 MiB evidence scans, 24 MP decoded image bound, eight
listing photos, 100 store upload requests/day. Private evidence uses separate R2
storage and immutable processed keys; links expire within 15 minutes.

Inventory mutations use versioned absolute edits and actor/store/operation-scoped
durable idempotency keys retained without automatic expiry. Used units remain
quantity 0/1. The signed scope governs automated publication and post-publication
moderation. Public reads always recheck eligibility through Step 6.

Store suspension and custom role deletion require two distinct active founders.
Contact intent has an explicit retry-safe event endpoint; merely retrieving
contact links does not count a customer action. Aggregates collect no guest identity.

The user authorizes backend work through Step 6 only. Frontend code and joint
INT/GATE acceptance remain outside this implementation; branch records do not
certify those gates, deployments or live external-service delivery.
