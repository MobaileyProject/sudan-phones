# Shared Agent Skills Implementation Plan

**Goal:** Add all 14 researched skills for Antigravity and Codex in one tracked `.agents/skills/` collection.
**Spec:** User approved all seven upstream candidates and seven marketplace-specific workflows from the researched shortlist.
**Architecture:** Pinned upstream payloads retain references, scripts and licensing under each skill's `upstream/`; a short portable SKILL.md adapts their use to AGENTS.md. Custom skills describe task procedures without duplicating the operating contract. A manifest and zero-dependency validator check discovery metadata, resource integrity and local links in CI.

## Constraints
- No organization reviewer requests. Publish one feature-branch PR after the result is ready; leave merge to the user.
- No SDK/browser/database/application dependency installation as a side effect of adding instruction packages.
- SQLAlchemy 2 and service-owned transactions remain canonical. Backend/client code is absent; do not invent test commands or claim runtime verification.
- Preserve the local untracked PDF and Git/Slack configuration.

## Tasks
- [x] Resolve pinned upstream revisions; fetch packages using the skill-installer helper; inspect bundled resources and licenses.
- [x] Add project adapters for postgres, security, Playwright, Android testing/navigation, property-based testing and CI repair.
- [x] Add API-domain, store authorization, inventory transactions, migration safety, Arabic/offline QA, secure media and defect/regression workflows.
- [x] Add manifest validation with meaningful failing/passing tests for missing metadata/resources and tampered upstream payloads; wire into make check.
- [x] Validate skill discovery and evaluate realistic scenario routing/application; review independently; record outcomes and limitations.
- [x] Prepare catalog, AGENTS.md and STATE.md, stage intended files, run secret scan and make check.
- Publication: commit/push feature/shared-agent-skills and open its PR without reviewer requests; use `gh pr view feature/shared-agent-skills` and `gh pr checks` for live publication/CI state.

## Evaluation evidence
- A read-only no-new-skill baseline exercised seven project scenarios before authoring. It already honored the existing architecture and permission rules. These new skills package on-demand reference procedures; no claim of measured behavioral improvement is made from that baseline.
- Baseline identified a useful boundary: existing make lint validates schema syntax, not defect-record conformity. The defect skill must not claim records were schema-validated by that command.
- Mechanical validation tests and guided scenario evaluations will be recorded on completion; browser/Android/backend application execution remains unavailable until scaffolded.

- All 14 entrypoints passed the skill-creator validator. Source review confirmed all seven installed payloads match installer snapshots byte-for-byte after renaming the original entry to GUIDE.md and retaining licenses.
- All 14 guided scenarios applied the intended task/prerequisite boundaries; this was an instruction walkthrough, not Android/browser/backend runtime execution.
- Review found a same-line/scalar parsing bug in the new checker; the regression was observed failing on four malformed descriptions, then passing after the parser fix. Recorded in docs/bugs/BUG-2026-001.json.
- All 14 CLI tests and make skills-check pass. CI helper --help works without network. No SDK, browser or application dependencies installed; no reviewer requests made.

- Full git whitespace checking reports upstream trailing spaces and CRLF license lines. Those source bytes are intentionally preserved; the scoped check excluding immutable upstream payloads passes for all authored files.
