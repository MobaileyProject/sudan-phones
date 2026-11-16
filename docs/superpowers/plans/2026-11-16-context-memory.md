# Lightweight Context Implementation Plan

**Goal:** replace growing shared handoffs with scoped records and bounded retrieval.
**Architecture:** standard-library parser and relation engine; Git-backed effective
view; per-worktree FTS5; metadata-only metrics; separately reviewed migration.
**Spec:** docs/superpowers/specs/2026-11-16-context-memory-design.md.
**Execution:** user authorized implementation now; no additional design gate.

## Global constraints

No embeddings, dependencies, shared database, extra model calls or automatic PR
merge. Preserve live worker settings/ledger and other task worktrees. Current
startup remains v1 until a validated migration is present at its trusted base.

## Interfaces

scripts/context_memory.py exports Record(id, kind, path, title, created, meta,
body, raw), View(records: dict[id,Record], statuses: dict[id,str],
conflicts: dict[topic,list[id]], errors: list[str], base: str|None),
resolve_base(root, requested=None)->str, load_effective(root, base=None)->View,
load_proposed(root)->View, parse_record(path,content)->Record,
scope_matches(pattern,path)->bool. Invalid input raises ValueError; view errors
are sanitized and never contain secret values. statuses are active/open/closed/
retracted/done; conflicts are separate. .meta contains front-matter fields.

## Tasks

- [ ] Write failing fixtures for IDs/schema, relation lifecycle/forks/cycles, base
  validation, proposed isolation, critical overflow and scope matching. Implement
  context_memory.py and ctx.py new/brief/lint; verify those fixtures.
- [ ] In parallel, adapt search_codebase.py and add behavioral tests for history,
  memory/scope/open filtering, status isolation, OR fallback and secret exclusion.
- [ ] In parallel, add agy metrics helper/adapter tests with an explicit field
  allowlist and optional private output path; preserve existing v1 behavior.
- [ ] Integrate make/CI lint, guide and task handoff. Run all checks and independent
  review, stage explicit files, scan secrets, commit/push and open tooling PR.
- [ ] Create migration branch/PR: exact STATE archive, coverage file, no novel DEC,
  preserved open context, short stub, updated contract and v2 worker prompt with
  accepted-base cutover guard and v1 rollback. Test fixtures and actual coverage.
- [ ] Verify both PRs/CI and report activation conditions and measured byte/latency
  data honestly. Do not fabricate token savings or enable from unmerged proposals.

## Review focus

Unmerged closures hiding accepted constraints; base spoofing; critical truncation;
deleted/edited records; secrets leaking via caches or diagnostics; migration gaps;
worker prompt losing mandatory policy or its explicit permission-mode setting.
