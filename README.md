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
