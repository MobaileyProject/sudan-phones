# Agent Operating Instructions & Collaboration Protocol

This repository is developed concurrently by founders paired with autonomous AI agents. This document defines how agents operate Git, GitHub, testing, code review, and Slack notifications.

---

## 1. Autonomous Agent Collaboration Protocol

Agents must perform Git and GitHub operations autonomously using Git and the GitHub CLI (`gh`).

### A. Starting Work
Whenever assigned a development task or issue:
1. **Inspect Working Tree:** Run `git status` to verify current branch and workspace cleanliness.
2. **Preserve Uncommitted Work:** Never discard uncommitted work. If unstaged/staged work exists, stash it with a descriptive message (`git stash push -m "wip: <task-description>"`).
3. **Fetch Remote State:** Run `git fetch origin --prune` to get the latest branches and pull requests.
4. **Inspect Open PRs & Issues:** Check `gh pr list` and `gh issue list` to prevent duplicate or conflicting work.
5. **Branch off `main`:**
   ```bash
   git checkout main
   git pull --ff-only origin main
   git checkout -b <prefix>/<short-description>
   ```
   Branch taxonomy:
   - `feature/*`: New features and functionality
   - `fix/*`: Bug fixes and defect corrections
   - `refactor/*`: Non-functional code improvements
   - `docs/*`: Documentation and workflow guides

### B. Completing Work
After implementing changes:
1. **Run Local Validation Suite:**
   - Secret scan: `python3 scripts/check_secrets.py`
   - Run project-specific tests and linters.
2. **Commit with Conventional Commit:**
   ```bash
   git add <modified-files>
   git commit -m "<type>(<scope>): <summary>"
   ```
3. **Push Feature Branch:**
   ```bash
   git push -u origin <branch-name>
   ```
4. **Create Pull Request Autonomously:**
   ```bash
   gh pr create --base main --fill
   ```
5. **Monitor CI & Trigger Slack Update:**
   Post a link to the PR in Slack `#project-updates` (see Slack Trigger Protocol below).

### C. Reviewing Another Developer's PR
1. **Fetch PR State:** Run `gh pr view <pr-number>` and `gh pr diff <pr-number>`.
2. **Test in Isolated Git Worktree:** Never pollute the primary workspace:
   ```bash
   git worktree add ../review-pr-<number> <pr-branch>
   cd ../review-pr-<number>
   # Run validation suite
   cd - && git worktree remove ../review-pr-<number>
   ```
3. **Submit GitHub Review:**
   ```bash
   gh pr review <pr-number> --comment -b "Review findings..."
   # Or approve:
   gh pr review <pr-number> --approve -b "Verification passed. Changes approved."
   ```

### D. Merging Pull Requests
An agent may merge a PR only when:
1. All automated CI checks pass.
2. The PR is not marked as a draft.
3. Peer human/agent review approval is recorded.
4. Merge using squash: `gh pr merge <pr-number> --squash --delete-branch`.

---

## 2. Slack Integration & Trigger Protocol

The agent is connected to the team's Slack workspace (**Elrasheed Workplace**) via the Slack MCP server and `@antigravity_bot`.

### A. Channels & Ownership
- **`#project-updates` (`C0CHSASMZMK`):** Automated CI feeds, PR creations, milestone completions, and deployment status.
- **`#dev-chat` (`C0CHSASJDQV`):** Architecture questions, trade-off decisions, and questions requiring human input.
- **`#tasks-and-bugs` (`C0CJ1AM1BHA`):** Bug reports, defect alerts, and backlog tracking.
- **`#resources` (`C0CHZGW3GL9`):** Architecture documentation, repo links, and environment setup notes.

### B. When the Agent MUST Trigger Slack
The agent should automatically call `slack_post_message` in the following scenarios:
1. **Milestone Completed:** When a major feature or setup phase is completed, post a brief summary to `#project-updates`.
2. **Pull Request Opened:** When a new PR is pushed and opened, post the PR title and URL to `#project-updates`.
3. **Blocking Decision or Question:** When the agent needs human guidance or design choice, post the question to `#dev-chat`.
4. **Critical Build/Test Failure:** When a build breaks or CI fails unexpectedly, notify `#project-updates` or `#tasks-and-bugs`.

---

## 3. GitHub & Slack Integration Linking

1. **GitHub Actions Slack Webhook:** Configured in `.github/workflows/ci.yml` using repository secrets `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_UPDATES`.
2. **Slack GitHub App:** Official GitHub integration (`@github`) installed in workspace. Subscriptions to `MobaileyProject/sudan-phones` in `#project-updates` stream commits, PRs, and issues in real time.
