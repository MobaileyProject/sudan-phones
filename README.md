# Project Workspace

Fresh, clean workspace configured with autonomous AI agent operating instructions, GitHub collaboration, and Slack integration.

- **GitHub Repository (Private):** [MobaileyProject/sudan-phones](https://github.com/MobaileyProject/sudan-phones)
- **Slack Workspace:** **Elrasheed Workplace**
- **Connected Bot:** `@antigravity_bot`

---

## Documentation & Architecture

- **Agent Operating Manual:** [`AGENTS.md`](AGENTS.md)
- **GitHub & Slack Integration Architecture:** [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md)
- **Pull Request Template:** [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)
- **Code Owners:** [`.github/CODEOWNERS`](.github/CODEOWNERS)
- **CI & Slack Workflow:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

---

## Slack Channel Routing

| Channel | ID | Routing Purpose |
|---|---|---|
| **`#project-updates`** | `C0CHSASMZMK` | CI build alerts, milestone completions, PR announcements |
| **`#dev-chat`** | `C0CHSASJDQV` | Daily discussions, architecture trade-offs, agent questions |
| **`#tasks-and-bugs`** | `C0CJ1AM1BHA` | Backlog tracking, defects, issue management |
| **`#resources`** | `C0CHZGW3GL9` | Environment guides, references, documentation links |

---

## Pre-Commit Verification

Before committing changes:
```bash
python3 scripts/check_secrets.py
```

## Resume with either agent

Open this repository in Codex or Antigravity and say:

> Continue from docs/STATE.md; follow AGENTS.md and take the highest-priority unclaimed task.

For review:

> Follow AGENTS.md, read docs/STATE.md, and review PR #<number> in an isolated worktree.

[Living state](docs/STATE.md) · [Product context](docs/PRODUCT.md) ·
[Architecture](docs/ARCHITECTURE.md) · [Defect template](docs/bugs/BUG-TEMPLATE.md)

Antigravity's `.agents/rules/workspace.md` points to the canonical `AGENTS.md`.
`.codex/instructions.md` links to the same file; root `AGENTS.md` remains the
primary entry point. Open the repository root so the workspace rules are found.

Search locally without dependencies (Python with SQLite FTS5 and Git required):

```bash
python3 scripts/search_codebase.py "verification" --limit 5
python3 scripts/search_codebase.py "BUG-2026-001" --rebuild
make check
```

Search refreshes its ignored `.search_index.db` cache on each invocation, including
new, changed and removed files. It indexes Python symbols/decorators and bounded
text chunks for Kotlin, web source, documentation and defect records. It respects
Git ignores, excludes symlinks/hidden directories and credential filenames, and
never uses network services. Queries use literal words (all must match within a
chunk), not arbitrary FTS syntax; try fewer terms if needed. Output is capped at
5,000 characters, with exact repository-relative paths and numbered source lines.
Files over 1 MiB and unsupported binary formats (including PDFs) are excluded.
Use `--root /path/to/checkout` to search another checkout.

`make openapi` / `make openapi-check` generate/check the real backend contract once
`backend/app/main.py` exists. Until then, they explicitly report a pending scaffold.
The existing secret scanner checks tracked/staged files: stage intended new files
before running `make check`. Application lint/test/build commands must be added
when each application is scaffolded.

## Shared agent skills

All 14 approved skills are tracked in [`.agents/skills/`](.agents/skills/) for
Codex and Antigravity. The [skill catalog](docs/SKILLS.md) explains their triggers,
prerequisites and pinned upstream sources. Use a fresh session or your client's
skill reload capability to refresh discovery after pulling this branch.

```bash
make skills-check
```

Adding these instruction packages does not install their runtime tools or change
the chosen application stack. Only the relevant skill and references are loaded
for a matching task.
