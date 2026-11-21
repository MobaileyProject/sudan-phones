+++
id = "HND-6674b8de36efe728"
title = "Backend hardening external acceptance"
created = "2026-11-20"
status = "open"
paths = ["backend/", "deploy/", "docs/BACKEND_OPERATIONS.md"]
+++
User authorizes local backend hardening and explicitly defers real WhatsApp/email
OTP setup/delivery. No staging host/domain or R2 configuration exists yet. Local
containers/tests/benchmarks do not certify real provider delivery, R2 policy/CORS,
external ingress TLS, production latency or joint frontend/release gates.

Before external onboarding: choose host/domain, configure private R2 credentials
and separate buckets/CDN, run smoke_storage with the actual HTTPS origin, configure
trusted ingress and restricted Django admin, separate app/migration/backup database
roles, encrypted off-host scheduled backups, monitored alerts and a real PITR drill.
See docs/BACKEND_OPERATIONS.md for commands and pending acceptance. OTP requirements
remain enforced; no bypass or console-delivery adapter was added.

Slack MCP is unavailable; use existing GitHub app/CI for supported PR/CI events.
Standalone milestone notification remains undelivered. Existing handoffs are not
closed or edited by this work.
