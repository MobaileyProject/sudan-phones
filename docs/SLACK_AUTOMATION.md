# Slack backlog and agy automation

The worker imports open GitHub issues and non-draft PRs, current failed main CI
workflows (newest completed run per workflow within the latest 20 runs), and
unresolved tracked `docs/bugs/BUG-*.json` records into one configured Slack List.
Stable source keys prevent repeat imports. It preserves existing rows and human
statuses; it does not import arbitrary channel conversation as executable work.
Issue intake is bounded to 100 open issues per poll; expand pagination before the
backlog exceeds that size. Run one worker on one machine for this repository.

## Verified access

The installed agy CLI supports `-p`, JSON schema output and time limits. A live
read-only discovery on 2026-11-16 returned Slack channel/history/post/reply tools,
but **no Lists tools**. After the user added Lists authorization and confirmed no
Lists existed, the API connector created **Sudan Phones Backlog** (`F0CHWFG1BD4`)
and shared write access with `#tasks-and-bugs`. Creation, sharing, reads, row
creation/update and agy-written channel delivery were verified live.
The local Slack skill embeds a credential: rotate it and remove that credential
from the local skill. This worker never reads that skill. With optional
`credential_source: "agy-mcp"`, it consumes the configured Slack server environment
credential in-process, without exposing it to prompts, output, tracked files or
agy child environments. An environment credential takes precedence; the example
defaults to `credential_source: "environment"`.

Lists require a paid Slack workspace and `lists:read` / `lists:write`; notifications
need `chat:write`. Use a newly rotated credential with access to the target List
and membership in the three channels. Existing GitHub Actions secret names remain
unchanged. A GitHub secret is not automatically available to this local worker.

## Improve the existing List

The current List is [Sudan Phones Backlog](https://elrasheedworkplace.slack.com/lists/T0CJRU4RSUQ/F0CHWFG1BD4).
Channel sharing alone may not put a bot-created List in your home view. Open its
permalink; direct user sharing makes it available under Shared with you. Optional
`founder_user_ids` in configuration grants those users write access during setup.
The live List has also been shared directly with the active founder account.
For another deployment, use the intended List's actual ID in configuration.
Preserve existing columns/rows and add missing fields through Slack's List UI.
The public update-List API edits metadata, not arbitrary column schemas; the worker
does not send speculative schema mutations or replace an existing List.

| Field | Meaning |
| --- | --- |
| Title | Concrete defect or feature |
| Kind | `bug` or `feature` |
| Priority | Suggested human field: Critical / High / Medium / Low |
| Status | Backlog / Ready / In progress / Blocked / PR ready / Done |
| Owner | Human accountable for review, optional people column |
| Executor | Text `agy` authorizes agent execution when Status is Ready |
| Details | Bug reproduction, expected/actual behavior, or feature scope |
| Acceptance | Observable conditions that must pass |
| Source | Stable `issue:<number>`, `ci:<run-id>`, `bug:<id>` or manual reference |
| Branch / PR / Result | Worktree branch, review link and latest outcome |

Text fields are easiest to map. Existing select columns also work: configure
`{"id":"ColActual","type":"select","values":{"Ready":"actual-option-id",...}}`
with every status/option used by the worker. The Executor is separate from human
Owner: it can be text or a select with `agy`. Map actual column IDs, not names.

For first-time creation in another deployment, copy the example to ignored
`.slack-worker.json`, configure credential access and run
`python3 scripts/slack_worker.py create-list`. A known ID with pending setup resumes
schema mapping/sharing without creating another List. An uncertain creation without
an ID requires inspecting Slack before clearing `creation_pending`. A completed
setup refuses duplicate creation. The current project List already exists.

To use an existing List, copy `config/slack-worker.example.json` to ignored `.slack-worker.json`, set
`list_id`, then inspect the actual schema (requires the credential already in the
process environment; never put it on a command line or in chat):

```bash
python3 scripts/slack_worker.py schema
python3 scripts/slack_worker.py doctor
python3 scripts/slack_worker.py sync
```

The schema command prints column metadata only, not row contents or credentials.
Map the ten automation fields in the local JSON file. `doctor` verifies workspace,
List reads and GitHub access; it does not claim write permissions or agent execution.
`sync` adds Backlog reports and PR-ready entries, reconciles merged PRs and delivers pending messages.
Each imported bug gets an agy-written update in `#tasks-and-bugs`; features go to
`#project-updates`. agy writes summaries from actual task/result evidence, not canned
CI strings. Failure to generate or post a message remains pending locally.
Generated text is normalized to Slack mrkdwn (single asterisks for bold). PR
notifications retain actual GitHub check results and ask for review; merged PRs
ask for no requeue. Changes in check evidence edit the existing message timestamp.

## Execute ready work

Merge shared-skills PR #4 first: the worker requires all 14 skill entrypoints on
`origin/main`. A Ready row stays unclaimed while that prerequisite is missing.
Verify local agy and gh login. The implementation session grants specific common
Git/read/test commands, pushing its exact task branch and creating a PR against
main; other commands retain permission checks. No grants are saved globally. Optional
`agy_settings` in local worker JSON points to a separate settings file. Permission
checks remain enabled by default. The user explicitly authorized
`--dangerously-skip-permissions` for queued implementation runs during the first
live executor test. Set local `agy_skip_permissions` to true to use that flag for
implementation sessions; message-writing sessions retain their normal policy.
This does not change global agy settings. Task-specific Git trust is passed in
the child environment so agy need not modify global Git configuration.
A denied headless tool blocks the task rather than silently succeeding. The discovered host does not
support agy's Auto terminal sandbox, so the worker uses accept-edits mode.

Set `execution_enabled` to true, supply Details and Acceptance, set Executor to
`agy` and Status to Ready, then:

```bash
python3 scripts/slack_worker.py once
python3 scripts/slack_worker.py status
python3 scripts/slack_worker.py retry-delivery
```

Each poll executes at most one new item, serially. It uses an ignored `.worktrees/`
checkout under this repository and a deterministic fix/feature branch from fresh
`origin/main`. agy loads the canonical contract, product/state/architecture, skills
catalog and matching skills, fixes or implements, runs checks and opens a PR for
the user's personal review. It cannot merge or deploy under the worker contract.
The worker independently checks the returned PR URL, repository, branch, base and
open state. Tests and CI remain evidence reported by agy and GitHub, respectively;
an open PR does not mean checks passed. Status becomes PR ready; a later poll moves
it to Done only after GitHub reports MERGED. Closed unmerged PRs stay PR ready for
human triage.

Blocked runs post an actionable agy-written update to `#dev-chat`. Source reports
and final results are published separately from implementation; `retry-delivery`
does not run implementation. Message IDs are stable, but Slack network uncertainty
can still produce duplicate notifications; inspect the channel before retries.

## Run automatically on this machine

Install the provided user service/timer from a stable reviewed checkout after the
automation PR is available. The template targets the canonical checkout; adjust
paths when using the isolated automation worktree before merge. Keep a newly rotated
credential in a private file outside the repository:
`~/.config/sudan-phones/slack-worker.env` (mode 600). Set it through your local secret
manager/editor; never copy the embedded skill credential. The worker strips Slack
environment variables before launching agy.
The environment file is optional when `credential_source` is `agy-mcp`.

```bash
mkdir -p ~/.config/systemd/user
cp config/systemd/sudan-phones-slack-worker.service ~/.config/systemd/user/
cp config/systemd/sudan-phones-slack-worker.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now sudan-phones-slack-worker.timer
systemctl --user list-timers sudan-phones-slack-worker.timer
journalctl --user -u sudan-phones-slack-worker.service
```

Adjust paths in the service for another machine. It polls five minutes after the
previous run finishes, only while this machine/session can run user services.
Each nonempty publication and each implementation uses agy credits. Empty polls
make Slack/GitHub requests but do not invoke agy. Disable with:
`systemctl --user disable --now sudan-phones-slack-worker.timer`.

## Recovery and limits

The ignored `.slack-worker/jobs.db` stores claims, task data and results; keep it
private and do not delete it to clear a blocked run. Claims survive process death:
the same List row never automatically runs twice, even if its status is toggled.
An interrupted claim without a result is visible in `status`; inspect its saved
branch/worktree and agy conversation. The worker does not automatically retry or
delete uncertain work. Reconcile an existing PR/result manually; only create a
new Ready row for a deliberate new attempt after inspecting the old branch.

All List writes require API `ok=true`; channel delivery also requires a returned
message timestamp. Ambiguous item creation is reconciled by Source on the next
poll. Locks are local, not distributed: do not start another host against the same
List. No webhook server, database service, global permission override, or external
hosting is installed. Agent prompt restrictions are operating policy, not an OS
security boundary; use the agent's actual permission controls for enforcement.

References: [agy headless mode](https://antigravity.google/docs/cli/headless/),
[Slack List reads](https://docs.slack.dev/reference/methods/slackLists.items.list/),
[cell updates](https://docs.slack.dev/reference/methods/slackLists.items.update/),
[List metadata updates](https://docs.slack.dev/reference/methods/slackLists.update/).

## Context and run measurements

See [Lightweight project context](CONTEXT.md) for the two-stage rollout and rollback.
`context_prompt_version` defaults to `1`, preserving current startup. Version `2`
requires a reviewed, validated STATE migration at the task's accepted base; proposed
records cannot authorize activation. The worker injects the complete pinned brief,
exports `CTX_BASE`, and keeps agy-generated Slack notifications and existing Ready/agy
execution, permission and PR checks unchanged.

`metrics_path` defaults to `null`. An opt-in absolute path must be outside the repo,
inside a private mode-0700 directory, and separate from the ledger. Allowlisted final
JSON counters are appended to a mode-0600 file. Missing/contended metrics never change
the task result. No prompts, responses, task details or error text enter this log.
After tooling PR #9 merges, update the single owned service checkout while idle,
preserving private config/ledger, before merging the migration. Its compatible v1
prompt obeys either accepted startup contract. After the migration merges, set
version 2 locally and run `doctor` before resuming polls. Never start a second worker.
