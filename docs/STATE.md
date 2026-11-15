# Project State & Session Handoff

## Current Active Focus
- Publish the implemented and locally verified dual-agent workspace setup for peer review; application scaffolding remains the next milestone.

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
- Local validation: `make check` passed 9 CLI integration tests, Python/JSON syntax checks and secret scan; OpenAPI explicitly skipped because the backend does not exist. Workflow YAML parsed locally and all shell blocks passed `bash -n`. Independent read-only agent review found no actionable issues. Remote CI is pending publication.
- Recent baseline commits: `f84b457` remove setup blueprint PDF; `5b8fbe3` architecture blueprint; `ffe0016` initial protocol and integrations.

## In-Progress Tasks & Active Branches
- Branch: `feature/universal-agent-workspace` | Owner: Codex | Status: Implementation and independent review complete; publishing PR pending.
- Remote inspection at setup start: no open PRs or issues. Recheck `gh pr list` / `gh issue list` each session.
- Local user input: `Marketplace_Complete_Product_and_Execution_Blueprint.pdf` is untracked and intentionally preserved. Its tracked product summary is docs/PRODUCT.md; do not stash/delete it or claim it is available in every clone.

## Immediate Next Tasks (Priority Queue)
1. Finish setup validation (`make check`), commit and push the feature branch, open a PR, record CI/PR results here and request peer review.
2. Confirm the stack discrepancy and product decisions with both founders; update docs/PRODUCT.md and docs/ARCHITECTURE.md with MVP, owner roles, pilot region, verification evidence, currency, and contact channels.
3. Scaffold the first approved-store vertical slice in backend/app/{routers,schemas,services,repositories,models}/, add pinned backend dependencies, Alembic and PostgreSQL tests, initialize the Android/Web Preview clients, then `make openapi` and commit docs/openapi.json.

## Known Blockers & Design Decisions
- Explicit setup request selects FastAPI/Kotlin; product PDF specifies Django/Flutter/React. Follow requested stack for this setup; confirm before application implementation.
- User selected feature branch and PR delivery, resolving the conflicting `git push origin main` line. Never bypass peer review to merge this setup.
- No backend exists: OpenAPI export/check must report a scaffold-pending skip until backend Python code is introduced. No placeholder API contract should be committed.
- Slack plugin discovery confirmed Slack is available but not installed/connected in this Codex session; no posting tool is exposed. Existing GitHub app/CI can deliver supported events; direct milestone/review messages remain pending until delivery is verified. Never print or copy Slack secrets.
- Two concurrently running agents need separate checkouts/worktrees; STATE.md is a handoff snapshot, not a distributed lock. Preserve other owners' task entries and check live PRs.
