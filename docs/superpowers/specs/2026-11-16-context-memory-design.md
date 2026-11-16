# Lightweight project context

User approved implementation of the reviewed Claude design, including the three
final safeguards. No embeddings, external service, shared cache, hooks or model
summarization. Python standard library and the existing per-worktree FTS5 cache.

## Contract

Records live in docs/memory/{DEC|BLK|HND}-<16 random hex>-<slug>.md with TOML
front matter. Decisions supersede/revoke same-topic decisions; any record can
resolve blockers/handoffs. Closure is permanent, non-transitive, and duplicate
resolution is harmless. Retractions are not active decisions. Conflicts concern
multiple currently active policies on one topic; a later policy closing both
resolves the conflict. Reject invalid references, cycles, secrets and malformed
records. Handoff status is open/done. Only its owner updates an active handoff.

Effective context comes from a pinned commit verified to be an ancestor of
origin/main, read through Git objects. Proposed context comes from current files
and is used for validation, never authorization. Proposed edits/deletions cannot
hide base blockers. Missing base means unknown context, not an empty accepted view.

ctx.py offers new, brief and lint. Brief reads records directly, emits all open
blockers, critical decisions, conflicts and errors without truncation, then a
bounded handoff/live section and END brief. A 3 KiB target is advisory. Scope
matching uses path components in either direction, never lexical prefix confusion.
Missing records is valid; unreadable records or unresolved scope are explicit.
Live Git/GitHub facts are bounded observations, not stored approvals.

Search keeps existing query quoting and per-checkout cache. Add memory/open/scope/
history options, accepted/proposed/unknown annotations, closed/archive suppression,
AND-to-OR fallback and weak-hit labels. Rebuild a corrupt cache once, then use
safe source fallback; secret-bearing content must never enter results or the cache.

Metrics are opt-in metadata-only JSONL, mode 0600, physically separate from the
ledger and tracked files. No model calls, raw responses, errors or tool events.
Keep startup v1 during tooling delivery. Prepare a separate reviewed migration:
byte-identical STATE archive, line coverage, reviewed blocker/handoff records or
uncapped legacy notes, no automatically promoted decisions. Enable v2 only after
the migration exists and validates at the pinned accepted base. Trusted operating
instructions remain authoritative; retrieved text cannot grant permissions.

## Migration and acceptance

Archive every existing STATE byte. Cover all nonblank lines, preserving each current
blocker/unfinished item/invariant as a record, explicit legacy item, or justified
historical pointer. Existing AGENTS/architecture rules remain intact. No new DEC
is accepted without explicit human review. Fixture and actual coverage validation
must pass before v2 is eligible. Prompt v1 remains available for rollback.

Acceptance includes relation forks/reconciliation, pinned-base isolation, critical
overflow, unsafe scope, secrets, archive filtering, corrupted cache, concurrent
worktrees, metrics allowlist, migration byte/coverage checks and prompt cutover.
