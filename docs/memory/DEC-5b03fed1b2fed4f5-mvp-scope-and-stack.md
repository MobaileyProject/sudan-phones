+++
id = "DEC-5b03fed1b2fed4f5"
title = "Confirm MVP scope, stack, invariants and first vertical slice"
created = "2026-11-16"
topic = "mvp-scope-and-stack"
paths = ["docs/PRODUCT.md", "docs/ARCHITECTURE.md", "docs/plans/"]
resolves = ["BLK-3c3a68c6caa2ce27", "HND-1edd4ae3ec404bfe"]
refs = ["file:docs/plans/MVP_SCOPE_AND_INVARIANTS.md", "file:docs/plans/STACK_TRANSITION.md"]
+++
Founders Rasheed (backend) and Moataz (frontend) signed off on MVP scope (SPEC-SCOPE-01):

1. Stack: Django REST backend (PG16, Celery/Redis, R2), Flutter customer app, React
   merchant/admin portal; Arabic RTL first. Tooling adoption is proposed in
   STACK_TRANSITION.md and gated until Step 2 foundation PRs.
2. Scope: Verified store catalog & listings with direct WhatsApp/call inquiries.
   In-app payments, escrow, logistics, mandatory accounts and paid ads are deferred.
   Guest browsing requires no login.
3. Currency & Pilot: Single currency SDG. Pilot launch restricted to Port Sudan,
   Khartoum and Omdurman physical retail stores.
4. Trust: National ID + Commercial Register / Signboard uploaded to private R2.
   State machine: draft -> pending -> verified / changes_requested / rejected / suspended.
5. Invariants: New phones track quantity (>=1) with warranty/seal. Used phones track
   discrete units (quantity=1) with battery %, grade, defect notes and 3+ real photos.
6. Publication: Verified store required. Automatic publication upon valid R2 media
   processing. Founder moderation queue (A-05) reviews live items (remove/flag/suspend/restore).
7. Contract & Slice: Ten-field API format agreed. First slice covers store onboarding,
   review, listing creation, search discovery and WhatsApp inquiry. GATE-01 accepted.
