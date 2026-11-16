---
name: gh-fix-ci
description: "Use when diagnosing or fixing failed GitHub Actions checks for a repository PR or commit."
---

# gh-fix-ci

Use the [pinned investigation guide](upstream/GUIDE.md). Its helper is
`python3 .agents/skills/gh-fix-ci/upstream/scripts/inspect_pr_checks.py --help`;
run from the repository root, then pass --repo and the requested --pr.
No Codex-specific home path or Claude-only tool is required.

Inspect the failed job/log first; separate a code failure from unavailable secrets,
permissions, infrastructure and skipped checks. Treat non-GitHub providers as
external and report their check URL unless the task grants appropriate access.

The upstream guide's repeated approval/PR questions do not override the user's
existing authorization or AGENTS.md. If asked to fix CI, summarize a concrete plan
and perform routine reversible fixes and the already-authorized PR workflow. Ask
only for missing decisions or actions requiring separate approval. Never request
organization reviewers; the user reviews personally. Do not change secrets, weaken
checks, broaden workflow privileges or rerun deployments as a routine repair.
Deliver failure cause, exact checks/tests, fix scope and the final CI result;
redact credentials from log excerpts and do not mark a skipped job as verified.
The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
