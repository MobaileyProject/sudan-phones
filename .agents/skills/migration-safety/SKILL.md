---
name: migration-safety
description: "Use when creating or reviewing Django migrations, schema backfills, PostgreSQL indexes, or database rollout and rollback plans."
---

# Migration Safety

Inspect the actual Django migrations configuration, dependency graph, deployment history and
PostgreSQL version before proposing commands. Use `python backend/manage.py makemigrations --check`
and `python backend/manage.py migrate`.

## Procedure

1. Assign one owner to overlapping schema work. Compare all branch migrations and DDL.
   If migrations are unpublished, coordinate rebasing/rewriting them. If multiple migration
   heads arise from concurrent branches, reconcile using `python backend/manage.py makemigrations --merge`.
2. Make rollout compatible with currently running application versions. Separate
   schema expansion, bounded/restartable data backfills, code switch and later cleanup
   when necessary. Identify lock duration, table size, write load and recovery evidence.
3. For a large live table, assess concurrent index creation and its transaction
   restrictions (e.g. `AddIndexConcurrently`). Plan detection/recovery of invalid indexes
   and distinguish unique constraints from indexes. Verify supported syntax against
   PostgreSQL 16; do not run production DDL merely to validate the skill.
4. On disposable PostgreSQL 16 databases, test fresh migrations and upgrades from each
   relevant prior branch state. Verify resulting schema, data and dependencies. Exercise
   downgrade/rollback only when safe and supported; document irreversible data loss instead
   of advertising a false rollback.
5. Run the configured migration/application checks and review SQL/locking impact.
   If a real PostgreSQL service is unavailable, record that gap rather than claiming
   migration validation from SQLite or a generated SQL file alone.

Deliver revision IDs/graph, rollout order, backfill/recovery strategy and actual
verification results. Reference: [architecture](../../../docs/ARCHITECTURE.md),
[Django migrations](https://docs.djangoproject.com/en/5.1/topics/migrations/).

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
