---
name: defect-to-regression
description: "Use when reproducing and fixing a confirmed defect, investigating recurring failures, or recording a resolved bug in docs/bugs."
---

# Defect to Regression

Search existing records and targeted code before reading large files. Run
`python3 scripts/search_codebase.py "relevant terms" --limit 5`, then inspect the
exact source and previous tests. A hypothetical weakness is not a discovered bug.

## Procedure

1. Capture minimal input, expected/actual behavior, environment and sanitized evidence.
   Reproduce the failing behavior. Separate an implementation defect from a missing
   dependency, unsupported environment, bad fixture or unapproved product decision.
2. Add the smallest test that reproduces the actual failure at the right boundary;
   run it and confirm why it fails. Reuse existing tests when they already cover the
   reported case; do not invent a root cause just to add another regression.
3. Fix the cause, run the regression and applicable suite, and inspect side effects.
   For the local search tool use temporary Git repositories and the existing unittest
   CLI suite; backend/client commands must be discovered from their real scaffolds.
4. Create the next unused docs/bugs/BUG-YYYY-NNN.json after checking open PRs. Follow
   [SCHEMA.json](../../../docs/bugs/SCHEMA.json) and use exact existing affected paths,
   method/routes or [] for affected_endpoints, and a real path/test identifier.
   Populate root_cause, fix_summary and regression_test before status becomes resolved.
5. Record reproduction, fixing PR/commit and verification in the handoff. Run
   make check and the actual relevant regression suite before declaring resolution.

Example: a reproduced search-cache defect has scripts/search_codebase.py as an
actual affected file, [] endpoints, and tests/test_workspace_tools.py::test_name
only when that named test has really been added. Never invent backend bug records.

`make lint` checks schema JSON syntax; it does not validate bug records against the
schema. If semantic validation is unavailable, inspect conformity and state that
limit. Loading this skill does not create a sample defect or resolve a bug by itself.

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
