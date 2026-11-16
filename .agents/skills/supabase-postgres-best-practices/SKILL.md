---
name: supabase-postgres-best-practices
description: "Use when designing PostgreSQL schemas, indexes, queries, connection pools, locking, or investigating database performance in this project."
---

# supabase-postgres-best-practices

Use the [pinned guide](upstream/GUIDE.md) and load only the relevant references
under upstream/references/. This is general PostgreSQL guidance, not a decision to
adopt Supabase hosting, Auth or RLS. Retain PostgreSQL 16, SQLAlchemy 2 repositories,
service-owned transactions and Alembic single-head migrations from AGENTS.md.

Read actual schemas, queries and query plans before optimizing; distinguish measured
bottlenecks from hypotheses. A sequential scan can be the cheapest correct plan;
compare selectivity, row estimates, buffers and statistics rather than treating every
scan as a missing index or repeating blanket exponential-slowdown claims. Use the
[PostgreSQL 16 EXPLAIN reference](https://www.postgresql.org/docs/16/using-explain.html)
to interpret measured plans. EXPLAIN ANALYZE executes its statement: do not use it
on production mutations without authorization. Test concurrency with real PostgreSQL.
For schema rollout use migration-safety. Do not run imports, restores or live DDL
merely because the upstream guide mentions them. Deliver the chosen index/query/pool
change, supporting measurements and database-test limitations.
The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
