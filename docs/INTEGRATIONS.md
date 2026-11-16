# GitHub & Slack Integration Architecture

For the Slack Lists backlog, local agy worker, durable claims, scoped permissions,
live access evidence and timer setup, see [Slack automation](SLACK_AUTOMATION.md).

This document describes the inherited GitHub/Slack setup. Per-session tool access can differ: check available tools rather than assuming the Antigravity MCP connection also exists in Codex. Follow [AGENTS.md](../AGENTS.md) for the current contract and record unavailable deliveries in [STATE.md](STATE.md).

---

## 1. How the GitHub Connection is Done

The repository is hosted under the private GitHub organization **`MobaileyProject`**:
- **Repository:** `MobaileyProject/sudan-phones`
- **Protocol:** SSH (`git@github.com:MobaileyProject/sudan-phones.git`)

### Authentication & Access Setup
1. **GitHub CLI (`gh`):**
   - Installed at `~/.local/bin/gh`.
   - Authenticated with scopes: `'gist', 'read:org', 'repo', 'workflow'`.
   - Verified via: `gh auth status`.
2. **SSH Authentication:**
   - Git uses SSH public/private key pairs configured in `~/.ssh/`.
   - Tested with: `ssh -T git@github.com`.
3. **Organization Roles & Administrators:**
   - Both founders (`@marco47t` and `@MoatazAbdElmutaal`) are active administrators in `MobaileyProject`.
   - Repository code ownership is enforced via [`.github/CODEOWNERS`](../.github/CODEOWNERS).

---

## 2. How the Slack Connection is Done

Antigravity AI is connected to the team's Slack workspace (**Elrasheed Workplace**) through two distinct layers:

### A. The Global Slack Skill & MCP Server
- **Global Skill:** Located in `~/.gemini/config/plugins/slack/skills/slack/SKILL.md`.
- **MCP Server Tools:**
  - `slack_post_message`: Send messages to channels or threads.
  - `slack_reply_to_thread`: Threaded replies to keep channels organized.
  - `slack_get_channel_history`: Read recent messages.
  - `slack_get_thread_replies`: Follow conversations in threads.
  - `slack_list_channels`: Discover workspace channels.
  - `slack_add_reaction`: React to messages with emojis.
  - `slack_get_users` & `slack_get_user_profile`: Query team member profiles.
- **Workspace Context:**
  - **Team ID:** `T0CJRU4RSUQ`
  - **Bot User:** `@antigravity_bot` (`U0CJ19ABV36`)

### B. Slack Trigger Guidelines
The agent triggers Slack autonomously during development:
1. **Milestone Completed:** Posts summary to `#project-updates` (`C0CHSASMZMK`).
2. **PR Opened:** Posts link and review request to `#project-updates`.
3. **Question / Human Input Needed:** Posts to `#dev-chat` (`C0CHSASJDQV`).
4. **Defects / Bug Reports:** Posts to `#tasks-and-bugs` (`C0CJ1AM1BHA`).

---

## 3. How GitHub is Linked with Slack

GitHub and Slack are linked using two complementary mechanisms:

```
┌─────────────────────────────────┐
│          GitHub Repo            │
│  (MobaileyProject/sudan-phones) │
└───────────────┬─────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
 ┌───────────┐     ┌───────────┐
 │ GitHub CI │     │  GitHub   │
 │  Actions  │     │ Slack App │
 └─────┬─────┘     └─────┬─────┘
       │                 │
       │ (SLACK_BOT_     │ (/github subscribe
       │  TOKEN)         │  repository)
       ▼                 ▼
┌─────────────────────────────────┐
│        Slack Workspace          │
│      Elrasheed Workplace        │
│       #project-updates          │
└─────────────────────────────────┘
```

### Method A: Automated GitHub Actions CI Alerts
In [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), a post-validation job runs on pushes to main and selected pull-request events targeting main (including opened and review_requested). It uses repository secrets:
- `SLACK_BOT_TOKEN`: Authenticated Slack bot token.
- `SLACK_CHANNEL_UPDATES`: Target channel (`C0CHSASMZMK` = `#project-updates`).

When the token is configured, CI posts validation status, commit hash, and a direct run link, plus PR title/URL/action when applicable. JSON encoding protects titles containing quotes/newlines; the job fails if Slack rejects delivery. Missing secrets skip posting. This does not prove the separate GitHub Slack app subscription is still active; inspect delivery evidence before marking messages sent.

### Method B: Native GitHub Slack App
The official `@github` bot is installed in **Elrasheed Workplace**.
To subscribe any channel directly to repository activity:
```slack
/github subscribe MobaileyProject/sudan-phones
```
To customize notification filters:
```slack
/github subscribe MobaileyProject/sudan-phones commits,pulls,issues,workflows
```
