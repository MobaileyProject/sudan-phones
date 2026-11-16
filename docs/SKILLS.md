# Shared Skills for Codex and Antigravity

All 14 approved skills live in `.agents/skills/<name>/SKILL.md`. They are shared
repository assets, not machine-specific global installs. Open the repository root
in either agent after pulling the branch; start a fresh session or use the client's
skill reload feature if its catalog has not refreshed.

Read only the skill matching the current task. Descriptions are discoverable up
front; full procedures and upstream references are loaded on demand. AGENTS.md
remains the operating contract, including the user's personal PR-review preference.
A skill does not grant permission for external actions or install runtime tools.

## Upstream-backed skills

Each entrypoint below is a project adapter. The pinned original entry is retained
as `upstream/GUIDE.md` with its resources and license, so it cannot be discovered
as a second SKILL.md. Exact commit SHAs, paths, license files and payload hashes
are in [the manifest](../.agents/skills/manifest.json).

| Skill | Source | Use and local adaptation |
| --- | --- | --- |
| [supabase-postgres-best-practices](../.agents/skills/supabase-postgres-best-practices/SKILL.md) | [Supabase](https://github.com/supabase/agent-skills/tree/c9be0e931b7930f7d02126d04774d904c381e7d7/skills/supabase-postgres-best-practices) | PostgreSQL schema/query/index/pool/locking guidance. Keeps PostgreSQL 16, Django ORM and atomic service transactions; does not select Supabase hosting/Auth or RLS. |
| [security-best-practices](../.agents/skills/security-best-practices/SKILL.md) | [OpenAI](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices) | Requested security work on supported Python/web languages. Explicitly does not certify Kotlin or authorize unrelated hardening/external scans. |
| [playwright-cli](../.agents/skills/playwright-cli/SKILL.md) | [Microsoft](https://github.com/microsoft/playwright-cli/tree/b21724888b8100b05ef8dee3a92f2bb03bf4dcde/skills/playwright-cli) | Real browser interactions, web QA and evidence. Checks installed tools, isolates sessions and distinguishes web from native Android coverage. |
| [testing-setup](../.agents/skills/testing-setup/SKILL.md) | [Google / Android](https://github.com/android/skills/tree/c72942584fff970dac86ced78b367fce0c441e52/testing/testing-setup) | Android test strategy and infrastructure. Preserves selected DI/frameworks; no automatic Hilt/SDK/framework installation or unrequested scaffold. |
| [navigation-3](../.agents/skills/navigation-3/SKILL.md) | [Google / Android](https://github.com/android/skills/tree/c72942584fff970dac86ced78b367fce0c441e52/navigation/navigation-3) | Navigation 3 routes, deep links and restoration when that library is selected. Does not authorize a migration or choose the library. |
| [property-based-testing](../.agents/skills/property-based-testing/SKILL.md) | [Trail of Bits](https://github.com/trailofbits/skills/tree/149d7b21f4067765b82e67029730b42d228ef4b4/plugins/property-based-testing/skills/property-based-testing) | Meaningful input-domain properties and shrunk counterexamples. Avoids tautologies/vacuity; no implicit new test dependency. |
| [gh-fix-ci](../.agents/skills/gh-fix-ci/SKILL.md) | [OpenAI](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/gh-fix-ci) | Diagnose GitHub Actions failures with the bundled helper. Honors existing fix/PR authorization and does not request organization reviewers or weaken CI. |

Upstream material retains its bundled terms: OpenAI, Microsoft and Android packages
include Apache 2.0 licenses; Supabase includes MIT; Trail of Bits includes
CC-BY-SA-4.0. The property-based-testing adaptation is attributed and marked
CC-BY-SA-4.0 as well. No repository-wide license change is implied.

## Marketplace-specific workflows

| Skill | Trigger and expected evidence |
| --- | --- |
| [api-domain-workflow](../.agents/skills/api-domain-workflow/SKILL.md) | Endpoint/schema/domain changes: views, serializers, domain services, real contract regeneration and catalog updates under Django REST Framework. |
| [store-authorization](../.agents/skills/store-authorization/SKILL.md) | Ownership, verification and visibility changes: actor/action matrix, cross-store denials, suspension/cache coverage and explicit offline visibility limits. |
| [inventory-transactions](../.agents/skills/inventory-transactions/SKILL.md) | New/used stock, price or retried mutations: defined invariants, real PostgreSQL concurrency tests, idempotency and stale-edit behavior. Does not invent checkout/reservations. |
| [migration-safety](../.agents/skills/migration-safety/SKILL.md) | Django migrations, schema/backfill/index changes: dependency graph, deployment compatibility, upgrade/recovery evidence on PostgreSQL 16. |
| [arabic-offline-qa](../.agents/skills/arabic-offline-qa/SKILL.md) | RTL/mixed-script and connectivity work: screen/device/network matrix, accessible text behavior, pending-operation reconciliation and truthful coverage. |
| [secure-media-workflow](../.agents/skills/secure-media-workflow/SKILL.md) | Images/evidence/jobs: purpose/owner access matrix, quarantine/decode checks, private evidence isolation and replay-safe publication state. |
| [defect-to-regression](../.agents/skills/defect-to-regression/SKILL.md) | Confirmed bug fixes: targeted search, reproduction, failing/passing regression, accurate docs/bugs record and handoff. No fabricated defects or backend files. |

## Availability versus runtime readiness

All skill instructions are present. The backend, migrations, Android and web apps
have not been scaffolded. Skills must report that fact rather than claim they ran
nonexistent commands. Adding this collection did not install SDKs, browser binaries,
PostgreSQL, Hypothesis, Gradle dependencies or hosting services.

The CI helper can be inspected without network access:

```bash
python3 .agents/skills/gh-fix-ci/upstream/scripts/inspect_pr_checks.py --help
make skills-check
make check
```

For a real CI investigation pass `--repo . --pr <number>` after checking access.
Other runtime commands are discovered from the application's actual setup, not
assumed from the skill's upstream examples. Upstream reference paths are relative
to the directory containing upstream/GUIDE.md.

## Maintenance and verification

- Download a candidate update to temporary storage using skill-installer at an
  explicit source revision. Review changed instructions, resources and licenses.
- Preserve the adapter's project decisions. Rename the original entry to GUIDE.md
  when packaging; retain its resource layout and source/license attribution.
- Deliberately update the manifest source SHA and payload digest only after review.
  `scripts/check_skills.py` defines the deterministic digest; it is a local integrity
  check against the reviewed manifest, not a signature or remote authenticity check.
- Preserve original upstream whitespace and line endings along with other payload
  bytes. When checking authored changes, use
  `git diff --cached --check -- . ':(top,exclude,glob).agents/skills/*/upstream/**'`
  rather than rewriting upstream snapshots to satisfy whitespace style.
- Run `make skills-check` and `make check`. The checker validates discoverable entry
  metadata, local links from those entries, pinned revisions, licenses, duplicate
  discovery and upstream payload integrity. It does not validate all upstream example
  links or prove that application workflows work against unbuilt applications.
- The seven custom scenarios were evaluated without skills first, then all 14 skill
  scenarios were inspected with their entrypoints and relevant resources. The baseline
  already followed the main architecture rules; no measured performance/behavioral
  improvement is claimed. Re-evaluate skills with real tasks as the apps are built.
