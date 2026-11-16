# Lightweight project context

This tooling stores small durable records, searches locally with SQLite FTS5, and
builds startup context directly from Git objects. It adds no model calls, network
retrieval, embeddings, background indexing, or new Python dependencies. Python
3.11+ is required for `tomllib`; the project and CI target Python 3.13.

## Release and activation

The tooling release preserves the existing startup contract and worker prompt v1.
A separate migration PR archives STATE byte-for-byte, accounts for its nonblank
lines, preserves outstanding work, and changes the startup instructions. Only after
that PR is reviewed and merged can `context_prompt_version: 2` be enabled in the
private worker config. Deploy the reviewed tooling to the single idle worker before
merging the migration: its compatible v1 prompt then follows either base contract.
The worker rejects v2 unless migration coverage and the new
contract exist in its trusted base. Never activate it using proposed local notes.

Metrics are opt-in: set `metrics_path` to an absolute file in a private directory
outside the repository and separate from the job ledger. Keep the parent directory
mode 0700. The file is mode 0600 and contains only allowlisted numeric counters and
safe identifiers. No prompt, response, task details, error text, conversation ID,
credentials or tool events are logged. Disabled metrics add no work. Compare around
10 fresh v1 runs with 10 comparable v2 runs; report medians/ranges. Missing usage
counters stay unknown; token counts are not subscription charges. No savings claim
is justified before those measurements.

## Commands

```bash
python3 scripts/ctx.py brief
python3 scripts/ctx.py brief --scope backend/listings
python3 scripts/ctx.py brief --all
python3 scripts/ctx.py new decision listing-uniqueness
python3 scripts/ctx.py new blocker stack-confirmation
python3 scripts/ctx.py new handoff follow-up --task RecExample
python3 scripts/ctx.py lint
python3 scripts/ctx.py lint --changed "$(git rev-parse origin/main)"
python3 scripts/search_codebase.py "inventory revision" --limit 5
python3 scripts/search_codebase.py "inventory" --memory --open --scope backend
python3 scripts/search_codebase.py "old decision" --history
python3 scripts/context_migration.py
```

`CTX_BASE` or `brief --base <sha>` pins accepted context. Otherwise the base is
`git merge-base HEAD origin/main`. The pin must be an ancestor of the fetched
`origin/main`; an unmerged branch cannot authorize itself. Fetch at session startup,
not inside retrieval. A rebase does not move an explicit pin. Re-pinning is deliberate
and requires re-reading context. Offline accepted context can be stale; it is never
proof of current approvals or CI status.

`brief` reads records and Focus from that base, not the working tree or SQLite. It
prints every open blocker, critical decision, conflict and parse/validation error;
3 KiB is an advisory target, never a reason to drop one. Handoffs are capped by
default; `--all` removes the cap. `--scope` additionally includes noncritical active
decisions. Paths match at component boundaries in either direction; `*` is global.
Records without optional paths are global. Live PR inspection has a 3-second timeout
and unavailable results are explicitly unknown.

Brief exits 0 when complete, 3 with conflicts/invalid records, and 4 when incomplete.
A complete brief ends in `END brief`. Scoped work must stop on overlapping open
blockers, unresolved conflicts or unreadable/unknown-scope context. A task explicitly
asking to resolve a named blocker or change a named policy authorizes that work;
a proposed record alone does not. Finish separable unaffected work and report IDs.

## Records

Files live at `docs/memory/<TYPE>-<16 random hex>-<slug>.md`. `ctx new` generates
64 random bits with `secrets.token_hex(8)`, checks base and working-tree filenames,
and refuses overwrite. Collisions are improbable rather than impossible; duplicate
IDs fail lint. Slugs are cosmetic. TOML front matter uses delimiter lines `+++`.

Required common fields: `id`, `title` (at most 100 characters), `created` (ISO date).
Only these additional fields are supported:

| Field | Meaning |
| --- | --- |
| `topic` | Required DEC policy topic; lowercase slug |
| `critical` | DEC boolean; true requires paths |
| `paths` | Repo-relative path prefixes; required for BLK and critical DEC |
| `supersedes`, `revokes` | DEC IDs on the same topic; DEC-only, mutually exclusive |
| `resolves` | BLK/HND IDs; allowed on any record |
| `status`, `task` | HND-only; required open/done status and optional task identifier |
| `refs` | Pointers with pr:, commit:, bug:, run:, or file: kinds |
| `observed` | Historical evidence, each entry ending in @commit-sha |
| `aliases` | Optional author-written alternate wording; benefit not yet measured |

A DEC is active unless superseded or revoked. A DEC with revokes is a retraction,
never a policy. BLKs are open until resolved; HNDs require open status and no resolver.
Closure is explicit, permanent and non-transitive: closing a replacement never
reactivates its predecessor. Two active DECs on one topic conflict. Multiple
resolutions or revocations are idempotent. A later DEC superseding both competing
policies resolves the current conflict. Invalid relation edges close nothing.

Records are append-only; an owning task may edit its own HND status, and reviewed
typo/link corrections are allowed. Meaning changes require a new record. Only merged
records at the base are effective. Working-tree records are proposals; search labels
both versions and retains the accepted original even if edited or deleted locally.
Lint prints proposed closures, edits and deletions for the PR description. Lint
cannot prove that human review happened; branch protection and personal review remain
the acceptance policy. Records never grant permissions, broaden scope, merge PRs,
relax checks or change worker configuration.

Lint exits 1 on malformed records, unsafe paths, unknown fields, duplicates, bad
relations/cycles, oversized bodies, secret-pattern hits or invalid observations.
With `--changed`, a conflict involving changed records exits 2; pre-existing conflicts
are reported without blocking unrelated PRs. Main lint lists conflicts; brief still
flags them as unsafe. Bodies over 1.5 KiB warn, over 3 KiB fail. Age/count warnings
never make CI fail. Regex secret detection is a tripwire, not a complete secret scanner.

## Retrieval and fallback

Search keeps the disposable per-worktree `.search_index.db`. It excludes archives
and closed/retracted records by default, tries AND then OR on zero hits, and labels
matches with fewer than half the terms WEAK. No match prints the attempted queries
and a `git grep` suggestion. Returned text is capped at 5,000 characters. Required
skills must be read whole through their existing entrypoints; `.agents` is excluded.
An index error triggers one rebuild then safe direct-source search. Secret-pattern
sources are never indexed; finding one removes the old cache before rebuilding.
Unknown accepted state suppresses no records and is labeled UNKNOWN.

If the CLI or cache fails, use the independent direct-source front end:

```bash
python3 scripts/context_memory.py --base "$CTX_BASE"
```

It uses the same tested TOML/relationship semantics and prints `END fallback` only
when base records were read. Grep is for locating files; mentions never prove
closure. If Python/tomllib, Git objects or the memory directory are unavailable,
context cannot be established: block affected work. There is no weaker grep-based
closure parser.

The migration checker verifies source SHA/blob, byte-identical archive, exactly-one
nonblank-line coverage, evidence for historical closures, discoverable legacy notes,
and open record targets at migration introduction. Committed coverage is immutable;
its original target/legacy proof uses that introduction snapshot so later legitimate
resolution or archival does not keep items open forever. Current archive byte integrity
still must hold. No decision is auto-promoted from historical notes. The
migration PR must list every nonhistorical item for personal review. Roll back by
restoring v1 config and reverting the migration PR; preserve records/history.
