# Service authorization matrix through Step 6

Trusted actor/membership is read at the service boundary. Mutation authorization
is rechecked after store-lock waits, so staff removal cannot authorize a later
commit. Delegated administrative mutations similarly lock and recheck the current
role assignment after acquiring the store lock. Known foreign resource IDs do not grant access. All unsafe session calls
also require CSRF at HTTP ingress.

| Operation/state | Guest | Own owner | Own staff | Other-store merchant | Suspended member | Delegate | Founder |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public eligible listing/search/contact | Allowed | Allowed | Allowed | Allowed | Eligible stores only | Allowed | Allowed |
| Own store/inventory read | Denied | Allowed | Allowed | Foreign IDs denied | Denied | No membership bypass | No membership bypass |
| Editable business profile/settings/staff | Denied | Owner only; profile needs phone proof and editable state | Denied | Denied | Denied | Denied | No membership bypass |
| Evidence upload/submit | Denied | Complete profile, ready private scans | Denied | Denied | Denied | Denied | No membership bypass |
| Private evidence download | Denied | Denied | Denied | Denied | Denied | Denied even with verify_stores | Active founder only |
| Verification queue/detail/decision | Denied | No own-store review | No membership bypass | No membership bypass | No bypass | verify_stores permission | Allowed; no own-store review |
| Listing upload/create/edit/price/stock | Denied | Verified store, current membership, valid version/key | Same | Foreign IDs denied | Denied | No membership bypass | No membership bypass |
| Moderation approve/flag/remove/restore | Denied | No own-store review | No bypass | No bypass | No bypass | moderate_listings permission | Allowed; no own-store review |
| Admin metrics/audit | Denied | Denied | Denied | Denied | No bypass | Matching view_metrics/view_audit permission | Allowed |
| Role grants/deletion proposal | Denied | Denied | Denied | Denied | Denied | Denied | Active founder only |
| Destructive approval | Denied | Denied | Denied | Denied | Denied | Denied | Different active founder; current target version |

Public reads exclude suspended/unverified stores, inactive owners, sold/removed/
processing items and invalid media, including known direct IDs and related/offer
entry points. Visibility is revalidated on each API request; already downloaded
CDN/offline bytes cannot be recalled. No public response includes verification
objects, private keys, membership rosters or merchant moderation feedback.

Evidence: test_identity_stores, test_verification_media, test_listings,
test_discovery, test_operations and independent-connection test_concurrency.
