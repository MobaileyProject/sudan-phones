---
name: playwright-cli
description: "Use when automating or investigating real browser flows, merchant/web forms, screenshots, browser errors, or web UI interactions."
---

# playwright-cli

Read the [pinned CLI guide](upstream/GUIDE.md), loading only command/reference
details needed for the task. Check command availability and project package scripts.
Use the project's existing browser tooling or its installed playwright-cli; inspect
--help for the installed version. If missing, record the prerequisite and install it
only when the browser task authorizes dependency changes. Adding this skill alone
does not install Node, browsers or Playwright.

Use isolated browser sessions for concurrent agents, current snapshots/locators and
sanitized traces/screenshots. Prefer existing E2E tests for repeatable regression;
manual browser automation is not a substitute for a passing test suite. Keep login
state and tokens out of Git. Scope actions to the requested environment and flow;
do not submit live merchant data, contact users or perform production mutations
without task authorization. Browser results establish web behavior, not Android.
Deliver observed steps, console/network failures, artifacts and untested cases.
The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
