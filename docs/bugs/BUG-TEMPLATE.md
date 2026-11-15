# BUG-YYYY-NNN: Short defect title

This is an example template, not a discovered defect. Create
`docs/bugs/BUG-YYYY-NNN.json` using the next available ID (check open PRs too).
JSON is the authoritative searchable record; companion Markdown notes are optional.
All fields below are required by SCHEMA.json. Use exact repository-relative paths
and method/path endpoints; use [] when no endpoint is affected. Unknown cause,
fix and regression may be empty while reported; all must be populated on resolution.

```json
{
  "id": "BUG-2026-001",
  "category": "logic",
  "severity": "medium",
  "status": "reported",
  "affected_files": [],
  "affected_endpoints": [],
  "root_cause": "",
  "fix_summary": "",
  "regression_test": ""
}
```

Categories: auth | db | schema | logic | performance | ui.
Severities: critical | high | medium | low.
Statuses: reported | in_progress | resolved.

## Reproduction and evidence

Record minimal inputs, expected/actual behavior and sanitized logs here. Never
include real customer evidence, tokens, passwords or private device identifiers.

## Resolution

Replace unknowns in the JSON. `regression_test` must identify a real test using
`tests/path/test_file.py::test_name` (or the client's equivalent). Record the
verification command/result and fixing commit/PR in these notes and STATE.md.
Run the secret scan and relevant regression suite before resolving.
