+++
id = "HND-ec7b3a07e9795e22"
title = "Preserve the single owned Slack worker and saved claims"
created = "2026-11-16"
paths = ["scripts/slack_automation/", "scripts/slack_worker.py", "config/systemd/", "docs/SLACK_AUTOMATION.md"]
refs = ["file:docs/archive/STATE-20261116.md", "commit:b69124d4353f478b4c2ca13b44028531456af5df", "pr:7", "pr:8"]
status = "open"
+++
The owned runtime checkout is .worktrees/slack-agent-automation; preserve its private config, job ledger, failed first smoke-test claim and enabled timer. The old /tmp copy must not run a second worker. Verify branch, timer, List UI visibility and permissions live before asserting their state. Documentation smoke-test PR #7 succeeded; direct founder UI visibility was not verified.
