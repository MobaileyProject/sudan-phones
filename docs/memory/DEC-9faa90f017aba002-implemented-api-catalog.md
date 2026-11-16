+++
id = "DEC-9faa90f017aba002"
title = "Keep API catalog equal to implemented backend operations"
created = "2026-11-16"
topic = "implemented-api-catalog"
paths = ["backend", "docs/api", "docs/openapi.json", "scripts/export_openapi.py", "docs/plans"]
refs = ["file:docs/api/CATALOG_POLICY.md", "file:docs/plans/ORDERED_STEP_BY_STEP_PLAN.md"]
+++
User direction, 2026-11-16: check the selected-stack foundation work, then continue
backend development after BE-01 is complete. Coordinate with its existing owner;
do not duplicate or overwrite the active foundation implementation.

The API catalog must describe exactly the operations implemented in the code:
retain implemented operations, remove unused proposals from the current catalog,
and add operations introduced during development. Apply the same rule to the
Slack API Contracts Catalog F0CHJB5C939. Keep future requirements in the delivery
plan so catalog cleanup does not cancel planned features.

Document backend setup, architecture, configuration, domain rules, endpoint
contracts, examples and validation alongside each implementation. Preserve the
phase dependencies, agreed MVP invariants, review gates and existing operating
requirements. This record captures requirements, not completion evidence or
authorization to merge/deploy.
