# Slack Delivery Blueprint Publication Plan

> Agentic workers: use executing-plans for the publication work; application work
> is separately authorized through scoped backlog items, never this import.

**Goal:** Publish the complete blueprint as owned, dependency-aware Slack work with
linked proposed APIs and reviewable repository stack changes.

**Architecture:** Keep the existing worker/backlog. Add reference Lists for roadmap
and API contracts. Each task carries stable source ID, stage, explicit owner role,
prerequisites, contract links, handoff and acceptance. Preserve all existing rows.

**Tech stack:** Planning follows Django REST/Flutter/React as directed by the user;
repository adoption is proposed in docs/plans/STACK_TRANSITION.md.

**Owner:** Codex; branch docs/slack-delivery-plan; base origin/main b69124d.
**Source:** Published blueprint snapshot, not browser-local edits; see
[blueprint-source.json](../../plans/blueprint-source.json).

## Constraints

- Rasheed/backend; Moataz/frontend; both approve business rules/contracts/releases.
- Native assignment only to verified workspace users. Moataz is named in work but
  remains unassigned until his Slack account can be found; do not invite implicitly.
- No task becomes Ready/agy by importing. PR ready is review pending, not Done.
- API operations are Proposed until an actual agreed contract/implementation exists.
- Preserve private config/ledger, existing List IDs and source-key deduplication.
- Keep Later scope explicit. Accounts/home promotions require scope decisions.

## Steps

- [x] Snapshot the 33 source screens, 14 milestones, eight stages and 60 unique APIs;
  verify literal extraction without executing downloaded JavaScript.
- [x] Create/share the roadmap and API reference Lists; persist returned IDs before
  further requests and stop on uncertain creation instead of duplicating.
- [x] Import stable keyed operations and phase/milestone gates with named ownership.
- [x] Import separate frontend, backend and joint integration work into the existing
  backlog with contract/dependency links and exact completion criteria.
- [x] Read back every imported row, compare fields and owner assignments, verify no
  Ready/agy import, check counts and preserve all pre-existing rows.
- [ ] Let agy write concise verified channel messages; post and verify their IDs.
- [ ] Commit proposed stack transition, source/plan/catalog and Slack links; stage
  exact files, scan secrets, run make check, open a personal-review PR and monitor CI.

## Verification focus

Cross-store access, verification/publication gating, stale stock/price conflicts,
private evidence access and Arabic/offline behavior belong to relevant task gates.
Frontend can use agreed fixtures while backend is built; integration waits for the
backend's deployed contract and both real clients. Navigation links are not build
prerequisites; do not turn cyclic screen navigation into cyclic task dependencies.
