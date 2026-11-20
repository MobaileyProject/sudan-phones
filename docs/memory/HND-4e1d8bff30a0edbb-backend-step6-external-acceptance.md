+++
id = "HND-4e1d8bff30a0edbb"
title = "Backend external provider acceptance and client integration follow-up"
created = "2026-11-20"
status = "open"
paths = ["backend/", "docs/api/", "docs/plans/BACKEND_THROUGH_STEP6_ACCEPTANCE.md"]
refs = ["file:docs/plans/BACKEND_THROUGH_STEP6_ACCEPTANCE.md", "file:backend/README.md"]
+++
Before enabling real onboarding/uploads: configure Meta WhatsApp authentication
template/version/phone ID and SMTP privately; verify real OTP delivery over both
channels. Configure distinct private/public R2 buckets, enforce private originals
and evidence, set browser CORS, and smoke-test signed PUT/private GET/CDN behavior.
Configure the real public listing URL, shared Redis throttling cache, worker/beat
processes and worker resource limits. Automated doubles do not prove these external
services. Benchmark discovery at realistic scale before claiming the 500ms target.

Frontend integration and full INT-02..06/GATE-02..06 are separate founder acceptance
work. This delivery changes no frontend. Preserve that boundary when updating the
master plan; do not tick unmerged backend checkboxes or joint gates as passed.

Slack MCP is unavailable for standalone milestone messages; rely on the existing
GitHub Slack app/CI delivery for supported PR/CI events. Standalone milestone
notification remains undelivered. API-contract synchronization uses the existing
repository integration and must be checked separately; no raw credentials belong
in this record or in chat.
