# API catalog and backend documentation

User direction recorded on 2026-11-16: the API catalog must match the APIs in the
code. This applies to repository API documentation and the
[Slack API Contracts Catalog](https://elrasheedworkplace.slack.com/lists/T0CJRU4RSUQ/F0CHJB5C939).

## Catalog contents

Use the actual registered backend operations and their generated OpenAPI contract
as the source of truth. Identify operations by HTTP method and canonical path;
preserve meaningful API IDs when an existing operation remains implemented.

- Retain operations implemented by the delivered code.
- Remove unused proposed operations from the current API catalog.
- Add new operations introduced by implementation, including health endpoints.
- Update paths, request/response fields, permissions, errors and examples when
  their behavior changes. A matching title alone does not establish parity.
- Document schema/documentation routes and administrative interfaces explicitly
  where the schema generator excludes them. Do not present Django admin pages as
  marketplace REST operations.

Future requirements remain in the delivery plan and blueprint planning sources.
Removing an unimplemented proposal from the current catalog does not cancel its
phase task. Imported proposals are preserved in
`docs/plans/BLUEPRINT_API_PROPOSALS.md`; `docs/api/CATALOG.md` and
`docs/api/operations.json` are generated from actual registered operations.

## Delivery workflow

1. Finish and verify BE-01 with its current owner before starting dependent BE-02.
   Review the stack transition, actual Django scaffold, PostgreSQL migration/test
   evidence, schema exporter, CI and shared skill adapters. An In progress Slack
   row or uncommitted scaffold is insufficient completion evidence.
2. Continue the backend tasks in the ordered delivery plan. Phase 2 BE-02 covers
   public configuration/localization and shared error/contract conventions.
3. For every endpoint or schema change, run `make openapi`, review the generated
   contract and update the affected domain documentation in the same PR. Run the
   contract drift check and appropriate backend tests.
4. Reconcile the Slack catalog against the exact reviewed implementation revision;
   report which revision it describes. Keep branch proposals out of the current
   delivered catalog until the implementation is merged. Enumerate additions,
   removals and changes before applying the update and read the result back.
5. Verify that every implemented application operation has a catalog entry and
   every current entry has an implemented operation. Check complete pagination
   when reading Slack Lists. Preserve the delivery roadmap and phase task Lists.

## Documentation required with code

Document reproducible local setup, pinned dependencies, configuration variable
names, PostgreSQL setup/migrations, architecture and domain responsibilities,
service-owned transactions, permissions and store scoping, and relevant MVP
invariants. Keep credentials out of code, examples, logs and documentation.

For each API, document its method/path, purpose, phase/backend task and consuming
screens, request/query validation, response schema, authentication/authorization,
status/error meanings, pagination/filtering, state changes, and representative
examples. Mark unresolved choices explicitly; do not invent implemented behavior.

Record exact validation commands and outcomes, missing prerequisites and remaining
work. Use the accepted context protocol for durable decisions and unfinished
handoffs. Preserve unrelated work, personal PR review, CI checks and the existing
Slack notification rules. A documentation or instruction check does not establish
runtime correctness.
