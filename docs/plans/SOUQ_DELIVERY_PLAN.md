# Souq Phone delivery plan

Source: [published diagram](https://preview-chat-d59fa41d-a7de-46a1-b545-0898397f953f.space-z.ai/). The snapshot includes 33 screens, 14 milestones, eight phases and 60 proposed API operations. Browser-local edits/scratch cards are not part of the shared snapshot.

User direction: Rasheed (`marco47t`) owns Django REST backend; Moataz (`MoatazAbdElmutaal`) owns Flutter customer app and React merchant/founder UI. Both approve business rules, shared contracts, integration gates and release readiness.

- [Delivery roadmap](https://elrasheedworkplace.slack.com/lists/T0CJRU4RSUQ/F0CHUDFCXKP) — eight gates and fourteen milestone references.
- [Implementation backlog](https://elrasheedworkplace.slack.com/lists/T0CJRU4RSUQ/F0CHWFG1BD4) — separate backend, frontend and joint integration items; the original List and existing tasks are preserved.
- [API contracts](https://elrasheedworkplace.slack.com/lists/T0CJRU4RSUQ/F0CHJB5C939) — operation, screen consumers, backend task, inputs, response content, permissions and contract status.

Native Slack assignment is verified for Rasheed. Moataz was not found in the current workspace member list, so frontend work is explicitly named but its people field remains unassigned until he joins. No invitations were sent.

## Start here

1. Jointly resolve SCOPE-01: MVP/out-of-scope, pilot region, verification evidence/appeals, currency/contact policy, optional customer accounts and home promotion scope. The diagram stack and owner roles are already selected by the user.
2. Review [the proposed repository transition](STACK_TRANSITION.md). Current operating rules/exporter/skills still target FastAPI/Kotlin until the transition changes are reviewed. Handle operating-contract/CI-policy changes in a dedicated reviewed session, not a queued agy task.
3. Accept GATE-01 and agree each API contract before releasing its implementation. Backend and frontend can work in parallel against agreed examples/fixtures.
4. Use the phase tasks below. Real integration waits for reviewed backend availability and both client implementations; record schema/version/environment and actual test evidence.
5. Mark the phase complete only after its INT acceptance item passes and both founders accept the evidence. A single PR, mock UI or screenshot cannot satisfy a shared gate.

## Daily handoff and status meaning

Rasheed takes `[BE]` work; Moataz takes `[FE]` work. `[JOINT]`/INT items are shared. Titles carry phase and stable task/screen IDs. Details carry prerequisites, API operations, handoff and acceptance. Open the API catalog for the current agreed operation/status; do not guess payloads from UI field labels.

| State | Meaning / next owner |
| --- | --- |
| Backlog | Planning only; owner confirms scope, prerequisites and contract |
| Ready + executor agy | Explicit authorization for one bounded task in the existing worker; not bulk execution of a phase |
| In progress | Claimed or actively being implemented |
| Blocked | Name the missing prerequisite/decision and responsible owner; do not invent it |
| PR ready | Scoped implementation awaits personal review; preserve its tests/limits |
| Done (work item) | Reviewed implementation merged; scope/validation limits remain visible |
| Phase Done | All required scoped work plus joint INT evidence accepted; not inferred from one work-item status |

No imported item was made Ready or assigned agy. All new implementation rows start Backlog. Existing worker execution and merged-PR reconciliation remain in place. API readiness and cross-list dependency gates are explicit human-maintained planning fields; automatic cross-list enforcement was not added by this import.

API flow: Proposed → Agreed → Backend ready → Integrated. Deferred remains later scope. Agreed means both founders accepted the ten-field contract and fixtures; Backend ready requires the actual backend PR/environment and test evidence; Integrated requires the corresponding clients and real journey checks. No endpoint is represented as implemented just because it appears in the diagram.

## Delivery phases

### P1: Planning

Finalize business rules, screen inventory, user journeys and MVP scope.

Prerequisite: SCOPE-01. Joint acceptance: INT-01 / GATE-01.

**Rasheed/backend:** Business rules for new vs used; Verification policy draft.

**Moataz/frontend:** Journey maps (Zones 2–4); Screen inventory with IDs.

Handoff: MVP scope + screen spec cards (Zone 5) agreed (ref: `docs/plans/MVP_SCOPE_AND_INVARIANTS.md`).

Complete when:
- MVP scope signed off (Agreed 2026-11-16 by Rasheed & Moataz under SPEC-SCOPE-01)
- Screen IDs fixed (33 screens: C-00..C-10, M-01..M-13, A-01..A-09)
- Priority labels set
- Status: GATE-01 / INT-01 ACCEPTED; unlocks P2 Foundation.

### P2: Foundation

Initialize backend, mobile app, web portal, database, repository and CI.

Prerequisite: GATE-01. Joint acceptance: INT-02 / GATE-02.

**Rasheed/backend:** Django + DRF project; PostgreSQL schema baseline; CI + tests; R2 bucket.

**Moataz/frontend:** Flutter app skeleton; React portal skeleton; Design tokens, AR/EN + RTL setup.

Handoff: API contract format + OpenAPI skeleton.

Complete when:
- Repos + CI green
- Apps render hello world
- DB migrations run

### P3: Identity & Verification

Backend builds auth and merchant approval rules while frontend builds the forms and screens.

Prerequisite: GATE-02. Joint acceptance: INT-03 / GATE-03.

**Rasheed/backend:** Auth & sessions; Roles + object permissions; Verification workflow; Audit events.

**Moataz/frontend:** Login / register (C-07, M-01); Business info & evidence upload (M-02, M-03); Verification status (M-04).

Handoff: Auth + verification endpoints contract-tested.

Complete when:
- Unverified store cannot publish
- Audit trail records decisions
- Both languages render

### P4: Catalog & Listings

Backend builds product, listing, inventory and media functionality; frontend builds new/used listing forms.

Prerequisite: GATE-03. Joint acceptance: INT-04 / GATE-04.

**Rasheed/backend:** Catalog product & variant models; Listing + inventory + price history; Media authorization & processing; Minimum audited publication moderation before public discovery.

**Moataz/frontend:** New phone form (M-07); Used phone form (M-08); Inventory table (M-09, M-10); Publication status (M-13); Listing moderation queue/actions (A-05).

Handoff: Listing CRUD + media upload contract.

Complete when:
- New listing = quantity
- Used listing = individual unit
- Draft → pending → published flow

### P5: Customer Discovery

Backend builds search and public listing APIs; frontend builds the Flutter browsing experience.

Prerequisite: GATE-04. Joint acceptance: INT-05 / GATE-05.

**Rasheed/backend:** Search + filters + pagination; Public listing visibility rules; Store profile API.

**Moataz/frontend:** Home (C-01); Search & filters (C-02); Details (C-03); Store profile (C-04); Compare (C-06).

Handoff: Public catalog endpoints contract-tested.

Complete when:
- Guests can browse
- Filters compose & paginate
- Details handles all listing states
- Suspended/moderated listings disappear from real public search (A-05 / INT-05)

### P6: Merchant & Admin Operations

Complete inventory management, moderation, permissions and administrative workflows.

Prerequisite: GATE-05. Joint acceptance: INT-06 / GATE-06.

**Rasheed/backend:** Moderation actions + audit; Roles & permissions admin (A-06, A-07); Announcement delivery rules.

**Moataz/frontend:** Admin overview & queues (A-01…A-05); Merchant dashboard polish (M-05, M-11); Contact seller (C-05).

Handoff: Admin workflows contract-tested.

Complete when:
- Dual approval on critical ops
- Moderation actions auditable
- Admin never enters merchant UI

### P7: Integration & Testing

Connect real APIs, test both interfaces, verify security and fix problems.

Prerequisite: GATE-06. Joint acceptance: INT-07 / GATE-07.

**Rasheed/backend:** Integration test suite; Security review; Performance & backups.

**Moataz/frontend:** E2E flows on real APIs; Offline / error states; Accessibility pass.

Handoff: Full journey tests: register → verify → list → discover → contact.

Complete when:
- No critical bugs
- Security checklist green
- Both languages complete

### P8: Controlled Launch

Deploy production, onboard initial verified stores, monitor and collect feedback.

Prerequisite: GATE-07. Joint acceptance: INT-08 / GATE-08.

**Rasheed/backend:** Production deploy; Monitoring & alerts; Backup & restore drill.

**Moataz/frontend:** Store listing pre-launch checks; Pilot feedback channels.

Handoff: Go / no-go review against release gates.

Complete when:
- Runbook executed
- First stores verified
- Feedback loop running

Verification sequencing correction: A-02/A-03/A-04 are built with P3 identity/verification rather than waiting for P6. Otherwise a merchant can submit evidence but nobody can complete the approval journey. P4 verifies A-05 moderation state, audit and merchant status; INT-05 verifies its public-search removal criterion when search exists. SCOPE-01 settles the publication trigger (automatic eligibility/media readiness versus explicit manual approval); no approve action is inferred from the source moderation API. Public discovery remains gated on eligible published inventory.

## Backend work

| Task | Phase | Deliverable | Prerequisites |
| --- | --- | --- | --- |
| BE-01 | P2 | Django/DRF foundation and real API contract tooling | SCOPE-01 + GATE-01 |
| BE-02 | P2 | Configuration, localization and shared API conventions | BE-01 + GATE-01 |
| BE-03 | P3 | Identity, sessions and scoped authorization | GATE-02 |
| BE-04 | P3 | Store profile, membership and merchant settings | GATE-02 + BE-03 |
| BE-05 | P3 | Verification evidence, founder review and decisions | GATE-02 + BE-03 + BE-04 |
| BE-06 | P4 | Product catalog, models, brands and variants | GATE-03 |
| BE-07 | P4 | New/used listings, publication, stock and price | GATE-03 + BE-06 |
| BE-08 | P4 | Authorized media upload and processing | GATE-03 + BE-03 + BE-04 |
| BE-09 | P5 | Public discovery, store profiles and seller contact | GATE-04 + BE-02 + BE-06 + BE-07 |
| BE-10 | P6 | Merchant/founder operations, roles and audit | GATE-05 + BE-03 + BE-05 |
| BE-11 | Later | Saved listings, advertising and announcements after MVP | Accepted later-scope decision |
| BE-12 | P8 | Deployment, monitoring and backup/restore readiness | GATE-07 |

## Frontend screen work

| Task/screen | Phase | Deliverable | Proposed APIs |
| --- | --- | --- | --- |
| FE-00 | P2 | Flutter customer and React merchant/admin foundations | Shared conventions / shell |
| C-00 | P2 | Application Entry | API-019, API-021 |
| C-01 | P5 | Homepage | API-020, API-029, API-028 |
| C-02 | P5 | Search & Filters | API-022 |
| C-03 | P5 | Product Details | API-023, API-025 |
| C-04 | P5 | Store Profile | API-036, API-037 |
| C-05 | P6 | Contact Seller | API-024 |
| C-06 | P5 | Compare Offers | API-027 |
| C-07 | P3 | Customer Account | API-049, API-047, API-048, API-002 |
| C-08 | Later | Saved Listings | API-026, API-058, API-003 |
| C-09 | P2 | Loading, Empty & Offline States | Shared conventions / shell |
| C-10 | P5 | Categories & Brands | API-014, API-018 |
| M-01 | P3 | Merchant Registration | API-051, API-052 |
| M-02 | P3 | Business Information | API-060, API-030 |
| M-03 | P3 | Business Verification | API-056, API-057 |
| M-04 | P3 | Verification Status | API-035 |
| M-05 | P6 | Merchant Dashboard | API-032 |
| M-06 | P4 | Create Listing — Select Type | API-015, API-016, API-017 |
| M-07 | P4 | New Phone Listing Form | API-054, API-050 |
| M-08 | P4 | Used Phone Listing Form | API-054, API-050 |
| M-09 | P4 | Inventory Management | API-033, API-038 |
| M-10 | P4 | Price & Stock Updates | API-039, API-040 |
| M-11 | P6 | Store Settings | API-059, API-055, API-004 |
| M-12 | Later | Advertisement Management | API-053, API-031 |
| M-13 | P4 | Listing Publication Status | API-034 |
| A-01 | P6 | Administrative Overview | API-009 |
| A-02 | P3 | Store Verification Queue | API-011 |
| A-03 | P3 | Review Store Evidence | API-012, API-013 |
| A-04 | P3 | Verification Decision | API-046 |
| A-05 | P4 | Listing Moderation | API-008, API-044 |
| A-06 | P6 | Roles & Permissions | API-010, API-045, API-001 |
| A-07 | P6 | Audit Logs & Dual Approval | API-006, API-043 |
| A-08 | Later | Advertisement Review | API-007, API-042 |
| A-09 | Later | Platform Announcements | API-041, API-005 |

## Example: store verification handoff

Rasheed owns BE-03/BE-04/BE-05; Moataz owns M-01 through M-04 and A-02 through A-04. Agree registration/session, profile, evidence submission/status, private review and decision contracts first. Moataz can build the forms/queues against agreed fixtures while Rasheed implements the real endpoints. Then test register → submit profile/evidence → founder review → decision → merchant status using real roles and APIs. Verify non-owner access fails, evidence stays private, decisions have reasons/audit history and unverified stores cannot publish. INT-03/GATE-03 closes only on that evidence and joint acceptance.

## Contract agreement checklist

- Endpoint & HTTP method
- Input parameters
- Request body
- Response schema
- Authentication requirements
- Authorization scope
- Error responses
- Pagination & filtering
- Side effects & business-state changes
- Acceptance tests

Every endpoint task must agree concrete request/response JSON, validation/error semantics and examples; input labels in the source are not finalized request schemas. Canonical trailing-slash/versioning rules, auth/session handling, pagination/filtering, stale-write conflicts and idempotency must be decided explicitly where relevant. Generated OpenAPI comes only from the real backend when it exists.

## Scope and release safeguards

- Customer accounts are marked MVP by the diagram but were optional in the product reference. Guest discovery stays public; founders must settle optional-account scope.
- Home promotions appear on an MVP screen while advertising management is Later. Core home must work without advertising; advertising/announcements/saved listings remain deferred until accepted.
- Backend unverified/suspended-store visibility, cross-store permissions, private evidence/media, new-vs-used inventory and optimistic concurrency are mandatory task/integration gates.
- Arabic/RTL, mixed scripts, low data, stale price/stock display and offline/retry behavior are shared acceptance, not post-launch polish.
- Source "Production Deployment"/launch milestones are planning references, not deployment authorization. Use a reviewed runbook, explicit authorization and joint go/no-go.
- The context PRs #9/#10 and live worker stay separate. This PR proposes the stack transition; it does not merge them, rewrite security policy, deploy or launch an application.

## Provenance

Source SHA-256: `34011bc89ccb7203979ba2ebc13b03727668abfe4444df731d9b4738199b9f28`. [Full source data](blueprint-source.json), [publication manifest](slack-plan-manifest.json), [proposed API catalog](../api/BLUEPRINT_PROPOSED.md), and final verified IDs in slack-plan-links.json preserve traceability. Source milestones and all screens are retained; implementation tasks use stable keys to prevent duplicate imports.

## Publication evidence

The import read back every desired field and native owner, verified 136 unique
records/source keys and preserved all original backlog rows. Two summaries were
posted and their exact text read back:

- [Project update](https://elrasheedworkplace.slack.com/archives/C0CHSASMZMK/p1794804376569969)
- [Shared references](https://elrasheedworkplace.slack.com/archives/C0CHZGW3GL9/p1794804406291319)
- [Planning/stack proposal PR #11](https://github.com/MobaileyProject/sudan-phones/pull/11)

Native API/gate statuses remain planning fields, not inferred implementation proof.
