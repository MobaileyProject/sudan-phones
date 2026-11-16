# Blueprint API proposals — historical planning input

This is the original planning import, not the current API catalog. See
[implemented operations](../api/CATALOG.md) for the exact current backend API.
These proposals preserve future requirements and IDs; their presence does not
imply implementation, finalized schemas, or live availability.

[Live Slack contract catalog](https://elrasheedworkplace.slack.com/lists/T0CJRU4RSUQ/F0CHJB5C939) · [Delivery plan](../plans/SOUQ_DELIVERY_PLAN.md)

## API-001: DELETE /api/v1/admin/roles/{id}

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-10.
Screen consumers: A-06.

Screen inputs to translate into an agreed request schema:
- User (required)
- Role (required)
- Scope (store / platform)

Expected source response content (not a finalized schema):
- Role matrix
- Membership changes
- Audit events

Access statements:
- Founder-level administrator only.

## API-002: DELETE /api/v1/auth/session

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-03.
Screen consumers: C-07.

Screen inputs to translate into an agreed request schema:
- Phone or email (required)
- Password (required, min 8)
- Display name (optional)

Expected source response content (not a finalized schema):
- Session token
- Profile payload
- Error codes for each failure mode

Access statements:
- Account owner only for profile actions.

## API-003: DELETE /api/v1/me/saved-listings/{id}

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: C-08.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Saved listing summaries with availability flag

Access statements:
- Authenticated customer, own saves only.

## API-004: DELETE /api/v1/stores/me/staff/{id}

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-04.
Screen consumers: M-11.

Screen inputs to translate into an agreed request schema:
- Description
- Locations (multi)
- Phone
- Messaging handles
- Profile image
- Staff emails & roles

Expected source response content (not a finalized schema):
- Updated settings
- Staff membership changes

Access statements:
- Merchant owner + authorized staff (scoped).

## API-005: GET /api/v1/admin/announcements/{id}/delivery

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: A-09.

Screen inputs to translate into an agreed request schema:
- Title & body (required, AR & EN)
- Audience (required)
- Schedule (optional)

Expected source response content (not a finalized schema):
- Announcement record
- Delivery stats

Access statements:
- Administrator with announcements scope. FUTURE FEATURE.

## API-006: GET /api/v1/admin/audit-events

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-10.
Screen consumers: A-07.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Paginated audit events
- Approval outcomes

Access statements:
- Founder-level administrator; approver ≠ requester enforced.

## API-007: GET /api/v1/admin/campaigns/queue

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: A-08.

Screen inputs to translate into an agreed request schema:
- Decision reason (required on reject)

Expected source response content (not a finalized schema):
- Campaign queue
- Decision confirmations
- Audit events

Access statements:
- Administrator with advertising scope. FUTURE FEATURE.

## API-008: GET /api/v1/admin/moderation/queue

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-07.
Screen consumers: A-05.

Screen inputs to translate into an agreed request schema:
- Action (required)
- Reason (required)

Expected source response content (not a finalized schema):
- Queue items
- Action confirmation
- Audit event ID

Access statements:
- Administrator with moderation scope.

## API-009: GET /api/v1/admin/overview

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-10.
Screen consumers: A-01.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Aggregated metrics
- Queue sizes
- Alerts
- Recent critical audit events

Access statements:
- Administrator role required.

## API-010: GET /api/v1/admin/roles

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-10.
Screen consumers: A-06.

Screen inputs to translate into an agreed request schema:
- User (required)
- Role (required)
- Scope (store / platform)

Expected source response content (not a finalized schema):
- Role matrix
- Membership changes
- Audit events

Access statements:
- Founder-level administrator only.

## API-011: GET /api/v1/admin/verifications

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-05.
Screen consumers: A-02.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Applications with store & document summaries
- State metadata

Access statements:
- Administrator with verification scope.

## API-012: GET /api/v1/admin/verifications/{id}

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-05.
Screen consumers: A-03.

Screen inputs to translate into an agreed request schema:
- Reviewer notes (required before decision)

Expected source response content (not a finalized schema):
- Application details
- Time-limited document access
- Note storage confirmation

Access statements:
- Administrator with verification scope; access logged; evidence never downloaded unlogged.

## API-013: GET /api/v1/admin/verifications/{id}/documents

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-05.
Screen consumers: A-03.

Screen inputs to translate into an agreed request schema:
- Reviewer notes (required before decision)

Expected source response content (not a finalized schema):
- Application details
- Time-limited document access
- Note storage confirmation

Access statements:
- Administrator with verification scope; access logged; evidence never downloaded unlogged.

## API-014: GET /api/v1/brands

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-06.
Screen consumers: C-10.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Brands with listing counts
- Categories with counts

Access statements:
- Public.

## API-015: GET /api/v1/catalog/brands

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-06.
Screen consumers: M-06.

Screen inputs to translate into an agreed request schema:
- Brand (required)
- Model (required)
- Variant (required when model has variants)
- Condition type: new or used (required)

Expected source response content (not a finalized schema):
- Catalog trees for selection
- Variant details

Access statements:
- Verified merchant.

## API-016: GET /api/v1/catalog/models

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-06.
Screen consumers: M-06.

Screen inputs to translate into an agreed request schema:
- Brand (required)
- Model (required)
- Variant (required when model has variants)
- Condition type: new or used (required)

Expected source response content (not a finalized schema):
- Catalog trees for selection
- Variant details

Access statements:
- Verified merchant.

## API-017: GET /api/v1/catalog/variants

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-06.
Screen consumers: M-06.

Screen inputs to translate into an agreed request schema:
- Brand (required)
- Model (required)
- Variant (required when model has variants)
- Condition type: new or used (required)

Expected source response content (not a finalized schema):
- Catalog trees for selection
- Variant details

Access statements:
- Verified merchant.

## API-018: GET /api/v1/categories

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-06.
Screen consumers: C-10.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Brands with listing counts
- Categories with counts

Access statements:
- Public.

## API-019: GET /api/v1/config

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-02.
Screen consumers: C-00.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Feature flags
- Default locale & currency
- Minimum app version

Access statements:
- Public — no authentication required.

## API-020: GET /api/v1/home

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-01.

Screen inputs to translate into an agreed request schema:
- Search text (quick)

Expected source response content (not a finalized schema):
- Featured listings
- Top brands & categories
- Verified store cards
- Active promo placements

Access statements:
- Public — guest accessible.

## API-021: GET /api/v1/i18n/bundle

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-02.
Screen consumers: C-00.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Feature flags
- Default locale & currency
- Minimum app version

Access statements:
- Public — no authentication required.

## API-022: GET /api/v1/listings

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-02.

Screen inputs to translate into an agreed request schema:
- Query text (required to search)
- Brand/model (optional)
- Price min/max (optional, numeric)
- Condition new/used (optional)
- Storage & specs (optional)

Expected source response content (not a finalized schema):
- Paginated listing summaries
- Total count & facets
- Applied-filter echo

Access statements:
- Public.

## API-023: GET /api/v1/listings/{id}

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-03.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Published listing + product info
- Authorized seller info
- Price & availability
- Related offers for same variant

Access statements:
- Public listing visibility enforced server-side.

## API-024: GET /api/v1/listings/{id}/contact-methods

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-05.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Allowed contact methods
- Masked/authorized contact values

Access statements:
- Contact info only served for listings that allow it; never raw merchant PII dumps.

## API-025: GET /api/v1/listings/{id}/related

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-03.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Published listing + product info
- Authorized seller info
- Price & availability
- Related offers for same variant

Access statements:
- Public listing visibility enforced server-side.

## API-026: GET /api/v1/me/saved-listings

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: C-08.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Saved listing summaries with availability flag

Access statements:
- Authenticated customer, own saves only.

## API-027: GET /api/v1/product-variants/{id}/listings

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-06.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- All published listings for the variant with price, condition, availability, store summary

Access statements:
- Public.

## API-028: GET /api/v1/promotions

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: C-01.

Screen inputs to translate into an agreed request schema:
- Search text (quick)

Expected source response content (not a finalized schema):
- Featured listings
- Top brands & categories
- Verified store cards
- Active promo placements

Access statements:
- Public — guest accessible.

## API-029: GET /api/v1/stores/featured

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-01.

Screen inputs to translate into an agreed request schema:
- Search text (quick)

Expected source response content (not a finalized schema):
- Featured listings
- Top brands & categories
- Verified store cards
- Active promo placements

Access statements:
- Public — guest accessible.

## API-030: GET /api/v1/stores/me

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-04.
Screen consumers: M-02.

Screen inputs to translate into an agreed request schema:
- Store name (required)
- Business location (required)
- Business phone (required)
- Owner full name (required)
- Owner ID reference (required for verification)

Expected source response content (not a finalized schema):
- Saved profile
- Name-conflict error
- Completion status

Access statements:
- Authenticated merchant, own store only.

## API-031: GET /api/v1/stores/me/campaigns/{id}/results

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: M-12.

Screen inputs to translate into an agreed request schema:
- Campaign name
- Creative images
- Placements
- Target audience
- Start/end dates
- Budget (if applicable)

Expected source response content (not a finalized schema):
- Campaign state (draft → pending → approved/rejected → running)
- Impression/click stats

Access statements:
- Verified merchant; campaigns require admin approval.

## API-032: GET /api/v1/stores/me/dashboard

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-10.
Screen consumers: M-05.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Listing counts by state
- Low-stock alerts
- Store status
- Recent activity

Access statements:
- Verified merchant or authorized staff member.

## API-033: GET /api/v1/stores/me/listings

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-07.
Screen consumers: M-09.

Screen inputs to translate into an agreed request schema:
- Search text (optional)
- State filter (optional)

Expected source response content (not a finalized schema):
- Paginated own listings with states & stock
- Update confirmations

Access statements:
- Verified merchant / authorized staff, own store only.

## API-034: GET /api/v1/stores/me/listings/{id}/status

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-07.
Screen consumers: M-13.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Current state
- Reasons (rejection/suspension)
- Available actions
- Transition history

Access statements:
- Verified merchant, own listings.

## API-035: GET /api/v1/stores/me/verification

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-05.
Screen consumers: M-04.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Current verification state
- Reviewer feedback
- History of decisions

Access statements:
- Authenticated merchant, own store.

## API-036: GET /api/v1/stores/{id}

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-04.

Screen inputs to translate into an agreed request schema:
- In-store search text (optional)

Expected source response content (not a finalized schema):
- Store profile (verified status)
- Published inventory (paginated)

Access statements:
- Public — only verified/published data exposed.

## API-037: GET /api/v1/stores/{id}/listings

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-09.
Screen consumers: C-04.

Screen inputs to translate into an agreed request schema:
- In-store search text (optional)

Expected source response content (not a finalized schema):
- Store profile (verified status)
- Published inventory (paginated)

Access statements:
- Public — only verified/published data exposed.

## API-038: PATCH /api/v1/stores/me/listings/{id}

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-07.
Screen consumers: M-09.

Screen inputs to translate into an agreed request schema:
- Search text (optional)
- State filter (optional)

Expected source response content (not a finalized schema):
- Paginated own listings with states & stock
- Update confirmations

Access statements:
- Verified merchant / authorized staff, own store only.

## API-039: PATCH /api/v1/stores/me/listings/{id}/price

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-07.
Screen consumers: M-10.

Screen inputs to translate into an agreed request schema:
- New price (required)
- New quantity (new-phone listings only)

Expected source response content (not a finalized schema):
- Updated values
- Price history confirmation
- Conflict error if stale

Access statements:
- Verified merchant, own listings.

## API-040: PATCH /api/v1/stores/me/listings/{id}/stock

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-07.
Screen consumers: M-10.

Screen inputs to translate into an agreed request schema:
- New price (required)
- New quantity (new-phone listings only)

Expected source response content (not a finalized schema):
- Updated values
- Price history confirmation
- Conflict error if stale

Access statements:
- Verified merchant, own listings.

## API-041: POST /api/v1/admin/announcements

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: A-09.

Screen inputs to translate into an agreed request schema:
- Title & body (required, AR & EN)
- Audience (required)
- Schedule (optional)

Expected source response content (not a finalized schema):
- Announcement record
- Delivery stats

Access statements:
- Administrator with announcements scope. FUTURE FEATURE.

## API-042: POST /api/v1/admin/campaigns/{id}/decision

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: A-08.

Screen inputs to translate into an agreed request schema:
- Decision reason (required on reject)

Expected source response content (not a finalized schema):
- Campaign queue
- Decision confirmations
- Audit events

Access statements:
- Administrator with advertising scope. FUTURE FEATURE.

## API-043: POST /api/v1/admin/dual-approvals/{id}/decision

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-10.
Screen consumers: A-07.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Paginated audit events
- Approval outcomes

Access statements:
- Founder-level administrator; approver ≠ requester enforced.

## API-044: POST /api/v1/admin/listings/{id}/moderate

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-07.
Screen consumers: A-05.

Screen inputs to translate into an agreed request schema:
- Action (required)
- Reason (required)

Expected source response content (not a finalized schema):
- Queue items
- Action confirmation
- Audit event ID

Access statements:
- Administrator with moderation scope.

## API-045: POST /api/v1/admin/roles

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-10.
Screen consumers: A-06.

Screen inputs to translate into an agreed request schema:
- User (required)
- Role (required)
- Scope (store / platform)

Expected source response content (not a finalized schema):
- Role matrix
- Membership changes
- Audit events

Access statements:
- Founder-level administrator only.

## API-046: POST /api/v1/admin/verifications/{id}/decision

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-05.
Screen consumers: A-04.

Screen inputs to translate into an agreed request schema:
- Decision (required)
- Reason (required)
- Internal note (optional)

Expected source response content (not a finalized schema):
- Decision recorded
- Merchant state change
- Audit event ID

Access statements:
- Administrator with verification scope; critical reversals need dual approval (A-07).

## API-047: POST /api/v1/auth/login

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-03.
Screen consumers: C-07.

Screen inputs to translate into an agreed request schema:
- Phone or email (required)
- Password (required, min 8)
- Display name (optional)

Expected source response content (not a finalized schema):
- Session token
- Profile payload
- Error codes for each failure mode

Access statements:
- Account owner only for profile actions.

## API-048: POST /api/v1/auth/recover

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-03.
Screen consumers: C-07.

Screen inputs to translate into an agreed request schema:
- Phone or email (required)
- Password (required, min 8)
- Display name (optional)

Expected source response content (not a finalized schema):
- Session token
- Profile payload
- Error codes for each failure mode

Access statements:
- Account owner only for profile actions.

## API-049: POST /api/v1/auth/register

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-03.
Screen consumers: C-07.

Screen inputs to translate into an agreed request schema:
- Phone or email (required)
- Password (required, min 8)
- Display name (optional)

Expected source response content (not a finalized schema):
- Session token
- Profile payload
- Error codes for each failure mode

Access statements:
- Account owner only for profile actions.

## API-050: POST /api/v1/media/uploads

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-08.
Screen consumers: M-07, M-08.

Screen inputs to translate into an agreed request schema:
- Quantity (required, ≥1)
- Price (required, > 0)
- Currency (from config)
- Warranty months (optional)
- Images (required, min 1)
- Availability (default on)
- Condition grade (required)
- Battery health % (required where relevant)
- Defects (free list)
- Accessories included (checklist)
- Actual photos (required, multiple)
- Price (required)

Expected source response content (not a finalized schema):
- Created listing (draft state)
- Publication state
- Validation errors
- Created used-device listing (quantity locked to 1)

Access statements:
- Verified merchant, own store.

## API-051: POST /api/v1/merchant/auth/register

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-03.
Screen consumers: M-01.

Screen inputs to translate into an agreed request schema:
- Full name (required)
- Email or phone (required, unique)
- Password (required, min 8)
- Terms agreement (required)

Expected source response content (not a finalized schema):
- Account created
- Verification token
- Duplicate-account error

Access statements:
- Public registration; merchant role assigned on creation.

## API-052: POST /api/v1/merchant/auth/verify

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-03.
Screen consumers: M-01.

Screen inputs to translate into an agreed request schema:
- Full name (required)
- Email or phone (required, unique)
- Password (required, min 8)
- Terms agreement (required)

Expected source response content (not a finalized schema):
- Account created
- Verification token
- Duplicate-account error

Access statements:
- Public registration; merchant role assigned on creation.

## API-053: POST /api/v1/stores/me/campaigns

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: M-12.

Screen inputs to translate into an agreed request schema:
- Campaign name
- Creative images
- Placements
- Target audience
- Start/end dates
- Budget (if applicable)

Expected source response content (not a finalized schema):
- Campaign state (draft → pending → approved/rejected → running)
- Impression/click stats

Access statements:
- Verified merchant; campaigns require admin approval.

## API-054: POST /api/v1/stores/me/listings

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-07.
Screen consumers: M-07, M-08.

Screen inputs to translate into an agreed request schema:
- Quantity (required, ≥1)
- Price (required, > 0)
- Currency (from config)
- Warranty months (optional)
- Images (required, min 1)
- Availability (default on)
- Condition grade (required)
- Battery health % (required where relevant)
- Defects (free list)
- Accessories included (checklist)
- Actual photos (required, multiple)
- Price (required)

Expected source response content (not a finalized schema):
- Created listing (draft state)
- Publication state
- Validation errors
- Created used-device listing (quantity locked to 1)

Access statements:
- Verified merchant, own store.

## API-055: POST /api/v1/stores/me/staff

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-04.
Screen consumers: M-11.

Screen inputs to translate into an agreed request schema:
- Description
- Locations (multi)
- Phone
- Messaging handles
- Profile image
- Staff emails & roles

Expected source response content (not a finalized schema):
- Updated settings
- Staff membership changes

Access statements:
- Merchant owner + authorized staff (scoped).

## API-056: POST /api/v1/stores/me/verification/documents

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-05.
Screen consumers: M-03.

Screen inputs to translate into an agreed request schema:
- Business license (required, image/PDF)
- Owner ID document (required)
- Optional supporting evidence

Expected source response content (not a finalized schema):
- Upload receipts
- Application state → pending
- Rejection of invalid files

Access statements:
- Authenticated merchant, own store. Documents are access-restricted after upload.

## API-057: POST /api/v1/stores/me/verification/submit

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-05.
Screen consumers: M-03.

Screen inputs to translate into an agreed request schema:
- Business license (required, image/PDF)
- Owner ID document (required)
- Optional supporting evidence

Expected source response content (not a finalized schema):
- Upload receipts
- Application state → pending
- Rejection of invalid files

Access statements:
- Authenticated merchant, own store. Documents are access-restricted after upload.

## API-058: PUT /api/v1/me/saved-listings/{id}

Status at import: Deferred. Scope: Later. Backend task: BE-11.
Screen consumers: C-08.

Screen inputs to translate into an agreed request schema:
- Agree query/body parameters; none are specified as screen fields.

Expected source response content (not a finalized schema):
- Saved listing summaries with availability flag

Access statements:
- Authenticated customer, own saves only.

## API-059: PUT /api/v1/stores/me

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-04.
Screen consumers: M-11.

Screen inputs to translate into an agreed request schema:
- Description
- Locations (multi)
- Phone
- Messaging handles
- Profile image
- Staff emails & roles

Expected source response content (not a finalized schema):
- Updated settings
- Staff membership changes

Access statements:
- Merchant owner + authorized staff (scoped).

## API-060: PUT /api/v1/stores/me/profile

Status at import: Proposed. Scope: MVP — scope review. Backend task: BE-04.
Screen consumers: M-02.

Screen inputs to translate into an agreed request schema:
- Store name (required)
- Business location (required)
- Business phone (required)
- Owner full name (required)
- Owner ID reference (required for verification)

Expected source response content (not a finalized schema):
- Saved profile
- Name-conflict error
- Completion status

Access statements:
- Authenticated merchant, own store only.
