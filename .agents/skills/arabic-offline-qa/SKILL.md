---
name: arabic-offline-qa
description: "Use when implementing or checking Arabic RTL screens, mixed-language phone details, low-data browsing, offline states, reconnect behavior, or ambiguous client mutation timeouts."
---

# Arabic and Offline Quality Checks

Use the relevant C-xx/M-xx/A-xx screen ID and agreed user journey. Find the actual
Android/web test commands and supported versions; do not substitute browser tests
for native Android execution or claim emulator results without running them.

## Procedure

1. Build fixtures mixing Arabic labels, Latin brands/models, quantities, prices,
   currency and international phone numbers. Confirm translation, numeral and currency
   conventions; avoid inventing business policy or an Arabic translation glossary.
2. Check RTL reading/focus order, appropriate bidirectional isolation for numbers and
   phone/model strings, truncation, cursor/copy behavior, contact actions, screen-reader
   labels, font scaling, empty/error states and long text on representative devices.
3. Exercise slow reads, dropped images, airplane mode, intermittent reconnect,
   timeout, token expiry, rotation/process death and stale cached content. Define
   which data may be cached and the freshness indicator; exclude private evidence.
4. For writes, distinguish definitely failed from unknown outcome. Preserve the
   original pending operation/idempotency key across a commit-then-timeout retry.
   Verify one effect and deliberate stale-edit conflict handling when another device
   changes inventory. Do not infer success from a spinner disappearing.
5. Run the actual configured UI/integration tests and capture sanitized evidence.
   Browser throttling helps web QA; native app behavior needs Android tests and a
   device/emulator. Verify performance expectations before declaring a low-end pass.

Example: an offline merchant reconnects after a timed-out save. The UI reconciles
with the durable result without double-adjusting stock or displaying a false success.

Deliver a screen/device/network matrix, observed outcomes and untested combinations.
Reference: [product](../../../docs/PRODUCT.md).

The repository AGENTS.md is the shared operating contract. Use this skill only
for its matching task; do not preload the entire skill collection.
