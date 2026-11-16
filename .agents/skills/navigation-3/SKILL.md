---
name: navigation-3
description: "Use when implementing Jetpack Navigation 3 routes, deep links, saved back stacks, conditional navigation, or a requested Navigation 3 migration."
---

# navigation-3

Read the relevant recipe from the [pinned Google guide](upstream/GUIDE.md).
Check the actual app's selected navigation library and locked versions before using
Navigation 3 APIs. This skill is available on demand; its presence does not choose
Navigation 3, authorize a migration, add DI or create an Android scaffold.

When Navigation 3 is the approved choice, map the screen IDs and typed route
arguments, caller-visible access states, Back behavior and restoration. Exercise
deep links, logged-out entry, logout/back-stack clearing, multiple stacks and
process recreation on the actual supported Android test setup. Never put private
evidence, bearer tokens or sensitive identifiers in public links. Client navigation
is not server authorization. Reuse existing DI/ViewModel decisions rather than
introducing the guide's example frameworks as mandatory dependencies.

Deliver routes/state changes, actual UI-test evidence and compatibility limits;
consult arabic-offline-qa for reconnect and RTL acceptance.
The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
