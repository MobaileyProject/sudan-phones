+++
id = "HND-2e23f057ded4e91d"
title = "Activate merged pr recovery"
created = "2026-11-16"
status = "open"
paths = ["scripts/slack_automation", "docs/SLACK_AUTOMATION.md"]
refs = ["bug:BUG-2026-007", "pr:17"]
+++
After the merged-PR recovery fix is reviewed and merged, update the existing
single Slack worker checkout during an idle interval. Preserve its ignored
configuration, ledger, claims and timer; do not start a second worker or reset
claims. Verify the deployed core accepts MERGED only for the correct repository,
task branch and main base, and the publisher maps the derived done outcome to Done.

The affected BE-01 row and old blocked notification have already been reconciled
against merged PR #17 under the worker lock. Its claim remains recorded; do not
requeue BE-01. This handoff is for installing the general regression fix, not for
rerunning the completed foundation. Future tasks still require their own tests,
review and acceptance evidence.
