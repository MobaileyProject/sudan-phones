+++
id = "HND-1613e4dc8b46e768"
title = "P2 client acceptance and catalog"
created = "2026-11-16"
status = "open"
paths = ["backend", "docs/api", "docs/plans/P2_ACCEPTANCE.md"]
refs = ["file:docs/plans/P2_ACCEPTANCE.md", "file:docs/api/operations.json"]
+++
Finish INT-02 full joint acceptance after the P2 backend PR is reviewed/merged:
obtain Flutter Android/iOS boot evidence, React shell build/navigation evidence,
both clients consuming real config/bundle endpoints and remaining live R2 evidence.
Backend HTTP/schema tests do not certify client rendering or offline recovery.
Do not mark GATE-02 complete or start P3 from backend-only evidence.

After merge, reconcile Slack API Contracts Catalog F0CHJB5C939 against the merged
docs/api/operations.json: retain API-019 and API-021, add API-061 liveness and remove
58 unused current proposals. Their requirements remain in the planning archive.
Verify complete pagination and read back the final three-operation catalog; never
publish unmerged branch APIs as delivered or erase future phase requirements.
