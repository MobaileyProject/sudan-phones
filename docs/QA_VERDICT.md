# Sudan Phones — Live Full-Stack QA Verdict Report

## Overall Verdict Summary

| Verdict | Count | Notes |
| --- | --- | --- |
| `WORKING` | 58 | Verified live in Chromium via Playwright + HTTP response checks + PostgreSQL 16 state assertions (`QA-001`..`QA-058`). |
| `NEEDS_UPDATE` | 0 | All interactive UI controls and backend contracts verified end-to-end (`QA-039` Pause/Repost implemented & live-verified). |
| `MISSING` | 0 | All backend contracts, migrations, catalog models, and live endpoints implemented. |
| `BROKEN` | 0 | All runtime wiring bugs uncovered during QA (`BUG-2026-022`) were fixed and re-verified live cleanly. |
| **Total Audited** | **58** | `grep -c '^\- \[ \]' docs/QA_TASK_LIST.md` = `0` |

## Seeded QA Test Credentials (`seed_qa_data`)

| Role | Identifier (Email / Phone) | Password | Notes |
| --- | --- | --- | --- |
| **Admin (Founder)** | `founder@sudanphones.sd` / `+249910000001` | `SudanAdmin@2026` | Full superuser / founder permissions (`#admin`). |
| **Admin (Moderator)** | `moderator@sudanphones.sd` / `+249910000002` | `SudanMod@2026` | Delegated moderator role (`Salma Hashim`). |
| **Buyer #1 (Active)** | `buyer1@sudanphones.sd` / `+249911110001` | `Buyer@2026` | Ahmed Al-Tayeb (`khartoum`); seeded favorites, alerts, reviews & chat thread. |
| **Buyer #2–#4** | `buyer2@sudanphones.sd`..`buyer4@sudanphones.sd` (`+249911110002`..`0004`) | `Buyer@2026` | Seeded buyers across Omdurman, Port Sudan, and Al-Jazirah. |
| **Merchant Store #1 (Verified)** | `merchant1@sudanphones.sd` / `+249920000001` | `Merchant@2026` | Owner of Store #1 (`النيل للهواتف · Nile Mobile Hub`, Khartoum). |
| **Merchant Store #1 Clerk** | `+249920000101` | `Merchant@2026` | Sales clerk membership on Store #1 (`Osman Clerk`). |
| **Merchant Stores #2–#42 (Verified)** | `merchant2@sudanphones.sd`..`merchant42@sudanphones.sd` (`+249920000002`..`0042`) | `Merchant@2026` | Verified stores across all major Sudanese states (`6` listings each). |
| **Merchant Stores #43–#47 (`pending_verification`)** | `+249920000043`..`0047` | `Merchant@2026` | Seeded pending applications for Admin approval/review QA. |
| **Merchant Stores #48–#49 (`changes_requested`)** | `+249920000048`..`0049` | `Merchant@2026` | Seeded applications awaiting merchant corrections. |
| **Merchant Store #50 (`suspended`)** | `+249920000050` | `Merchant@2026` | Suspended store fixture (hidden from public discovery). |

---

*(Live browser + HTTP + PostgreSQL verification results appended per item below.)*

---

### [QA-001] Guest — App-Open Sponsored Ad (`AppOpenAdOverlay`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Loaded `http://127.0.0.1:3000/` as Guest (`GET /api/v1/ads/active` 200); clicked promoted overlay CTA -> `POST /api/v1/ads/:id/click` returned `200`; PostgreSQL `core_sponsoredad` verified `impressions` 179->182 and `clicks` 26->27.
- **Issues / Next Steps:** Fixed `seed_qa_data.py` to populate `image_url` on seeded sponsored ads from listing assets so the creative renders cleanly.

### [QA-002] Guest — Welcome & Auth Entry Sheet (`MobileAppAuthScreens`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked header brand button `سودان فونز`, verified Welcome screen opened, clicked `تصفح الهواتف كضيف`, returned cleanly to Home tab with 0 console/HTTP errors.
- **Issues / Next Steps:** None.

### [QA-003] Guest — AR/EN Language Toggle (`CustomerAccountSettings`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened Account Settings, toggled `English` then `العربية`; observed `document.documentElement.dir` transition `rtl -> ltr -> rtl`.
- **Issues / Next Steps:** Fixed `PrototypeContext.tsx` to sync `document.documentElement.dir` and `document.documentElement.lang` whenever `lang` changes.

### [QA-004] Guest — City / State Selector Sheet (`CitySelectorSheet`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened header city selector, selected `port_sudan` via `#sheet-state-select`, verified header & storefront filtered to Port Sudan, then reset to `all`.
- **Issues / Next Steps:** None.

### [QA-005] Guest — Home Tab Storefront (`CustomerApp` + `HomeStorefrontSections`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Verified Home sections rendered across 42 verified stores & 252 published listings (DB verified `verified_stores=42, published_listings=252`), with 16 `<img>` elements loaded and 0 broken `/media-transfer/` images.
- **Issues / Next Steps:** None.

### [QA-006] Guest — Search Tab Query, Suggestions & Recent Searches (`CustomerApp`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Navigated to Search dock tab, searched `iPhone 15 Pro Max`, verified matching DB listings appeared and clear search `X` reset the query.
- **Issues / Next Steps:** None.

### [QA-007] Guest — Search Tab Quick 1-Tap Filter Chips (`CustomerApp`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Toggled `تحت 1 مليون ج.س`, `مستعمل مفحوص`, and `يقبل الاستبدال` quick chips and `إعادة ضبط`; counts and result list updated live.
- **Issues / Next Steps:** None.

### [QA-008] Guest — Filter Bottom Sheet & Sort Controls (`FilterBottomSheet`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened Filter sheet, selected `Samsung` + `256 GB`, clicked Apply, verified filter chips & ordered results, then clicked Reset.
- **Issues / Next Steps:** None.

### [QA-009] Guest — Brands Tab & Brand Models View (`CustomerBrandModels`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `الماركات` dock tab, clicked `آبل` (Apple), verified `CustomerBrandModels` listed seeded iPhone models and live offer counts, then navigated back cleanly.
- **Issues / Next Steps:** None.

### [QA-010] Guest — Store Directory List & Interactive Map (`tab === 'stores'` + `StoreMapExplorer`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `المتاجر` dock tab showing verified Sudanese stores, switched to `الخريطة والأقرب إليك` (`StoreMapExplorer`), verified map rendered cleanly.
- **Issues / Next Steps:** None.

### [QA-011] Guest — Verified Store Profile (`CustomerStoreProfile`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked `النيل للهواتف` in Stores directory; verified store address (`شارع القصر`), opening hours, ratings, and store inventory list.
- **Issues / Next Steps:** None.

### [QA-012] Guest — Listing Details, Gallery Lightbox, Full Specs Sheet & Compare Offers (`CustomerListingDetails` + `PhoneSpecsAndCompare`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened used phone listing details (`مستعمل مفحوص`), verified condition checklist, opened `عرض كل المواصفات` full specs sheet (`المعالج` / `Chipset` displayed).
- **Issues / Next Steps:** None.

### [QA-013] Guest — Compare Tray & Side-by-Side Comparison (`ComparePhonesDetailed`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked `أضف للمقارنة`, clicked `قارن الآن` in floating compare tray, verified side-by-side comparison screen loaded cleanly, returned and cleared tray.
- **Issues / Next Steps:** None.

### [QA-014] Guest — Contact Seller Sheet & Lead Telemetry (`ContactSellerSheet`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked `تواصل مع المتجر` -> `محادثة عبر واتساب`; `POST /api/v1/listings/:id/contact-events` returned `200`; PostgreSQL `core_contactevent` incremented `4 -> 5`.
- **Issues / Next Steps:** Fixed `CustomerSheets.tsx` `triggerContact` so `window.open(..., '_blank')` sets `opened.opener = null` without fallback-navigating the main tab via `window.location.href = waUrl`.

### [QA-015] Guest — Visitor Price Alert Subscribe & Delete (`CustomerListingDetails` + `CustomerNotificationsSheet`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked `نبّهني عند انخفاض السعر` (`POST /api/v1/me/alerts` `201`), verified `core_pricealert` `3 -> 4`, opened Notifications -> `تنبيهات الأسعار` -> clicked remove (`DELETE /api/v1/me/alerts/:id` `200`), DB returned `4 -> 3`.
- **Issues / Next Steps:** None.

### [QA-016] Guest — Submit Listing/Store Report (`ReportTargetSheet`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `الإبلاغ عن مشكلة في هذا الإعلان`, selected `السعر غير مطابق للواقع`, submitted (`POST /api/v1/reports` `201`); PostgreSQL `core_customerreport` incremented `3 -> 4`.
- **Issues / Next Steps:** None.

### [QA-017] Guest — Data Saver Mode Toggle (`CustomerAccountSettings`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Toggled `وضع توفير البيانات` switch in Account Settings; `aria-checked` transitioned `false -> true -> false`.
- **Issues / Next Steps:** None.

### [QA-018] Guest — Buyer Account Registration + Real OTP Verification (`MobileAppAuthScreens`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Registered `+249915550001` via Register tab (`POST /api/v1/auth/register` `201`), captured server-issued 6-digit OTP from `OTP_DELIVERY_BACKEND`, submitted verification (`POST /api/v1/merchant/auth/verify` `200`); PostgreSQL `core_account.phone_verified=t`.
- **Issues / Next Steps:** None.

### [QA-019] Guest — Password Recovery Flow + New Password Reset (`MobileAppAuthScreens`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `نسيت كلمة المرور`, requested recovery OTP for `+249915550001` (`POST /api/v1/auth/recover` `200`), entered 6-digit OTP + new password (`POST /api/v1/auth/recover` `200`), signed in with new password (`POST /api/v1/auth/login` `200`).
- **Issues / Next Steps:** None.

### [QA-020] Guest — Invalid Login Error Handling (`MobileAppAuthScreens`)
- **Verdict:** `WORKING`
- **Live Test Evidence:** Submitted wrong password on `#auth-signin-phone`; `POST /api/v1/auth/login` returned `401` with clean inline Arabic validation error and 0 uncaught UI exceptions.
- **Issues / Next Steps:** None.


### [QA-021] Buyer — Sign In & Reload Session Persistence
- **Verdict:** `WORKING`
- **Live Test Evidence:** Signed in via UI as seeded buyer `+249911110001` (`POST /api/v1/auth/login` -> `200`), then ran full `page.reload()` (`GET /api/v1/auth/session` `200`, `GET /api/v1/me` `200`). Header settings button title preserved signed-in identity (`إعدادات الحساب (Ahmed Al-Tayeb)`).
- **Issues / Next Steps:** None.

### [QA-022] Buyer — Edit Profile & Sync Preferences
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `CustomerAccountSettings`, changed name to `Ahmed Al-Tayeb QA` (`PATCH /api/v1/me` -> `200`), confirmed `auth_user.first_name='Ahmed Al-Tayeb QA'` in PostgreSQL, then restored original name (`PATCH /api/v1/me` -> `200`).
- **Issues / Next Steps:** None.

### [QA-023] Buyer — Toggle Favorite Save & Remove
- **Verdict:** `WORKING`
- **Live Test Evidence:** Toggled heart icon on listing `251` (`POST /api/v1/me/favorites/251` -> `201`), verified saved count in Favorites screen, then unfavorited (`DELETE /api/v1/me/favorites/251` -> `200`). PostgreSQL `core_favorite` count transitioned `8 -> 9 -> 8`.
- **Issues / Next Steps:** None.

### [QA-024] Buyer — Create & Delete Authenticated Price Alert
- **Verdict:** `WORKING`
- **Live Test Evidence:** Subscribed to authenticated buyer price alert (`POST /api/v1/me/alerts` -> `201`) and deleted from notifications/alerts sheet (`DELETE /api/v1/me/alerts/:id` -> `200`). PostgreSQL `core_pricealert` count transitioned `3 -> 4 -> 3`.
- **Issues / Next Steps:** None.

### [QA-025] Buyer — Submit Product Review & Model Rating Aggregation
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `Rate Phone` sheet on listing `251`, selected 5 stars, entered comment, and submitted (`POST /api/v1/listings/251/ratings` -> `201`). PostgreSQL `core_rating` (`target_type='listing'`) count increased `13 -> 14`.
- **Issues / Next Steps:** None.

### [QA-026] Buyer — Submit Store Review
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened Store `#11` (`?store=11`), opened `Rate Store` sheet, selected 5 stars, and submitted review (`POST /api/v1/stores/11/ratings` -> `201`). PostgreSQL `core_rating` (`target_type='store'`) count increased `10 -> 11`.
- **Issues / Next Steps:** None.

### [QA-027] Buyer — Send In-App Chat Message from Phone Details
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked contact sheet -> `تواصل عبر التطبيق` (`StoreInAppChatSheet`), sent buyer inquiry (`POST /api/v1/stores/42/messages` -> `201`). PostgreSQL `core_storechatmessage` count increased `7 -> 8` and store `new_message` rows in `core_customernotification` increased `4 -> 5`. (Resolved PostgreSQL deadlock in `send_store_message()` locking order `Store -> Listing` + removed redundant concurrent `recordContactClick` from `StoreInAppChatSheet.tsx` before re-running.)
- **Issues / Next Steps:** None.

### [QA-028] Buyer — External Messages Tab 2-Page Flow
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `الرسائل` dock tab, verified Page 1 displayed conversation list only (`composer=0`), opened a store thread into Page 2 single-chat view, sent follow-up message (`POST /api/v1/stores/1/messages` -> `201`), and clicked Back (`العودة إلى الرسائل`) returning cleanly to Page 1 (`composer=0`).
- **Issues / Next Steps:** None.

### [QA-029] Buyer — Notifications Sheet & Mark All Read
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened Notifications sheet and clicked `قراءة الكل` (`POST /api/v1/me/notifications/read` -> `200`). PostgreSQL confirmed `core_customernotification` unread count for `+249911110001` reached `0`.
- **Issues / Next Steps:** None.

### [QA-030] Buyer — Sign Out
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked `تسجيل الخروج` in Account Settings (`DELETE /api/v1/auth/session` -> `200`). Account Settings reverted to Guest state (`ضيف` / `Guest`), with 0 console errors and 0 unexpected 4xx/5xx responses across the entire Buyer suite.
- **Issues / Next Steps:** None.


### [QA-031] Merchant — Sign In via Merchant Portal Gate
- **Verdict:** `WORKING`
- **Live Test Evidence:** Navigated to `#merchant`, signed in as seeded Store #1 owner (`+249920000001` / `Merchant@2026`, `POST /api/v1/auth/login` -> `200`), loaded active store `النيل للهواتف · Nile Mobile Hub` Dashboard.
- **Issues / Next Steps:** None.

### [QA-032] Merchant — New Merchant Registration, Onboarding Profile & Evidence Upload
- **Verdict:** `WORKING`
- **Live Test Evidence:** Registered fresh merchant `+249925537331` (`POST /api/v1/merchant/auth/register` -> `201`), captured WhatsApp OTP via backend delivery hook, verified OTP (`POST /api/v1/merchant/auth/verify` -> `200`), updated store profile with GPS (`PUT /api/v1/stores/me/profile` -> `200`), uploaded `commercial` certificate + `id_front` owner ID (`POST /api/v1/stores/me/verification/documents` -> `PUT` -> `complete`), and submitted verification (`POST /api/v1/stores/me/verification/submit` -> `201`). PostgreSQL confirmed `core_store.status='pending_verification'`, `verifications=1`, `docs=2`. (Fixed 3 real wiring bugs caught during testing: `latitude`/`longitude` payload keys in `MobileAppAuthScreens.tsx`, ordering OTP verification ahead of `updateStoreProfile`/`submitVerification`, adding required `id_front` upload field, and preventing premature `entryScreen` unmount in `CustomerApp.tsx` + skipping `/stores/me/dashboard` `403` for unverified stores in `PrototypeContext.tsx`.)
- **Issues / Next Steps:** None.

### [QA-033] Merchant — Store Dashboard Analytics & USD Rate Quick Apply
- **Verdict:** `WORKING`
- **Live Test Evidence:** Verified Store Dashboard KPIs, 7-day daily views chart (`GET /api/v1/stores/me/dashboard` -> `200`), and quick USD exchange-rate calculator card rendered cleanly for Store #1.
- **Issues / Next Steps:** None.

### [QA-034] Merchant — Multi-Step Add New Phone Wizard
- **Verdict:** `WORKING`
- **Live Test Evidence:** Completed 4-step wizard (`Brand New Phone -> Apple -> iPhone 15 Pro Max -> 256GB -> 2,890,000 SDG -> image upload`) and published (`POST /api/v1/stores/me/listings` -> `201`, listing id `327`). PostgreSQL `core_listing` count for Store #1 increased `32 -> 33`.
- **Issues / Next Steps:** None.

### [QA-035] Merchant — Multi-Step Add Used Phone Wizard
- **Verdict:** `WORKING`
- **Live Test Evidence:** Completed used-phone wizard (`Samsung -> Galaxy A55 -> 256GB -> 640,000 SDG`, defects note + 5-point `used_checklist`, 3 device photos uploaded) and published (`POST /api/v1/stores/me/listings` -> `201`, listing id `328`). PostgreSQL confirmed `used_checklist IS NOT NULL` (`t`) and `condition='used'`.
- **Issues / Next Steps:** None.

### [QA-036] Merchant — Quick Price & Stock Inline Update + Price Drop Alert Notification
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `Quick Edit` on `iPhone 15 Pro Max` (with an active `core_pricealert` for buyer1), dropped price `2890000 -> 2640000` (`PATCH /api/v1/stores/me/listings/327/price` -> `200`). PostgreSQL `core_customernotification` (`type='price_drop'`) rows incremented `9 -> 10`.
- **Issues / Next Steps:** None.

### [QA-037] Merchant — Full Listing Edit Modal
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `MerchantListingEditModal` (`تعديل كامل`) and submitted save (`PATCH /api/v1/stores/me/listings/:id` -> `200`).
- **Issues / Next Steps:** None.

### [QA-038] Merchant — Duplicate Listing
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked `Duplicate Listing` (`نسخ الإعلان`, `POST /api/v1/stores/me/listings/:id/duplicate` -> `201`, `dup_id=329`). PostgreSQL `core_listing` count for Store #1 increased `34 -> 35`.
- **Issues / Next Steps:** None.

### [QA-039] Merchant — Pause / Repost Toggle & Archive Listing
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked per-listing `Pause` (`إيقاف مؤقت`) on Store #1 listing `328` (`PATCH /api/v1/stores/me/listings/328/status` -> `200`, `status='paused'`), verified UI badge `متوقف مؤقتاً`, confirmed `core_listing.status='paused'` in PostgreSQL and exclusion from public `GET /api/v1/listings` (`false`), reloaded the page & filtered by `paused`, clicked `Repost` (`إعادة النشر`, `PATCH .../328/status` -> `200`, `status='published'`) restoring public visibility (`true`), then duplicated (`dup_id=330`, `POST /duplicate` -> `201`) and archived (`DELETE /api/v1/stores/me/listings/328` -> `200`, DB `status='removed'`) with `0` console/5xx/unexpected 4xx errors.
- **Issues / Next Steps:** None.

### [QA-040] Merchant — Bulk Price Update
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `Bulk Price Adjust` (`تعديل جماعي للأسعار`) and applied change (`POST /api/v1/stores/me/listings/bulk-price` -> `200`, `updated_count=26`).
- **Issues / Next Steps:** None.

### [QA-041] Merchant — Export CSV & Bulk Import CSV/Rows
- **Verdict:** `WORKING`
- **Live Test Evidence:** Downloaded `sudan-phones-النيل_للهواتف_Nile_Mobile_Hub-inventory.xlsx` via `Export Excel`, then imported CSV row updating listing `327` to `2,750,000 SDG` (`POST /api/v1/stores/me/listings/import` -> `200`, `updated_count=1`); PostgreSQL confirmed `core_listing.price=2750000` on listing `327`. (Fixed `BulkImportRowInput` / `bulk_import_listings` & `BulkImportData` contract mismatch in `backend/core/listings/` so `listing_id` CSV/Excel round-tripping works with `updated_count`/`skipped_count`.)
- **Issues / Next Steps:** None.

### [QA-042] Merchant — Store Profile Settings, Opening Hours & QR Poster
- **Verdict:** `WORKING`
- **Live Test Evidence:** Updated Store #1 opening hours and clicked `حفظ التغييرات` (`PUT /api/v1/stores/me` -> `200`), then launched Store QR Poster modal (`img[alt='Store QR Code']` visible). (Fixed `MerchantPortal.tsx` Settings `useEffect` dependency hydration bug where `sPhone`/`sWhatsapp` stayed blank after fallback and unsaved changes could be clobbered by background refreshes.)
- **Issues / Next Steps:** None.

### [QA-043] Merchant — Staff Invitation & Removal
- **Verdict:** `WORKING`
- **Live Test Evidence:** Added clerk `QA Temp Clerk` (`+249928887777`, `POST /api/v1/stores/me/staff` -> `201`), verified `core_membership` for Store #1 increased `2 -> 3`, then removed via confirmation dialog (`DELETE /api/v1/stores/me/staff/:id` -> `200`) returning `core_membership` count `3 -> 2`.
- **Issues / Next Steps:** None.

### [QA-044] Merchant — Store Incoming Message Notifications & Internal Inbox
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `رسائل العملاء` Inbox (`MerchantInboxPanel`), opened buyer Ahmed's thread (`POST /api/v1/stores/me/chats/:threadKey/read` -> `200` when unread in run `task-1132`; already read in final run), sent store reply (`POST .../reply` -> `201`); PostgreSQL `core_customernotification` (`type='chat_reply'`) incremented `2 -> 3`.
- **Issues / Next Steps:** None.

### [QA-045] Merchant — External Customer-App Messages Tab as Merchant
- **Verdict:** `WORKING`
- **Live Test Evidence:** Switched from Merchant Portal to Storefront (`السوق`), opened external `الرسائل` dock tab, verified Page 1 conversation list -> clicked buyer Ahmed into Page 2 single-person chat -> sent reply (`POST /reply` -> `201`) -> clicked Back (`العودة إلى الرسائل`) returning cleanly to Page 1.
- **Issues / Next Steps:** None.

### [QA-046] Merchant — Request Sponsored Ad Campaign
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked `طلب إعلان مموّل` (`MerchantAdRequestModal`), entered Arabic/English headline + Bankak ref `BNK-QA-9988`, and submitted (`POST /api/v1/stores/me/ads/request` -> `201`). PostgreSQL `core_sponsoredad` count increased `2 -> 3` with zero console errors and zero unexpected 4xx/5xx responses across the entire Merchant suite.
- **Issues / Next Steps:** None.


### [QA-047] Admin — Sign In & Overview KPIs + Regional Distribution
- **Verdict:** `WORKING`
- **Live Test Evidence:** Navigated to `#admin`, signed in as `founder@sudanphones.sd` (`POST /api/v1/auth/login` -> `200`), loaded Platform-Wide Founder Overview (`GET /api/v1/admin/overview` -> `200`) with live verified stores, pending applications, live listings, and regional distribution breakdown matching PostgreSQL.
- **Issues / Next Steps:** None.

### [QA-048] Admin — Verification Queue & Private Document Evidence Modal
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `توثيق المتاجر`, filtered queue to `submitted`, and selected a pending store application (`GET /api/v1/admin/verifications/:id/documents` -> `200`), displaying applicant profile and private evidence document entries excluded from public storefront profiles.
- **Issues / Next Steps:** None.

### [QA-049] Admin — Approve Pending Store Application
- **Verdict:** `WORKING`
- **Live Test Evidence:** Clicked `اعتماد وتوثيق المتجر` and confirmed (`POST /api/v1/admin/verifications/:id/decision` -> `200`). PostgreSQL confirmed `core_store.status='verified'` count incremented (`48 -> 49` in final run). (Fixed `PrototypeContext.tsx` race where `refreshPublicData()` previously ran after `refreshAdminData()` and temporarily evicted pending stores from state.)
- **Issues / Next Steps:** None.

### [QA-050] Admin — Reject / Request Changes on Pending Store
- **Verdict:** `WORKING`
- **Live Test Evidence:** Selected next pending store application, clicked `طلب تعديلات`, entered feedback note, and confirmed (`POST /api/v1/admin/verifications/:id/decision` -> `200`). PostgreSQL confirmed `core_store.status='changes_requested'` count incremented (`7 -> 8` in final run).
- **Issues / Next Steps:** None.

### [QA-051] Admin — Phone Catalog CRUD: Add Brand & Add Model
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `كتالوج الهواتف`, created new brand (`POST /api/v1/admin/catalog/brands` -> `201`) and new model (`POST /api/v1/admin/catalog/models` -> `201`); PostgreSQL confirmed `core_brand` (`13 -> 14`) and `core_phonemodel` (`19 -> 20`) persisted cleanly. (Fixed `AdminCatalogPanel.tsx` `loadCatalog()` to use `api.getBrands()` and paginated `api.getPublicModels({ limit: 100, offset })` instead of merchant-only `/catalog/brands` `403` and invalid `limit=200` `400`.)
- **Issues / Next Steps:** None.

### [QA-052] Admin — Phone Catalog CRUD: Edit & Delete Model
- **Verdict:** `WORKING`
- **Live Test Evidence:** Added Edit Model modal to `AdminCatalogPanel.tsx` (`Pencil` action -> `api.updateAdminModel`), edited the newly created QA model battery to `5400` (`PATCH /api/v1/admin/catalog/models/:id` -> `200`, verified in PostgreSQL `specifications->'battery'->>'capacity_mah'='5400'`), deleted the unused model (`DELETE` -> `200`, restoring count to `19`), and verified deleting in-use `iPhone 15 Pro Max` returned safe `409 MODEL_IN_USE` toast without data loss.
- **Issues / Next Steps:** None.

### [QA-053] Admin — Listings Moderation Queue
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `إشراف الإعلانات`, flagged a live listing (`POST /api/v1/admin/listings/:id/moderate` `action='flag'` -> `200`, PostgreSQL `moderation='flagged'` `count=1`), then cleared the flagged listing back (`action='clear'` -> `200`, restoring public state cleanly). (Fixed `moderation_queue` ordering in `backend/core/listings/services.py` so `flagged` items sort to the top ahead of `limit=100`, and updated `PrototypeContext.tsx` `moderateListing` to apply `res.data.listing` version immediately.)
- **Issues / Next Steps:** None.

### [QA-054] Admin — Customer Reports Review & Resolve
- **Verdict:** `WORKING`
- **Live Test Evidence:** In `إشراف الإعلانات` Customer Reports queue (`GET /api/v1/admin/reports`), clicked `تمت المراجعة` on open reports across live QA runs (`task-1275`, `1293`, `1302`, `1308`), receiving `POST /api/v1/admin/reports/:id/resolve` -> `200` and transitioning PostgreSQL `core_customerreport` `status='open'` count cleanly `4 -> 3 -> 2 -> 1 -> 0` (`status='reviewed'`).
- **Issues / Next Steps:** None.

### [QA-055] Admin — Sponsored Ads CRUD & Live Activation
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `الإعلانات المموّلة`, toggled campaign status (`PATCH /api/v1/admin/ads/:id` -> `200`), opened live `معاينة` App-Open Ad overlay preview (`true`), and deleted the merchant-requested QA test campaign (`DELETE /api/v1/admin/ads/:id` -> `200`, `core_sponsoredad` `3 -> 2` in run `task-1275`).
- **Issues / Next Steps:** None.

### [QA-056] Admin — Custom Admin Roles CRUD & Role Deletion
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `الأدوار والصلاحيات`, created a custom role (`POST /api/v1/admin/roles` -> `201`, `core_adminrole` `4 -> 5`), then requested dual-approved deletion (`DELETE /api/v1/admin/roles/:id` -> `202` pending `DualApproval`).
- **Issues / Next Steps:** None.

### [QA-057] Admin — Dual Approval Suspend Store & Distinct-Founder Safeguard
- **Verdict:** `WORKING`
- **Live Test Evidence:** Opened `التدقيق والموافقة المزدوجة`, submitted store suspension proposal (`POST /api/v1/admin/stores/:id/suspend` -> `202`), verified `core_dualapproval` (`status='pending'`) incremented (`9 -> 10`), and verified the UI displayed the awaiting-second-approval status and blocked same-founder approval (`لا يمكن لمقدم الطلب اعتماد الإجراء الحساس بنفسه`). (Fixed `mapDualApproval` in `web/src/api/mappers.ts` to map backend `status='pending'` -> `'awaiting_second_approval'` and resolved `currentAdminId` from `me.id` in `AdminPortal.tsx`.)
- **Issues / Next Steps:** None.

### [QA-058] Admin — Audit Log Search & Sign Out
- **Verdict:** `WORKING`
- **Live Test Evidence:** Inspected immutable `core_auditevent` stream (`242` DB rows, `GET /api/v1/admin/audit-events` -> `200`), then signed out cleanly (`DELETE /api/v1/auth/session` -> `200`) with 0 server errors and 0 unexpected 4xx responses.
- **Issues / Next Steps:** None.


---

## Final Validation Commands & Outcomes

- **`PYTHON=.venv/bin/python make openapi`:** Passed (`exit 0`) — regenerated `docs/openapi.json`, `docs/api/CATALOG.md`, and `docs/api/operations.json`.
- **`cd web && npm run lint && npm run build`:** Passed (`exit 0`) — `tsc --noEmit` reported zero errors and Vite v8.4.0 production build succeeded (`2156 modules transformed`).
- **`POSTGRES_DB=sudan_phones POSTGRES_USER=sudan POSTGRES_PASSWORD=sudan_qa_pass POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5545 PYTHON=.venv/bin/python make check`:** Passed (`exit 0`) — `scripts/check_secrets.py` clean, `unittest` (`142 tests in 19.576s` OK), `compileall` + `docs/bugs/SCHEMA.json` valid, `14` skill packages validated, `export_openapi.py --check` & `export_api_catalog.py --check` matched backend, `ctx.py lint` (`18 records, 0 errors, 0 conflicts`), `context_migration.py` clean, Django `backend/manage.py check` & `test core` (`110 tests in 137.654s` OK against PostgreSQL 16). (`sync_slack_api_contracts.py --check --allow-skip-no-token` skipped live Slack comparison because no Slack token is configured.)
- **`python3 scripts/check_secrets.py`:** Passed (`exit 0`) — `No forbidden credentials or secrets detected.`
- **Checklist completion (`grep -c '^\- \[ \]' docs/QA_TASK_LIST.md`):** `0` unchecked (`58 / 58` items verified and crossed off).
