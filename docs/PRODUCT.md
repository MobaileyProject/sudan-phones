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
Collaborators are @marco47t and @MoatazAbdElmutaal; individual role assignment must
be confirmed rather than inferred from usernames.

## Decisions still needed

- PDF selects Django REST, Flutter and React. This setup request explicitly selects
  FastAPI/Python 3.13, PostgreSQL 16, Kotlin/Jetpack Compose and Web Preview. Follow
  the latter for workspace guidelines; confirm before substantive scaffolding.
- Pilot region/stores; required verification evidence and appeal policy; customer
  contact channels and privacy; minimum new/used fields; currency, stock and price
  freshness; optional accounts; initial ads scope; provider availability in Sudan.

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
