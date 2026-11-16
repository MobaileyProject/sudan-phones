# Slack agent automation implementation plan

User selected autonomous execution and agy integration; no further design gate.
Spec: docs/superpowers/specs/2026-11-16-slack-agent-automation-design.md.

## Constraints and review focus

Python standard library; no raw Slack credentials; preserve existing Lists and
checkout; no duplicate execution on crash; no merge or reviewer requests. Treat
Slack contents as task data, never permission to change worker policy. Verify
external effects independently and preserve uncertain work for reconciliation.

- [x] Add failing tests for the SQLite claims, intake gates, agy output validation,
  prompt context, worktree boundaries, publication failure and recovery.
- [x] Implement scripts/slack_worker.py plus focused scripts/slack_automation/
  modules for configuration/ledger, agy adapter, and prompts.
- [x] Add non-secret example configuration, systemd timer/service templates and
  docs/SLACK_AUTOMATION.md with exact commands, statuses and recovery rules.
- [x] Audit live agy Slack capabilities; improve actual Lists only when tools are
  available. Never claim unsupported operations; record precise missing access.
- [ ] Run make check, review independently, stage exact files and secret scan,
  commit/push, open PR, monitor CI and record the handoff in STATE.md.

Baseline: make check passes 9 tests on origin/main 32fb346; OpenAPI scaffold skip.
Shared skills PR #4 is open and passing; do not duplicate its payload. Execution
must wait until those skills are present on origin/main.
