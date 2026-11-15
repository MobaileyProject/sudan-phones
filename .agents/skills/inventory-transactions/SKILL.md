---
name: inventory-transactions
description: "Use when changing phone stock, new or used inventory, prices, optimistic concurrency, retry safety, or idempotent merchant updates."
---

# Inventory Transactions and Retry Safety

First distinguish absolute stock edits, adjustments and allocation/sale operations.
The marketplace plan is discovery/contact-first; do not invent checkout, reservations
or payment flows. New offers have quantities/variants; used offers describe individual
units. Confirm lifecycle and currency/scale decisions before implementing them.

## Procedure

1. State invariants in examples: permitted quantity range, valid availability
   transitions, money precision, ownership, and whether repeated commands have one effect.
   Use decimal or integer minor-unit amounts with explicit currency and scale, not
   binary floats. Define rounding and invalid-input behavior with the founders.
2. Choose a concurrency strategy for the operation: version comparison for stale
   absolute edits, conditional updates or row locks for atomic adjustments. Enforce
   constraints in the database and keep the service transaction short.
3. For a retriable mutation, scope its idempotency key to actor/store and operation,
   persist the request fingerprint and durable result atomically with the change.
   Equal key/payload returns the original outcome; changed payload has an explicit
   conflict contract. Decide retention and response semantics before coding.
4. Test real PostgreSQL concurrent writers with separate sessions: simultaneous
   duplicates, last permitted decrement, different commands racing, stale versions,
   rollback, and commit followed by response timeout. Never share one SQLAlchemy
   session between concurrent tasks or use SQLite as locking evidence.
5. Test the client retaining the same operation/key after an ambiguous timeout.
   Do not create a fresh mutation just because the first response was lost.

Example: a merchant retries the same stock adjustment after a timeout. The stock
changes once and both successful responses identify the same durable operation.

Deliver invariant and concurrency tests, the selected conflict/idempotency contract,
and any unapproved lifecycle decisions. Reference: [product](../../../docs/PRODUCT.md).

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
