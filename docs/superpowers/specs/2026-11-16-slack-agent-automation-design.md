# Slack Lists and local agy worker

The user delegated design and execution: improve existing Slack Lists, automatically
record bugs, read ready work, invoke local agy with repository skills, and deliver
reviewable PRs and contextual Slack updates. No automatic merge or deployment.

## Approach

Use a local, serial Python worker driving agy headless sessions. Slack MCP exposes
channel tools but no Lists methods; a small API connector consumes the configured
Slack environment credential privately. agy handles implementation and contextual
messages; Python handles List synchronization, locking, durable claims, timeouts, and
worktree boundaries. Polling works without exposing a local HTTP webhook. A cloud
runner cannot directly access this directory; a pure prompt scheduler lacks a
durable duplicate-execution guard. No new cloud service or runtime dependency.

## Lists and behavior

The user confirmed no Lists existed and authorized creation of a first List.
Create one Sudan Phones Backlog with: title, kind, priority,
status, owner, description/reproduction, acceptance criteria, source key, issue,
branch, PR, latest result. Statuses: Backlog, Ready, In progress, Blocked, PR ready,
Done. Ready plus owner agy is authorization to execute, not arbitrary channel text.
Only configured List IDs in workspace T0CJRU4RSUQ are eligible. New reports enter
Backlog. Done requires a merged PR; opening one means PR ready.

Intake synchronizes repository bug JSON records and GitHub issues/failing runs
into Lists, using stable source keys and checking existing rows before creation.
No chat transcripts are stored in the repo. Drafts and unclear tasks are blocked
with one actionable question in dev-chat. The user retains PR review and merge.

## Execution and evidence

One process lock and durable SQLite ledger per repository. Persist claims before
launch, never retry an uncertain or interrupted implementation automatically.
Create a fix/ or feature/ worktree under the repository's ignored .worktrees from
fresh origin/main; require AGENTS.md and all 14 shared skill packages on that base
before execution. Original checkout and untracked PDF are preserved. Load STATE,
PRODUCT, ARCHITECTURE, SKILLS and matching entrypoint skills. Reproduce bugs, add
regression/bug records, run applicable checks, stage explicitly, scan secrets,
commit/push a task branch and open a PR. Never merge or request another reviewer.
Verify returned PR using GitHub before claiming PR ready. Partial/failed runs
remain blocked locally with their branch preserved.

Separate status delivery from implementation. Persist results before publishing;
delivery retry must never rerun code. agy writes concise task-specific updates
with change, checks, result, link, and next action, using threads for progress.
Missing MCP tools/scopes, denied tools, timeouts and unavailable Lists are explicit
blockers. Never use embedded credentials or disable permission checks globally.

## Operation

CLI offers doctor, sync, once, status and retry-delivery. Configuration contains
only non-secret List IDs and CLI options. Startup defaults to disabled execution;
enable after a live capability audit and successful sync. A user systemd timer
template can poll while this machine is awake; installation needs filesystem
permission. Source is PR-delivered before installing a persistent service.

## Verification

Standard-library tests exercise duplicate claims/restarts, wrong List/status/owner,
malformed and soft-denied agy output, timeout, PR verification, lock contention,
source deduplication prompt rules, worktree isolation and delivery-only retries.
Live Slack access and agent execution are reported separately from unit checks.
