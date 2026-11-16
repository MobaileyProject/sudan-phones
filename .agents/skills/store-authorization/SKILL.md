---
name: store-authorization
description: "Use when implementing or reviewing merchant ownership, store membership, founder permissions, verification gates, suspension, or public listing visibility."
---

# Store Authorization and Visibility

Build an operation matrix before editing: actor, action, store/resource, required
state, allowed result and denial behavior. Get unresolved business rules from the
current product decisions; permission defaults must not silently become policy.

## Procedure

1. Derive identity and memberships from trusted authentication. A submitted store,
   owner or resource ID is a lookup target, never proof of permission. Authorize in
   the service even for non-HTTP callers; scope repository queries to permitted stores.
2. Exercise the same operation as guest, merchant A, merchant B, suspended member
   and authorized founder. Include known foreign IDs and create/read/edit/archive,
   media access, verification decisions, batch routes and export surfaces when present.
3. Treat verification/publication eligibility as a read and write invariant. Check
   direct listing URLs, feeds, pagination, search, and public response fields. Public
   responses must not disclose verification evidence or private device identifiers.
4. For suspension, define the transaction/audit and the cache consistency contract.
   Invalidation work must survive retries. Test warmed caches, delayed/duplicate jobs,
   reapproval, and eligibility changes during concurrent publication.
5. Distinguish server visibility from already downloaded offline content: stale bytes
   cannot be recalled. Define freshness/expiry UX and revalidation rather than promising
   instantaneous removal from disconnected devices.

## Example test matrix row

Merchant A knows merchant B's listing ID and attempts an update. The operation is
rejected using the agreed 403/404 contract, leaves the row/audit unchanged, and
leaks no foreign data. Repeat the check by calling the service directly.

Deliver the operation matrix, negative-path evidence, visibility/cache limits and
any policy decision still needed. No blanket RLS, new roles, or approval powers
are introduced by loading this skill.
Reference: [product](../../../docs/PRODUCT.md).

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
