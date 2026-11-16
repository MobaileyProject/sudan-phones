---
name: testing-setup
description: "Use when establishing or reviewing unit, Compose UI, instrumented, screenshot, or end-to-end test infrastructure for an actual Android app."
---

# testing-setup

Inspect the Android scaffold, Gradle wrapper, version catalog, DI and tests
before applying the [pinned Google guide](upstream/GUIDE.md). If the app does not
exist, report scaffold-pending and identify the needed setup task; do not create an
unrequested application merely to make this skill runnable.

Reuse the chosen dependencies. Upstream fallback suggestions such as installing
Hilt/JUnit/Robolectric are options, not permission to replace the project's stack
or install SDKs/frameworks during discovery. Dependency changes must fit the current
implementation task and locked versions. Read reference links relative to upstream/.

Select tests from the behavior: fast domain tests, Compose interaction/state tests,
screenshots for RTL/font scaling, and device integration for real platform behavior.
Use fakes where they preserve semantics and real backend integration for cross-role
journeys. Discover actual Gradle tasks; distinguish local JVM, emulator and device
results. Deliver test strategy, configured commands, observed results and unavailable
SDK/device coverage. A foundation make check pass does not test an Android app.
The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
