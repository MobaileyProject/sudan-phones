# Universal Agent Operating Contract

Antigravity, Codex, and both founders share this contract for private repository
`MobaileyProject/sudan-phones`. This file is canonical. `.codex/instructions.md`
is a relative symlink here; `.agents/rules/workspace.md` directs Antigravity here.
Follow explicit user instructions and platform permissions when they override a
repository convention. Never put credentials or private chat transcripts in memory.

## Session startup — every fresh session

1. Run `git status --short --branch` and `git worktree list`. Identify the current
   task branch and any work owned by another founder/agent before changing files.
2. Preserve uncommitted work. Never discard it or switch branches over it. In an
   exclusively owned checkout, stash tracked changes with
   `git stash push -m "wip: <task-description>"`; record its reference in STATE.md.
   Leave unrelated untracked files intact. In a concurrently used checkout, use a
   separate worktree instead of stashing another agent's live edits.
3. Run `git fetch origin --prune`. In a clean main checkout run
   `git pull --ff-only origin main`. Never pull main into an unfinished task branch
   implicitly. If main is occupied by another worktree, fetch origin/main and use
   that as the base for a new task worktree; document the reason for skipping pull.
4. Read `docs/STATE.md` (also when the user says “Continue from STATE.md”). Confirm
   its branch/PR claims using `git log -5 --oneline`, `gh pr list`, and
   `gh issue list`; state is a handoff snapshot, Git/GitHub are live evidence.
5. Read `docs/PRODUCT.md` and `docs/ARCHITECTURE.md` when relevant. Claim a narrow
   task with owner, branch, target files, and status in STATE.md; inspect open PRs
   before starting to avoid duplicate work. If access fails, record the failure
   rather than claiming remote state is current.
6. Search before reading large files:
   `python3 scripts/search_codebase.py "search query" --limit 5`.
   Use returned paths/lines and `rg` to inspect only relevant sections.

## Branches, concurrent work, and reviews

- Never commit directly to `main` or force-push shared branches. Start from updated
  main/origin/main with `feature/*`, `fix/*`, `refactor/*`, or `docs/*`.
- Each founder/agent uses its own checkout/worktree and task branch. To avoid
  changing another session's branch, prefer
  `git worktree add ../sudan-phones-<owner>-<task> -b feature/<task> origin/main`.
- Coordinate overlapping domains, shared contracts, migrations, and STATE.md
  updates. Update only your task's state; preserve other owners' entries. Resolve
  state merge conflicts by retaining all still-active work and checking GitHub.
- Review peer PRs in an isolated worktree:
  ```bash
  gh pr view <id>
  gh pr diff <id>
  git fetch origin <branch>
  git worktree add ../review-pr-<id> --detach origin/<branch>
  # Run validation in ../review-pr-<id>, then return to your original checkout.
  git worktree remove ../review-pr-<id>
  gh pr review <id> --comment -b "Findings and verification evidence"
  # Use --approve only after verification passes and no blocking findings remain.
  ```
  If sandbox permissions prevent a sibling worktree, use an allowed temporary
  directory. Never force-remove a dirty review worktree.
- Do not automatically request review from the other founder or organization members.
  The user will review PRs personally; request another reviewer only when explicitly
  instructed. Preserve this preference when opening future PRs.
- Merge only with passing automated checks, a non-draft PR, and recorded peer
  human/agent approval: `gh pr merge <id> --squash --delete-branch`. Do not approve
  your own PR or bypass the review gate.

## Architecture invariants

Target: modular FastAPI monolith, Python 3.13, PostgreSQL 16, SQLAlchemy 2,
Pydantic, Alembic single-head migrations, native Android Kotlin/Jetpack Compose,
and Web Preview. The application has not been scaffolded yet; see STATE.md.

| Layer | Path | Responsibility |
| --- | --- | --- |
| HTTP | `backend/app/routers/<domain>.py` | Endpoints, parameters, dependency injection, status codes. Zero database queries or business rules. |
| Contract | `backend/app/schemas/<domain>.py` | Strict Pydantic request validation and response serialization. |
| Domain | `backend/app/services/<domain>.py` | Business logic, authorization, transaction boundaries. |
| Data access | `backend/app/repositories/<domain>.py` | Pure SQLAlchemy 2 queries and pagination; never HTTP exceptions or transaction commits. |
| Persistence | `backend/app/models/<domain>.py` | Declarative entities, relationships, foreign keys, indexes. |

Routers call services; services call repositories; repositories use models.
Services own transactions and raise domain errors; routers translate domain errors
to HTTP. Split by domain; avoid monolithic catch-all modules. Never introduce a
second Alembic head without reconciling it before merge. See docs/ARCHITECTURE.md.

Whenever endpoints or schemas change, run `make openapi`, review and commit
`docs/openapi.json`, and update the domain's `docs/api/<domain>.md` catalog.
`make openapi-check` runs in CI and must reject contract drift. Until the backend
exists it reports an explicit scaffold-pending skip; no fabricated API is exported.

## Validation, completion, and handoff — every task

1. For a bug fix, add a regression test and a structured
   `docs/bugs/BUG-YYYY-NNN.json` entry conforming to `docs/bugs/SCHEMA.json`.
   Copy `docs/bugs/BUG-TEMPLATE.md` for investigation notes; templates are examples,
   not evidence of an actual defect. Search existing records before diagnosing.
2. Update all six sections of `docs/STATE.md` as needed, preserving its headings.
   Include current focus, recent commit references, owner/branch/PR and exact next
   commands/target files, test results, decisions, blockers, and pending Slack
   deliveries. Include partial progress on interruption; never mark planned work
   complete. Do not invent approvals, implemented architecture, or successful CI.
3. Stage only intended files (never `git add .` with unrelated untracked work).
   Run `python3 scripts/check_secrets.py` **after staging** so new files are scanned.
   Run `make check` and all applicable application linters/tests. Record commands
   and outcomes. Missing tooling or skipped checks must be stated explicitly.
4. Commit with a conventional message, then push the task branch:
   `git push -u origin <branch>`. Open a PR autonomously using
   `gh pr create --base main --fill`; include validation and remaining limitations.
5. Monitor `gh pr checks <id>`. Update state with the PR URL and final CI results
   (a follow-up state commit is acceptable). Trigger Slack below. End with a
   concise handoff, PR link, limitations, and next action.

## Slack triggers and existing integration

Workspace: **Elrasheed Workplace** (`T0CJRU4RSUQ`), bot `@antigravity_bot`.

| Event | Channel |
| --- | --- |
| Feature milestone completed; PR opened/review requested; CI status | `#project-updates` (`C0CHSASMZMK`) |
| Blocking design decision or human question | `#dev-chat` (`C0CHSASJDQV`) |
| Defect discovered, critical build/test failure | `#tasks-and-bugs` (`C0CJ1AM1BHA`) |
| Shared reference material | `#resources` (`C0CHZGW3GL9`) |

Use `slack_post_message` when available for these task-related triggers. Include
only concise facts and PR/issue links. The GitHub Slack app also streams repository
activity; `.github/workflows/ci.yml` posts CI through `SLACK_BOT_TOKEN` and
`SLACK_CHANNEL_UPDATES`. Preserve those secret names and existing remote tracking.
Never read, print, commit, or copy raw Slack tokens into prompts or docs. If Slack
MCP is unavailable, rely on existing CI/app delivery for supported events and
record any undelivered message in STATE.md; never claim it was posted or expose
secrets to work around missing access.
