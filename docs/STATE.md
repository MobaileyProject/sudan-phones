# Project State & Session Handoff

## Current Active Focus
- Deliver all 14 approved shared agent skills on feature/shared-agent-skills; then resolve the recorded product/stack decisions before application scaffolding.

## Architecture & Technology Stack
- Backend: Modular FastAPI Monolith (Python 3.13)
- Database: PostgreSQL 16 (Alembic single-head migrations)
- Clients: Native Android (Kotlin Jetpack Compose) & Web Preview
- CI / Integration: GitHub Actions + Slack Alerts
- These are target choices; no backend, database migrations, Android app or web client exists yet. Read docs/ARCHITECTURE.md and docs/PRODUCT.md before scaffolding.

## Completed Milestones
- [x] Initial workspace reset & clean root commit
- [x] GitHub repository linkage & collaborator permissions (@marco47t, @MoatazAbdElmutaal)
- [x] Slack MCP integration & GitHub Actions CI alert pipeline
- The three baseline milestones above are inherited from the existing setup documentation; current Slack MCP availability and collaborator settings were not independently verified in this session.
- [x] Shared contract and agent entry points; persistent handoff and product context; five-layer architecture guidance; defect schema/template; SQLite FTS5 search; OpenAPI export/check and CI checks.
- Local validation: `make check` passed 9 CLI integration tests, Python/JSON syntax checks and secret scan; OpenAPI explicitly skipped because the backend does not exist. Workflow YAML parsed locally and all shell blocks passed `bash -n`. Independent read-only agent review found no actionable issues. GitHub CI passed for setup commit `257437b`: https://github.com/MobaileyProject/sudan-phones/actions/runs/43772999213. Both validation and Slack notification steps succeeded. The final setup head `7edc44c` also passed CI (run 43773334088). PR #1 was merged by the user at 2026-11-15 23:10:50 UTC in merge commit `c42344f`. Reviewer-preference PR #2 was also merged by the user at 2026-11-15 23:13:30 UTC (`4f10356`), with passing CI (runs 43773527429 and 43773630089).
- Setup commit: `257437b` — `feat(setup): configure universal dual-agent protocol, state handoff, and search tools`; handoff commit `7edc44c` and merge `c42344f` are now on main. Reviewer-preference commit `112808e` and merge `4f10356` are now on main; use `git log -5 --oneline` for later handoff commits.
- [x] All 14 shared skills installed locally in `.agents/skills/`: seven pinned upstream packages with project adapters and seven marketplace workflows. Catalog: docs/SKILLS.md. No runtime dependencies installed.
- Skills validation: `make check` passes 14 CLI integration tests and validates all 14 packages. Independent source/package review and 14 guided scenario walkthroughs completed. Parser edge case fixed with failing/passing regression and recorded as BUG-2026-001. Vendored whitespace/CRLF is preserved byte-for-byte; the scoped whitespace check passes for authored files. Android/browser/backend execution remains unverified until scaffolded; package checks do not prove application behavior.
- Final setup handoff PR #3 was merged at `32fb346`; setup and the personal-review preference are on main.
- Recent baseline commits: `f84b457` remove setup blueprint PDF; `5b8fbe3` architecture blueprint; `ffe0016` initial protocol and integrations.

## In-Progress Tasks & Active Branches
- Branch: `feature/shared-agent-skills` | Owner: Codex | Status: All 14 skills, catalog, manifest/checker, tests and CI integration ready for publication. Use `gh pr view feature/shared-agent-skills` for the live PR/CI state; the user reviews personally and no organization reviewers should be requested.
- Setup PR #1 and preference PR #2 are merged: https://github.com/MobaileyProject/sudan-phones/pull/1 and https://github.com/MobaileyProject/sudan-phones/pull/2. Older feature/preference branches were recreated by pushes racing with the user’s merges; they are superseded and are not active implementation tasks.
- Remote inspection at setup start: no open PRs or issues. Recheck `gh pr list` / `gh issue list` each session.
- Local user input: `Marketplace_Complete_Product_and_Execution_Blueprint.pdf` is untracked and intentionally preserved. Its tracked product summary is docs/PRODUCT.md; do not stash/delete it or claim it is available in every clone.

## Immediate Next Tasks (Priority Queue)
1. Check the shared-skills PR using `gh pr view feature/shared-agent-skills` and its CI checks; leave review/merge to the user. Pull the merged changes in each agent checkout, refresh skill discovery and consult docs/SKILLS.md. Do not duplicate the skill installation or request organization reviewers.
2. Confirm the stack discrepancy and product decisions with both founders; update docs/PRODUCT.md and docs/ARCHITECTURE.md with MVP, owner roles, pilot region, verification evidence, currency, and contact channels.
3. Scaffold the first approved-store vertical slice in backend/app/{routers,schemas,services,repositories,models}/, add pinned backend dependencies, Alembic and PostgreSQL tests, initialize the Android/Web Preview clients, then `make openapi` and commit docs/openapi.json.

## Known Blockers & Design Decisions
- Explicit setup request selects FastAPI/Kotlin; product PDF specifies Django/Flutter/React. Follow requested stack for this setup; confirm before application implementation.
- User selected feature branch and PR delivery, resolving the conflicting `git push origin main` line. User subsequently directed that they will review PRs personally: never automatically request the other founder/organization members. The earlier request to @MoatazAbdElmutaal was removed. The user merged PRs #1 and #2; the preference is persisted in AGENTS.md. No review requests remain on those PRs.
- No backend exists: OpenAPI export/check must report a scaffold-pending skip until backend Python code is introduced. No placeholder API contract should be committed.
- Slack plugin discovery confirmed Slack is available but not installed/connected in this Codex session; no posting tool is exposed. CI delivery of the PR-opened alert is verified: the Send Slack Notification step succeeded and its code requires Slack API `ok=true`. Review-request alerts are also enabled. A standalone milestone summary remains pending until a Slack-capable agent can post to #project-updates; the GitHub Slack app subscription was not independently verified. Never print or copy Slack secrets.
- Two concurrently running agents need separate checkouts/worktrees; STATE.md is a handoff snapshot, not a distributed lock. Preserve other owners' task entries and check live PRs.
- Shared skills are repository-local and load on demand. Their installed references do not select Supabase hosting, Navigation 3, Hilt, SQLModel, or authorize unrelated dependency/production changes. Exact upstream revisions and licenses are recorded in `.agents/skills/manifest.json`.
