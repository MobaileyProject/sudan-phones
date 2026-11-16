# Current backend APIs

[Implemented operations](CATALOG.md) and [machine-readable catalog](operations.json)
are generated from the registered OpenAPI schema. [Bootstrap contracts](bootstrap.md)
document the P2 APIs, shared conventions and examples. Run `make openapi` after
endpoint/schema changes; `make openapi-check` rejects schema or catalog drift.

Only implemented application operations belong here. Historical unimplemented
ideas are preserved in [blueprint API proposals](../plans/BLUEPRINT_API_PROPOSALS.md).
They remain planning inputs for later phases and are not current endpoints.

GET implies standard HEAD and OPTIONS support. Django administrative HTML lives
at `/admin/`; schema JSON at `/api/schema/`; Swagger UI at `/api/docs/`. Those
framework/documentation surfaces are separate from the versioned marketplace REST
catalog. Unknown `/api/v1/...` routes receive JSON errors.

The Slack catalog is a view of **merged** APIs. This PR proposes API-019, API-021
and API-061. Reconcile its rows after merge using `operations.json` at the merged
revision; remove unused proposal rows, retain stable IDs for implemented APIs and
add liveness. Do not publish branch-only endpoints as already delivered. Planning
copies retain the original 60 proposals and phase dependencies.
