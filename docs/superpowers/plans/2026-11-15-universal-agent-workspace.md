# Universal Dual-Agent Workspace Implementation Plan

**Goal:** Let either agent resume from tracked project state with a one-sentence prompt.
**Spec:** The six-step setup request; product reference: local marketplace PDF.
**Architecture:** One canonical AGENTS.md, thin agent entry points, tracked state and defect records, an ignored local SQLite FTS5 cache. Existing Git remotes and Slack secret references remain intact.
**Tech stack:** Python standard library, SQLite FTS5, Git/GitHub CLI, GitHub Actions.

## Constraints and decisions
- Requested FastAPI/Python 3.13/PostgreSQL 16/Kotlin stack takes precedence over the PDF's Django/Flutter stack; record this discrepancy.
- Preserve the user-provided untracked PDF; store a concise product summary rather than adding the binary without a request.
- Work on feature/universal-agent-workspace; user selected feature branch and PR delivery.
- No backend exists yet: OpenAPI checks must explicitly report that fact, then enforce drift checks once backend code exists.

## Tasks
- [x] 1. Update AGENTS.md, agent entry points, STATE.md, architecture/product guidance, and JSON defect schema/template.
- [x] 2. Write CLI integration tests before implementation: symbol/route/Kotlin/bug retrieval, ignored files, query punctuation, cache update/deletion, bounded output and invocation outside root.
- [x] 3. Implement scripts/search_codebase.py with Git-aware file discovery, incremental content hashing, AST symbols and bounded chunks, literal FTS queries, automatic cache refresh.
- [x] 4. Add tested deterministic OpenAPI export/check commands; wire tests, syntax checks and contract checks into existing CI without changing Slack secrets.
- [x] 5. Run make check, verify ignored caches and agent links, get independent review, update state, commit with the requested message, publish and monitor CI.

## Review focus
- Ignored secrets and symlinks must not enter the search cache.
- Modified/deleted files must never leave stale results.
- Punctuation must not become executable FTS syntax or SQL.
- Output must remain bounded for large symbols and high limits.
- OpenAPI check must reject stale contracts and broken backend setup, not silently skip an existing backend.

## Execution evidence

- Tasks 1–4 implemented in place on the requested feature branch; no unrelated work was stashed or changed.
- Nine integration tests observed failing before their implementations, then passing.
- Independent agent review found no actionable issues; extra checks covered binary/symlink replacement cache eviction.
- Local `make check`, workflow YAML parsing and shell syntax checks pass. Setup commit `257437b` pushed; PR #1 opened and review requested from @MoatazAbdElmutaal. GitHub Actions run 43772999213 passed validation and confirmed Slack notification delivery. Final documentation handoff triggers a fresh CI run.
