# Product Reference and Delivery Context

Source: `Marketplace_Complete_Product_and_Execution_Blueprint.pdf`, provided in the
repository root, November 2026, 25 pages. The binary remains a local user input;
this tracked summary preserves the context across clones. It is a product plan,
not an implemented API/schema or a signed-off decision record.

## Product promise and first milestone

A Sudan-first phone marketplace where only approved stores sell new and used
phones. Customers browse, compare and contact stores; merchants manage inventory;
founders verify businesses and moderate publication. Prioritize Arabic usability,
low-data browsing, weak connectivity, and representative low-end Android devices.

First end-to-end milestone: a store is approved, publishes a phone with real images
and price, a customer finds it and contacts the store, and founders can trace the
verification and publication decisions. This is the first meaningful vertical
slice, rather than separate disconnected screens.

## Rules to preserve

- Guests can discover phones without mandatory customer accounts; account features
  are optional pending founder agreement. No individual private-seller publishing.
- Store eligibility gates public visibility. Suspension must hide ineligible
  inventory. Authorize all mutations by identity, role, and store ownership.
- New-phone offers use quantities and variants; used offers represent specific
  units with condition evidence and single-item availability. Keep private device
  identifiers and business-verification evidence out of public responses.
- Public listing media belongs in object storage/CDN; verification evidence is
  private. Validate/process media before publication. Failed jobs must retry safely.
- Start with PostgreSQL search. Ads, in-app chat, AI, additional categories, more
  countries, dedicated search engines and microservices require demonstrated need.
- Keep C-xx customer, M-xx merchant and A-xx founder screen identifiers in specs,
  designs, tickets, API catalogs and acceptance tests.

## Dependency-led build sequence

1. Agree MVP, pilot region, screen flows, permissions and frontend/backend contracts.
2. Establish application scaffolds, staging, CI, identity and store membership.
3. Implement submission, protected evidence review, verification and audit history.
4. Implement catalog/brand choices, new/used inventory, media and publication gates.
5. Integrate merchant forms, founder review, public search and customer contact.
6. Test cross-role journeys, weak networks, authorization, backup restore and pilot
   operations before a limited verified-store launch.

Backend founder owns security, persistence, business rules and infrastructure;
frontend founder owns mobile/web UX, localization and client integration. Both
approve business rules, trust policies, shared contracts and launch readiness.
Collaborators are Rasheed (@marco47t, backend) and Moataz (@MoatazAbdElmutaal, frontend),
confirmed and agreed under `SCOPE-01` (SPEC-SCOPE-01).

## Confirmed MVP decisions and business invariants (SCOPE-01 / GATE-01)

Agreed by both founders on 2026-11-16 (see `docs/plans/MVP_SCOPE_AND_INVARIANTS.md` and
`docs/memory/DEC-5b03fed1b2fed4f5-mvp-scope-and-stack.md`):

- **Stack & Roles:** Django REST Framework backend (PostgreSQL 16, Celery/Redis, Cloudflare R2),
  Flutter customer app (Arabic RTL first), React merchant/admin portal (Arabic RTL first).
  Rasheed owns backend; Moataz owns frontend. Tooling adoption follows STACK_TRANSITION.md.
- **Scope & Accounts:** Guest browsing and search require NO login. Customer accounts,
  in-app checkout/payments, delivery dispatch, and home banner ads are explicitly deferred post-MVP.
- **Currency & Pilot:** Single currency Sudanese Pound (`SDG`). Initial pilot launch is
  restricted to physical stores in Port Sudan, Khartoum, and Omdurman.
- **Trust & Verification Policy:** Required evidence is National ID + Commercial Register
  or Store Signboard photo, stored in private Cloudflare R2 with founder-only presigned access.
  Store lifecycle: `draft` -> `pending_verification` -> `verified` / `changes_requested` /
  `rejected` / `suspended`. Resubmission supported for changes requested.
- **New vs Used Invariants:** New phones track stock quantity (`quantity >= 1`) with sealed
  indicator and warranty terms. Used phones track discrete individual units (`quantity = 1`)
  with battery health %, physical grade (`like_new`, `excellent`, `good`, `fair`), explicit
  defect notes, and minimum 3 real device photos.
- **Publication Trigger:** Verified store eligibility is required. Automated pipeline publishes
  upon valid media processing. Founder moderation queue (`A-05`) operates post-publication
  with remove, flag, suspend store, and restore actions.
- **API Contracts & Slice:** Ten-field API contract standard agreed for all 60 endpoints.
  First vertical slice spans store registration, verification, listing publication,
  catalog discovery, and direct WhatsApp contact. `GATE-01` / `INT-01` accepted.

## Useful workflows and skill selection

Use the smallest relevant installed skill/tool; do not install arbitrary global
skills or require a proprietary slash command to resume. AGENTS.md and STATE.md
are portable between both agents.

| Work | Useful capability | Completion evidence |
| --- | --- | --- |
| Resume/search | Local `scripts/search_codebase.py`, then bounded `rg` reads | Current branch/PR checked, exact task claimed in state |
| API domain | Five-layer architecture and contract workflow | Domain tests, real PostgreSQL tests, regenerated OpenAPI |
| Defect repair | Structured diagnosis and bug record | Reproduction, regression test, resolved JSON record |
| UI handoff | Figma design-to-code when a real design is provided | Screen ID, permissions, loading/error/offline acceptance |
| Parallel delivery | Separate task/review worktrees | Independent branches, coordinated contracts and migrations |
| Operational updates | Slack MCP if connected, existing GitHub integration | Delivery verified or explicitly pending in state |

Add project-specific scaffolding/migration skills after the application and its
commands exist, so recipes encode verified behavior rather than speculative code.
Antigravity rule discovery follows the [official rules documentation](https://antigravity.google/docs/rules/).
