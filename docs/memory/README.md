# Project memory records

Use `python3 scripts/ctx.py brief` for accepted context and `brief --scope <path>`
before editing an area. Use search first for older decisions; read required skills
whole. See [CONTEXT.md](../CONTEXT.md) for schema, relation semantics, migration,
metrics, authority and rollback. Records here do not grant execution permissions.

If ctx.py or SQLite fails, run `python3 scripts/context_memory.py` (optionally
`--base <sha>`). Require its base header and END fallback; parse errors or unresolved
scope require inspection and can block affected work. If Python/tomllib or the
trusted base is unavailable, stop affected work. Grep finds mentions, never closure.
