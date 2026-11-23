# Sudan Phones — Frontend Design Comparison Prompt

Use this same prompt in all three models. It covers Step 2 and the following four steps—Steps 3–6—with React Native replacing Flutter.

---

Design the frontend experience for “Sudan Phones” — سوق الموبايلات في السودان — a marketplace connecting customers with verified physical phone stores in Sudan.

Create a polished, cohesive, interactive visual prototype covering:
1. A React Native customer app for Android and iOS.
2. A responsive React merchant web portal.
3. A responsive React founder/admin web portal.

This is a FRONTEND DESIGN task only. Use realistic mock data and local interactions. Do not build backend services, databases, real authentication, API integrations, infrastructure, or deployment workflows. Do not spend the response explaining backend architecture.

Deliver actual screens and connected interactions, not merely a written proposal or landing page. If your environment cannot render React Native, create an interactive mobile-sized preview that faithfully represents native React Native screens, and state that limitation briefly.

## Product context

Sudan Phones helps people discover new and used phones, compare verified store offers, and contact stores through WhatsApp or phone calls.

Primary users:

- Customers browsing phones, often on modest Android devices and limited mobile data.
- Merchants managing a physical store and its inventory.
- Founders reviewing store applications, overseeing listings, and managing platform operations.

Pilot cities:

- بورتسودان / Port Sudan
- الخرطوم / Khartoum
- أم درمان / Omdurman

Currency: Sudanese Pound, SDG / جنيه سوداني.

Product boundaries:

- Guests can browse, search, compare, and contact stores without signing in.
- Only verified physical retail stores can sell.
- No individual customer selling.
- No cart, checkout, payments, escrow, delivery tracking, or in-app messaging.
- No paid advertisements, sponsored campaigns, or fabricated customer ratings.
- Customer registration and saved favorites are deferred. The roadmap’s C-07 account screens may appear as a clearly separate optional concept, but must not interrupt or become a requirement for the main customer journey.
- Do not add unrelated features.

## Visual direction

Choose a distinctive, professional visual direction suitable for a trusted Sudanese phone marketplace. You have creative freedom over the palette and visual language.

Aim for:

- A recognizable product identity rather than a generic dashboard template.
- Clear typography, strong hierarchy, balanced spacing, and useful information density.
- Excellent phone photography and consistent image treatment.
- Trust cues that are visible without overwhelming the merchandise.
- Clean native mobile interactions for customers.
- Efficient, practical workspace layouts for merchants and administrators.
- Consistency across all three experiences while respecting their different tasks.
- Restrained motion and useful feedback.
- A complete light theme. A dark theme is optional only after the required experience is complete.

Arabic is the default language and RTL is the default layout. Provide an English LTR switch with equivalent layouts and translated interface text.

Use real Arabic interface copy, not lorem ipsum. Handle mixed text such as:

- “سامسونج Galaxy S24 Ultra”
- “iPhone 13 Pro — 256 GB”
- “850,000 ج.س”

Keep phone numbers, model identifiers, and technical values readable inside RTL layouts. Mirror directional navigation appropriately; do not blindly mirror product images or brand marks.

Create a shared design system with:

- Colors and semantic status colors.
- Arabic and English typography.
- Spacing, radii, elevation, and icon conventions.
- Buttons, inputs, selectors, tabs, badges, cards, tables, dialogs, bottom sheets, notifications, and upload components.
- Consistent focus, pressed, disabled, loading, success, and error states.

Use comfortable touch targets, accessible contrast, keyboard-friendly web forms, visible focus indicators, and status labels that do not depend on color alone.

## Scope: Step 2 — Foundations and client shells

### FE-00: Shared design foundation

- Customer mobile navigation.
- Responsive merchant navigation.
- Responsive founder/admin navigation.
- Shared bilingual design system.
- Clearly separated merchant and administrator workspaces.
- Desktop web layouts with an intentional tablet and narrow-screen adaptation.

### C-00: Application entry and startup

- Branded splash/startup screen.
- Language selection or accessible language switch.
- Startup loading, startup failure, and retry states.
- City selection.
- “Use my location” interaction with an explanation before permission.
- Simulated location detection selecting a supported city.
- Manual fallback when permission is denied, location is unavailable, or the location is outside the pilot cities.
- Users can change the selected city at any time.
- Do not require location permission to browse.

### C-09: Reusable loading, empty, offline, and error states

- Skeleton phone cards and list/table loading.
- No search results with clear filter-reset actions.
- Empty merchant inventory with a create-listing action.
- Empty review queues.
- Offline banner with readable previously loaded content.
- First launch offline with no cached content.
- Retry and reconnect feedback.
- Image loading failures with useful placeholders.
- Form validation and submission failures.
- Pending or uncertain save state that does not falsely report success or invite duplicate submission.

## Scope: Step 3 — Identity, store onboarding, and verification

### Merchant access

- Sign-in screen.
- Registration.
- Phone number entry with +249 context.
- OTP verification, invalid-code state, resend feedback, and countdown.
- Account recovery.
- Clear field labels and inline validation.

### M-01: Merchant registration

- A guided, understandable onboarding flow.
- Progress indicator.
- Clear explanation of what is needed to become a verified store.

### M-02: Business information

- Store name.
- Pilot city.
- Market/street address and location description.
- Store contact number and WhatsApp number.
- Store description and identity imagery where useful.
- Save and continue, back navigation, validation, and saved progress feedback.

### M-03: Verification evidence upload

- National ID front and back.
- Commercial registration OR a storefront/signboard photograph.
- Clear explanation that these documents are private and visible only to authorized reviewers.
- Desktop drag-and-drop and mobile-friendly file selection.
- Upload progress, preview, replace, remove, failed upload, and retry.
- Completion checklist before submission.
- Submission confirmation.

### M-04: Verification status tracker

Represent these states clearly:

- Draft.
- Submitted / awaiting review.
- Changes requested.
- Verified.
- Suspended.
- Rejected.

Include:

- Status timeline and readable next steps.
- Reviewer feedback.
- Correct-and-resubmit flow for changes requested.
- Appropriate support guidance for rejected or suspended stores.
- Listing creation/publication locked while the store is ineligible, with an explanation and a relevant next action.
- Verified status unlocking merchant operations.

### Founder/admin access

- Administrator sign-in and an access-denied state.
- Keep administrative navigation distinct from the merchant experience.

### A-02: Store verification queue

- Searchable table/list of store applications.
- Store name, city, submission time, and status.
- Status and city filters.
- Pending counts.
- Open-review action.
- Loading and empty states.

### A-03: Store evidence review

- Store and applicant summary.
- Contact details.
- Document preview with zoom or expanded inspection.
- Evidence checklist.
- Review history and previous feedback.
- Private-document styling; documents must never appear in public store profiles.

### A-04: Verification decisions

- Approve store.
- Request changes with an actionable reason.
- Reject with a required reason.
- Confirmation dialog and clear outcome.
- Merchant-facing result reflected in the prototype.

### Optional C-07 concept

If included, keep customer sign-in, registration, recovery, and profile screens in a separate optional route. Main browsing must remain fully accessible to guests. Do not add saved favorites to the core experience.

## Scope: Step 4 — Catalog, listings, inventory, and moderation

### M-06: Select listing type and device

- New versus used phone selection.
- Searchable brand → model → variant selection.
- Storage, RAM where relevant, and color.
- Clear selected-device summary.
- Multi-step progress and back navigation without losing entered values.

### M-07: New phone listing

- Device/variant summary.
- SDG price.
- Stock quantity.
- Warranty type and duration in months.
- Sealed-box indicator.
- Product images and store seal photograph.
- Preview, save draft, and publish actions.
- Clear validation and unsaved-change handling.

### M-08: Used phone listing

Treat each used phone as one individual physical unit, not a stock quantity.
Include:

- SDG price.
- Condition: Like New, Excellent, Good, Fair.
- Battery health percentage or “Not verified.”
- Explicit defects, scratches, and replaced-parts description.
- Original-box availability.
- Store inspection/return warranty in days.
- At least three real-unit photographs: front, back, and powered-on screen.
- Photo previews, ordering, removal, replacement, progress, and failure states.
- Listing preview and completion checklist.

### M-09: Inventory management

- Searchable, filterable inventory.
- Phone image, model/variant, new/used condition, price, stock/availability, and publication status.
- Filters for condition, availability, and status.
- Edit and view actions.
- Desktop table and mobile card/list adaptation.
- Empty inventory and no matching results.
- Clear distinction between new-device stock quantities and individual used units.

### M-10: Quick price and stock updates

- Efficient inline editing or compact dialog.
- Current value and proposed value.
- Save/cancel and clear feedback.
- Used-unit availability controls.
- Price-change history.
- Conflict state when another staff member has changed the same listing.
- Uncertain save state with an understandable resolution action.

### M-13: Publication status

Use this publication model:

- Draft.
- Uploading/processing photographs.
- Needs correction or processing failed.
- Published and discoverable.
- Flagged for review.
- Removed or hidden due to store suspension.

Important: a verified store’s valid listing becomes public after automated validation and image processing. It does not wait for routine manual founder approval.

Show progress, reasons for problems, and the next available action.

### A-05: Founder listing moderation

This is post-publication oversight.

- Review queue of live listings.
- Listing images, merchant identity, price, condition, and relevant details.
- Search and status filters.
- Clear/approve.
- Flag for correction with reason.
- Remove listing with reason.
- Suspend store with a stronger confirmation and explanation of the effect on all its listings.
- Updated status and audit feedback.
- Do not depict every listing as waiting for manual approval before publication.

## Scope: Step 5 — Customer discovery, search, and comparison

### C-01: Customer homepage

- City selector.
- Prominent search.
- Brand shortcuts.
- New/used entry points.
- Organic featured phones and latest arrivals.
- Verified store spotlights.
- Clear SDG prices and condition labels.
- Useful, consistent bottom navigation.
- No paid banners or unrelated promotional clutter.

### C-02: Search and filters

- Search with realistic phone queries.
- Results count.
- Active filter chips.
- Filter bottom sheet or equivalent native interaction.
- Brand, model, new/used condition, storage, price range, and city.
- Sort by price and newest.
- Apply, clear, and reset actions.
- No-results recovery.
- Preserve search and scroll context when returning from a listing.

### C-03: Listing details

- Swipeable photo gallery with image count and expanded viewing.
- Device name and variant.
- SDG price.
- New/used condition.
- Storage, RAM, and color where applicable.
- New-device seal and warranty information.
- Used-device battery health, grade, defects, replaced parts, original box, and inspection warranty.
- Availability.
- Verified-store identity and city.
- Related listings.
- Compare offers entry point.
- Prominent contact-seller action.
- Unavailable/removed-listing state.
- Never invent a battery-health value when it is unverified.

### C-04: Public store profile

- Store identity and verified badge.
- Description.
- City, physical address, and location guidance.
- Opening hours.
- Contact actions.
- Active store inventory with search/filtering.
- No private verification documents.

### C-06: Compare offers

- Compare offers for the same exact device variant.
- Keep storage and relevant specifications consistent.
- Show store, city, price, condition, warranty, battery health where applicable, and availability.
- Clearly explain differences between new and used offers.
- Use a readable mobile comparison layout rather than shrinking a desktop table.
- Provide a direct route to each listing and seller contact.

### C-10: Brands and categories

- Visual and alphabetical brand browsing.
- Apple, Samsung, Xiaomi, Google, OnePlus, Tecno, and Infinix.
- Brand → model → available listings navigation.
- Search and empty states.

Public discovery must contain only eligible published listings from verified stores. Removed listings and suspended stores must disappear from customer results in the simulated journeys.

## Scope: Step 6 — Merchant operations and founder administration

### M-05: Merchant dashboard

- Active listings.
- Out-of-stock alerts.
- Store/listing views.
- Aggregate WhatsApp/contact clicks.
- Recent activity.
- Quick actions for adding a listing and updating stock.
- Simple, meaningful charts with readable labels.
- Empty/new-store state.
- No invented revenue, orders, or checkout metrics.
- Do not expose customer identity in lead analytics.

### M-11: Store settings and staff

- Store profile and address.
- Opening hours.
- Primary WhatsApp and phone numbers.
- Staff list.
- Add staff and assign a store role.
- Remove staff with confirmation.
- Clear owner-only versus staff-accessible controls.
- Save feedback, validation, and unsaved changes.

### C-05: Contact seller action sheet

- Store identity and verified status.
- “Chat on WhatsApp.”
- “Call store.”
- Preview or clear explanation of the prefilled inquiry containing the phone model, condition, price, and listing link.
- No customer sign-in requirement.
- Unavailable-contact and external-app handoff feedback.
- Simulate external actions; do not send real messages or place calls.

### A-01: Founder overview

- Verified stores.
- Pending verification applications.
- Live listings.
- Daily searches or aggregate discovery activity.
- Useful trends.
- Review workload and actionable queue shortcuts.
- Clear distinction between platform-wide and merchant metrics.

### A-06: Roles and permissions

- Role list.
- Create/edit role.
- Understandable permission groups.
- Examples: review stores, moderate listings, manage roles, view audit logs.
- Role assignment.
- Restricted-access states.
- Confirmation for sensitive permission changes.

### A-07: Audit logs and dual approval

- Filterable audit table/timeline.
- Actor, action, target, timestamp, and administrative IP where relevant.
- Filters by date, actor, action, and target.
- Expandable event details.
- Read-only audit records.
- Sensitive-action request showing reason and impact.
- Awaiting second approval, approved, and rejected states.
- A different authorized administrator must provide the second approval.
- No self-approval interaction.

## Prototype content and interactions

Use a consistent fictional dataset throughout:

- Stores across the three pilot cities.
- Multiple recognizable phone brands.
- New and used listings.
- Several stores offering the same device variant at different illustrative SDG prices.
- Used phones with different grades, battery-health states, and disclosed defects.
- Store applications needing review or correction.
- Listings in different publication states.
- Staff with different permissions.

Prices and business names are illustrative, not claims about current market prices.

Connect these journeys:

1. Guest selects city → searches → filters → opens listing → compares offers → opens seller contact sheet.
2. Merchant registers → enters store details → uploads evidence → submits → receives requested changes → resubmits → sees verified status.
3. Founder opens an application → inspects evidence → requests changes or approves.
4. Verified merchant creates a new listing and a used listing → completes photographs → sees processing → sees published status.
5. Merchant updates inventory and price → sees updated public listing and activity feedback.
6. Founder reviews a live listing → flags or removes it → sees audit entry and changed public visibility.
7. Founder requests a sensitive action → another administrator approves or rejects it.

Provide a simple prototype-only way to switch roles and inspect representative states. Keep that control visually separate from the product’s normal navigation.

## Delivery expectations

- Produce a coherent, visually finished frontend prototype.
- Cover every required screen group above; do not stop after the homepage.
- Use reusable components and consistent mock content.
- Make primary controls, navigation, forms, filters, dialogs, and state transitions interactive.
- Show Arabic RTL as the primary presentation and an English LTR alternative.
- Show mobile customer screens and responsive merchant/admin layouts.
- Prefer complete, practical user journeys over decorative charts or excessive animation.
- Do not add backend work, real integrations, project-management plans, or unrelated features.
- Finish with a brief inventory of completed screens and any design-only limitations.

You are free to choose the visual style. Preserve the product scope, screen coverage, and behavior described above.
