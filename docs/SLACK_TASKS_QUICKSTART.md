# Slack Tasks Quickstart

This guide explains how operators author and queue backlog tasks in the Slack List
for autonomous execution by the Antigravity (`agy`) worker. For full architecture
and worker operational setup, refer to [SLACK_AUTOMATION.md](SLACK_AUTOMATION.md).

## Task Authorization and Required Fields

The worker polls the configured Slack List and claims tasks only when:
- **`Status`**: set to `Ready`
- **`Executor`**: set to `agy`, or with an explicit reasoning effort level:
  - `agy` / `agy-medium`: Standard reasoning effort (balanced for most tasks).
  - `agy-high`: Deep reasoning effort (for complex architecture, invariants, or multi-module design).
  - `agy-low`: Fast lightweight effort (for simple text/doc/syntax changes).
  - `agy-xhigh` / `agy-max`: Maximum reasoning effort for critical system hardening.

Tasks must provide explicit and actionable context in these core List fields:
- **`Title`**: Concrete summary of the defect or feature.
- **`Kind`**: `bug` or `feature`.
- **`Details`**: Reproduction steps and context for bugs, or exact scope for features.
- **`Acceptance criteria`**: Observable conditions that must pass.

## Task Lifecycle and Status Flow

1. **`Ready`**: Authorized for execution. The worker picks up one task at a time.
2. **`In progress`**: Claimed by the worker, running in an isolated task worktree.
3. **`Blocked`**: Halted due to missing decisions, credentials, or prerequisites.
   The worker leaves work intact and reports details to `#dev-chat`.
4. **`PR ready`**: The worker completed checks and opened a non-draft PR against
   `main`. **PR ready waits for personal human review; the worker never merges.**
5. **`Done`**: Automatically updated by the worker only after GitHub reports the
   PR has been merged.

## Bug Task Evidence Requirements

When queueing bug tasks, follow the [defect-to-regression](../.agents/skills/defect-to-regression/SKILL.md) skill:
- **Reproduction**: Minimal input, environment details, and sanitized evidence.
- **Regression test**: Smallest test reproducing the failure before applying the fix.
- **Defect record**: Structured `docs/bugs/BUG-YYYY-NNN.json` conforming to
  `docs/bugs/SCHEMA.json` with root cause, fix summary, and test path.
- Do not fabricate bugs or claim verification on unscaffolded runtimes.

## Illustrative Documentation Task Example

The following is an illustrative documentation feature example, not a defect:

- **Title**: Add operator guide for Slack task submission
- **Kind**: `feature`
- **Executor**: `agy`
- **Status**: `Ready`
- **Details**: Author `docs/SLACK_TASKS_QUICKSTART.md` under 80 lines covering
  authorization gates, statuses, bug evidence, and personal PR review.
- **Acceptance criteria**: Guide exists with valid relative links; `make check`
  passes with honest scaffold-pending reports; non-draft PR opened without merge.
