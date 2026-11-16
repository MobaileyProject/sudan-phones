---
name: property-based-testing
license: CC-BY-SA-4.0
description: "Use when validators, serialization, normalization, money, inventory transitions, or similar code has invariants spanning a meaningful input domain."
---

# property-based-testing

Read the [pinned guide](upstream/GUIDE.md) and only the matching references.
Choose a real invariant, roundtrip or independent oracle rather than translating
the implementation into another expression. Existing examples remain preferable
when there is no useful generative property. Preserve and replay shrunk examples.

For this project consider quantity bounds, money roundtrips at the agreed scale,
normalization idempotence and allowed inventory state transitions; do not invent a
business rule or test a tautology. Generate valid inputs directly and watch for
vacuous tests caused by over-filtering. Concurrency/authorization still need realistic
integration tests; a generated pure function test does not prove PostgreSQL locking.
Reuse the installed PBT framework. If none exists, propose a concrete property and
add a dependency only within the authorized implementation task; adding this skill
does not install Hypothesis or another framework. Deliver the property, generator,
regression example and actual command/result.
The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.

Adapted from Trail of Bits property-based-testing; original attribution and terms
are retained in upstream/LICENSE. Local changes add project scope and prerequisite
handling; the exact source revision is recorded in manifest.json.
