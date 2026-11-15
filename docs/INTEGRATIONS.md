# GitHub & Slack Integration Architecture

This document provides a comprehensive operational guide on how the repository is connected to GitHub and Slack, and how GitHub events automatically trigger Slack notifications.

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
In [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), a post-validation job runs on every push and pull request. It uses repository secrets:
- `SLACK_BOT_TOKEN`: Authenticated Slack bot token.
- `SLACK_CHANNEL_UPDATES`: Target channel (`C0CHSASMZMK` = `#project-updates`).

Whenever CI runs, it posts a formatted message with commit hash, author, status (passed/failed), and a direct link to the GitHub Actions run.

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
