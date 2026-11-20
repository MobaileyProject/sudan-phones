+++
id = "DEC-3c0483aa01ee2991"
title = "Backend public cache freshness"
created = "2026-11-20"
topic = "backend-public-cache-freshness"
paths = ["backend/core/common/public_cache.py", "backend/core/catalog/", "backend/core/discovery/", "docs/api/discovery.md"]
+++
Proposed implementation choice for the user-authorized backend hardening: retain
server no-store headers. Redis caches only public brand ID/name rows and bounded
home ranking ID candidates for 15 seconds. New arrivals/ranking and brand renames
may take up to 15 seconds to refresh. Every home request rechecks current listing,
store/owner/media eligibility and rereads prices/stock/details from PostgreSQL.
Missing cached candidates cause live refill. Private evidence and session data
never enter this cache. Cache failures fall back to public reads, without relaxing
auth throttling. See test_public_performance and docs/BACKEND_OPERATIONS.md.

Django moves from the unsupported 5.1 series to 5.2.19 LTS within the approved
Django 5 stack. This record proposes no new product scope or joint gate closure.
