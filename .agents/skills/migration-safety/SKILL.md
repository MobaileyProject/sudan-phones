---
name: migration-safety
description: "Use when creating or reviewing Alembic migrations, divergent heads, schema backfills, PostgreSQL indexes, or database rollout and rollback plans."
---

# Migration Safety

Inspect the actual Alembic configuration, revision graph, deployment history and
PostgreSQL version before proposing commands. No migration infrastructure exists
in the foundation repository; do not invent a working make migration target.

## Procedure

1. Assign one owner to overlapping schema work. Compare all branch heads and DDL.
   If revisions are unpublished, coordinate rebasing/rewriting them. If deployed,
   preserve history and reconcile with an explicit merge/follow-up revision.
   A graph merge alone does not fix incompatible DDL; finish with exactly one head.
2. Make rollout compatible with currently running application versions. Separate
   schema expansion, bounded/restartable data backfills, code switch and later cleanup
   when necessary. Identify lock duration, table size, write load and recovery evidence.
3. For a large live table, assess concurrent index creation and its transaction
   restrictions. Plan detection/recovery of invalid indexes and distinguish unique
   constraints from indexes. Verify supported syntax against the project's PostgreSQL
   and Alembic versions; do not run production DDL merely to validate the skill.
4. On disposable PostgreSQL 16 databases, test a fresh upgrade and upgrades from each
   relevant prior branch state. Verify resulting schema, data and one head. Exercise
   downgrade only when safe and supported; document irreversible data loss instead
   of advertising a false rollback.
5. Run the configured migration/application checks and review SQL/locking impact.
   If a real PostgreSQL service is unavailable, record that gap rather than claiming
   migration validation from SQLite or a generated SQL file alone.

Deliver revision IDs/graph, rollout order, backfill/recovery strategy and actual
verification results. Reference: [architecture](../../../docs/ARCHITECTURE.md),
[Alembic branches](https://alembic.sqlalchemy.org/en/latest/branches.html).

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
