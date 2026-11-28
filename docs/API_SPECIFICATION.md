# Sudan Phones — Complete Backend API Specification (Existing, Upgraded & New)

**Version:** 2.0 (Post-UI/UX & Core Feature Overhaul)  
**Base URL:** `/api/v1`  
**Target Backend Stack:** Django REST Framework (Python 3.13) + PostgreSQL 16  
**Clients:** React Customer Web/Mobile App, React Merchant Portal, React Admin Portal, Flutter Customer App  
**Total Endpoints Documented:** **95** (**78 Existing** · **5 Upgraded** · **12 New**)

---

## 1. Executive Summary & Change Legend

Every endpoint currently invoked by the frontend (`web/src/api/client.ts`) and emulated in the prototype mock server (`server.ts`) is documented below so the backend team can implement or verify exact contracts with zero guesswork.

| Tag | Count | Meaning |
| --- | :---: | --- |
| **`EXISTING`** | 78 | Already designed/implemented in the core API contract; keep response shape and behavior aligned. |
| **`UPGRADED`** | 5 | Existing endpoint with new request fields, response fields, or side effects (e.g., `used_checklist`, price-drop alert notifications, USD exchange rate rounding, staff name + invite code). |
| **`NEW`** | 12 | Brand-new endpoint added to close missing loops (Price Alerts, Customer Notifications, Two-Way Merchant Chat Inbox, Listing Duplication, Self-Serve Sponsored Ad Requests, and Admin Phone Catalog Manager). |

> **Scope Note:** All 5 optional "Wow Factor" features (Fair Market Price Indicator, Trade-In Estimator, Price History Sparkline, Verified In-Stock Freshness Stamp, and WhatsApp Catalog Poster Generator) were intentionally skipped per product decision and have no endpoints here.

---

## 2. Global API Conventions

### 2.1 Standard Headers
| Header | Required | Purpose |
| --- | --- | --- |
| `Accept` | Yes | `application/json` |
| `Content-Type` | Mutations | `application/json` (except binary `PUT` uploads) |
| `Accept-Language` | Recommended | `ar` (default) or `en` — controls localized messages & auto-replies |
| `X-Session-Token` | Auth / Mobile | Session token mirror returned on auth responses (supports WebView/Capacitor where cookies may be restricted) |
| `X-CSRFToken` | Mutations | CSRF token bootstrapped via `GET /api/v1/auth/session` (rotated after login/register) |
| `X-Chat-Visitor-Id` | Guest features | Client-generated UUID identifying guest buyers for store chat threads, price alerts, and notifications without forced login |
| `Idempotency-Key` | Listing writes | Client UUID preventing duplicate listing creation or double price/stock updates on flaky networks |

### 2.2 Standard Response Envelopes
**Success:**
```json
{
  "data": {},
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 120
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable localized message",
    "details": {}
  }
}
```

### 2.3 Common Status Codes & Concurrency
- `200 OK` / `201 Created` — Successful read/write.
- `400 Bad Request` — Validation error (invalid Sudan phone `+249...`, missing required fields).
- `401 Unauthorized` — Missing or expired session.
- `403 Forbidden` — Role or permission denied (`buyer`, `merchant`, `admin`, or store ownership mismatch).
- `404 Not Found` — Resource does not exist or is not visible to caller.
- `409 Conflict` — Optimistic concurrency mismatch (`version` field on listings, verifications, dual approvals) or duplicate unique key.

---

## 3. Domain 1 — Authentication & Session Management (8 Endpoints)

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `GET /api/v1/auth/session` | Public | Bootstrap CSRF cookie/header (`X-CSRFToken`) and return current session state. |
| `EXISTING` | `DELETE /api/v1/auth/session` | Auth | Sign out and invalidate current session & `X-Session-Token`. |
| `EXISTING` | `POST /api/v1/auth/login` | Public | Sign in buyer, merchant, or admin using `phone` (`+249...`) or `email` + `password`. |
| `EXISTING` | `POST /api/v1/auth/register` | Public | Register a new buyer account (optional—browsing is guest-first). |
| `EXISTING` | `POST /api/v1/merchant/auth/register` | Public | Register a new merchant account and bootstrap draft store record. |
| `EXISTING` | `POST /api/v1/auth/google` | Public | Sign in or sign up via Google Identity `id_token`. |
| `EXISTING` | `POST /api/v1/merchant/auth/verify` | Auth | Verify WhatsApp or email OTP code (`channel: "whatsapp" \| "email"`). |
| `EXISTING` | `POST /api/v1/auth/recover` | Public | Initiate or complete password recovery via WhatsApp/email OTP. |

#### Key Contracts
- **`GET /api/v1/auth/session` Response (`200`):**
  ```json
  {
    "data": {
      "authenticated": true,
      "role": "guest | buyer | merchant | admin",
      "permissions": ["stores.verify", "listings.moderate"],
      "user_id": 12,
      "merchant": false,
      "phone_verified": true,
      "email_verified": true
    }
  }
  ```
- **`POST /api/v1/auth/login` Request:** `{ "phone": "+249912345678", "password": "..." }` OR `{ "email": "merchant@sudanphones.sd", "password": "..." }`. Returns `ApiSession` + `X-Session-Token` & rotated `X-CSRFToken` headers.
- **`POST /api/v1/auth/register` & `POST /api/v1/merchant/auth/register` Request:** `{ "phone": "+249...", "password": "...", "name": "...", "email": "...", "channel": "whatsapp | email" }`.

---

## 4. Domain 2 — Customer Profile, Favorites, Price Alerts & Notifications (10 Endpoints)

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `GET /api/v1/me` | Auth | Return authenticated user profile (`id`, `name`, `phone`, `email`, `preferred_city`, `preferred_locale`, `role`). |
| `EXISTING` | `PATCH /api/v1/me` | Auth | Update `name`, `preferred_city`, or `preferred_locale` (`ar` \| `en`). |
| `EXISTING` | `GET /api/v1/me/favorites` | Auth / Visitor | List saved favorite listings for the buyer. |
| `EXISTING` | `POST /api/v1/me/favorites/:id` | Auth / Visitor | Save listing `:id` to favorites. |
| `EXISTING` | `DELETE /api/v1/me/favorites/:id` | Auth / Visitor | Remove listing `:id` from favorites. |
| **`NEW`** | `GET /api/v1/me/alerts` | Auth / Visitor | List active price-drop alerts for the current user or `X-Chat-Visitor-Id`. |
| **`NEW`** | `POST /api/v1/me/alerts` | Auth / Visitor | Subscribe to a price-drop alert on a listing (idempotent per owner + `listing_id`). |
| **`NEW`** | `DELETE /api/v1/me/alerts/:id` | Auth / Visitor | Delete a price-drop alert by alert ID. |
| **`NEW`** | `GET /api/v1/me/notifications` | Auth / Visitor | List customer notifications (price drops, merchant chat replies, system notices). |
| **`NEW`** | `POST /api/v1/me/notifications/read` | Auth / Visitor | Mark all notifications for the current user/visitor as read. |

#### New Endpoint Details
- **`POST /api/v1/me/alerts`**
  - **Request:** `{ "listing_id": 104, "target_price_sdg": 1500000 }` (`target_price_sdg` optional; defaults to 95% of current price rounded to 1,000 SDG).
  - **Response (`201`):**
    ```json
    {
      "data": {
        "id": 1,
        "listing_id": 104,
        "model": "iPhone 14 Pro",
        "model_title": "Apple iPhone 14 Pro",
        "initial_price_sdg": 1580000,
        "target_price_sdg": 1500000,
        "created_at": "2026-11-27T12:00:00Z"
      }
    }
    ```
- **`GET /api/v1/me/notifications`**
  - **Response (`200`):**
    ```json
    {
      "data": [
        {
          "id": "notif-1",
          "type": "price_drop | merchant_reply | system",
          "title_ar": "انخفاض سعر iPhone 15 Pro Max",
          "title_en": "Price dropped on iPhone 15 Pro Max",
          "body_ar": "انخفض السعر إلى 2,850,000 ج.س في متجر النيل للهواتف.",
          "body_en": "Price dropped to 2,850,000 SDG at Nile Mobile Hub.",
          "listing_id": 101,
          "store_id": 1,
          "read": false,
          "created_at": "2026-11-27T12:05:00Z"
        }
      ]
    }
    ```
  - **Backend Trigger Notes:** Insert a `price_drop` notification whenever a merchant reduces price via `PATCH /api/v1/stores/me/listings/:id/price` or `POST /api/v1/stores/me/listings/bulk-price` for any matching alert. Insert a `merchant_reply` notification whenever a merchant replies via `POST /api/v1/stores/me/chats/:threadKey/reply`.

---

## 5. Domain 3 — Public Marketplace Discovery & Storefront (14 Endpoints)

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `GET /api/v1/config` | Public | Marketplace metadata: Sudan states/cities list, currencies, feature flags. |
| `EXISTING` | `GET /api/v1/home` | Public | Curated storefront feed (`?city=khartoum`) returning featured stores, deals, newest listings, used listings. |
| `EXISTING` | `GET /api/v1/brands` | Public | List active phone brands with Arabic/English names and model counts (`?limit=100&offset=0`). |
| `EXISTING` | `GET /api/v1/models` | Public | List public phone models with aggregated product ratings (`?brand=&brand_id=&city=&q=&limit=100`). |
| `EXISTING` | `GET /api/v1/listings` | Public | Search & filter active listings (`q`, `city`, `brand`, `condition`, `min_price`, `max_price`, `storage_gb`, `ram_gb`, `has_discount`, `accepts_trade_in`, `sort`, `limit`, `offset`). |
| `EXISTING` | `GET /api/v1/listings/:id` | Public | Full listing details including `used_checklist` (5-item verification), store summary, specs, and product-level rating stats. |
| `EXISTING` | `GET /api/v1/listings/:id/contact-methods` | Public | Return click-to-call (`phone_url`) and pre-filled WhatsApp (`whatsapp_url`) links for verified store. |
| `EXISTING` | `POST /api/v1/listings/:id/contact-events` | Public | Record anonymized buyer contact telemetry (`{ "event_id": "uuid", "method": "whatsapp | phone | in_app" }`). |
| `EXISTING` | `GET /api/v1/stores/featured` | Public | Verified stores list with `lat`/`lng` coordinates (or city anchor), address, rating, hours, and active listing count (powers both Store Directory & Interactive Map Explorer). |
| `EXISTING` | `GET /api/v1/stores/:id` | Public | Full verified store profile (verification badge, address, hours, phone, WhatsApp, ratings, policies). |
| `EXISTING` | `GET /api/v1/stores/:id/listings` | Public | All active listings belonging to store `:id`. |
| `EXISTING` | `GET /api/v1/catalog/brands` | Public/Auth | Reference catalog brands for merchant listing wizard & admin catalog (`?q=&limit=100`). |
| `EXISTING` | `GET /api/v1/catalog/models` | Public/Auth | Reference catalog models (`?brand_id=&q=&limit=100&offset=0`) with full `specifications` JSON. |
| `EXISTING` | `GET /api/v1/catalog/variants` | Public/Auth | Valid storage/RAM/color variants for a catalog model (`?model_id=&limit=100`). |

#### Important Listing Payload Addition (`used_checklist`)
All listing responses (`GET /api/v1/listings`, `GET /api/v1/listings/:id`, `GET /api/v1/stores/:id/listings`, `GET /api/v1/stores/me/listings`) now include an optional `used_checklist` object for used devices:
```json
"used_checklist": {
  "original_screen": true,
  "biometrics_working": true,
  "imei_clean": true,
  "sudan_network_unlocked": true,
  "accessories_included": false
}
```

---

## 6. Domain 4 — Customer ↔ Store Messaging & Merchant Inbox (4 Endpoints)

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `GET /api/v1/stores/:id/messages` | Public/Auth | Fetch chat thread between current buyer/visitor (`X-Chat-Visitor-Id` or `user_id`) and store `:id`. |
| `EXISTING` | `POST /api/v1/stores/:id/messages` | Public/Auth | Send a message from buyer to store `:id` (supports optional `listing_id`, `listing_title`, `listing_price_sdg`, `sender_name`, `sender_phone`). |
| **`NEW`** | `GET /api/v1/stores/me/chats` | Merchant | List all buyer conversation threads for the authenticated merchant's store, sorted by most recent message, with unread counts and listing context. |
| **`NEW`** | `POST /api/v1/stores/me/chats/:threadKey/reply` | Merchant | Send a real-time store reply into buyer thread `:threadKey`, clear unread count, and generate a `merchant_reply` customer notification. |

#### New Endpoint Details
- **`GET /api/v1/stores/me/chats` Response (`200`):**
  ```json
  {
    "data": [
      {
        "thread_key": "store_1_visitor_abc",
        "store_id": 1,
        "customer_name": "أحمد الطيب",
        "customer_phone": "+249912300111",
        "listing_id": 101,
        "listing_title": "Apple iPhone 15 Pro Max",
        "listing_price_sdg": 2850000,
        "unread_count": 2,
        "last_message_at": "2026-11-27T11:40:00Z",
        "last_message_text": "هل الجهاز متوفر باللون التيتانيوم الطبيعي؟",
        "messages": [ /* ApiStoreChatMessage[] */ ]
      }
    ]
  }
  ```
- **`POST /api/v1/stores/me/chats/:threadKey/reply`**
  - **Request:** `{ "text": "نعم متوفر بضمان سنة كاملة ويمكنك زيارتنا بشارع القصر." }`
  - **Response (`201`):** `{ "data": { "message": { /* ApiStoreChatMessage */ }, "messages": [ /* updated thread */ ] } }`

---

## 7. Domain 5 — Ratings & Trust Reports (7 Endpoints)

> **Architecture Rule:** Buyers rate **individual product listings** and **verified stores** only. Phone model ratings are never submitted directly — they are **automatically aggregated** from all product ratings linked to that parent model.

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `GET /api/v1/stores/:id/ratings` | Public | List store reviews and average rating (`?limit=50`). |
| `EXISTING` | `POST /api/v1/stores/:id/ratings` | Public/Auth | Submit store rating (`{ "stars": 1..5, "comment": "...", "author_name": "..." }`). |
| `EXISTING` | `GET /api/v1/ratings/products` | Public | List recent product reviews across the marketplace (used to hydrate aggregated model ratings). |
| `EXISTING` | `GET /api/v1/listings/:id/ratings` | Public | List product reviews for listing `:id`. |
| `EXISTING` | `POST /api/v1/listings/:id/ratings` | Public/Auth | Submit a product review for listing `:id` (`{ "stars": 1..5, "comment": "...", "author_name": "..." }`); automatically recalculates linked parent model rating. |
| `EXISTING` | `GET /api/v1/models/:id/ratings` | Public | Return aggregated rating average, count, and contributing product reviews for parent phone model `:id`. |
| `EXISTING` | `POST /api/v1/reports` | Public/Auth | Submit a trust/safety report on a listing or store (`{ "target_type": "listing | store", "target_id": 101, "reason": "...", "details": "...", "reporter_contact": "..." }`). |

---

## 8. Domain 6 — Media Upload Pipeline (3 Endpoints)

Used for both listing photos and merchant verification documents (images & PDFs) with client-side SHA-256 verification.

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `POST /api/v1/media/uploads` | Auth | Step 1: Request presigned upload URL (`{ "kind": "listing_photo", "content_type": "image/jpeg", "size": 240120, "sha256": "..." }`). Returns `{ id, url, headers }`. |
| `EXISTING` | `PUT /api/v1/media/mock-upload/:id` | Presigned | Step 2: Upload raw binary bytes directly to object storage (S3/GCS/R2 presigned URL in production). |
| `EXISTING` | `POST /api/v1/media/uploads/:id/complete` | Auth | Step 3: Finalize upload, verify checksum & MIME type, and mark media asset ready for attachment. |

---

## 9. Domain 7 — Sponsored App-Open Ads & Analytics (5 Endpoints)

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `GET /api/v1/ads/active` | Public | Return currently active sponsored campaigns matching `?city=` ordered by `priority`. |
| `EXISTING` | `POST /api/v1/ads/:id/impression` | Public | Record an ad impression (`{ "city": "khartoum", "locale": "ar", "source": "app_open" }`). |
| `EXISTING` | `POST /api/v1/ads/:id/click` | Public | Record an ad click (`{ "city", "locale", "listing_id", "time_to_click_ms", "source" }`) and update CTR metrics. |
| `EXISTING` | `GET /api/v1/stores/me/ads` | Merchant | List the merchant's sponsored campaigns plus summary metrics (`total_campaigns`, `active_campaigns`, `total_impressions`, `total_clicks`, `overall_ctr_pct`). |
| **`NEW`** | `POST /api/v1/stores/me/ads/request` | Merchant | Self-serve campaign request submitted by a merchant with Bankak payment reference; created as `status: "scheduled"`, `payment_status: "pending"` for Admin review/activation. |

#### New Endpoint Details
- **`POST /api/v1/stores/me/ads/request`**
  - **Request:**
    ```json
    {
      "listing_id": 101,
      "title_ar": "عروض آيفون 15 برو ماكس",
      "title_en": "iPhone 15 Pro Max Deals",
      "subtitle_ar": "بضمان الوكيل في الخرطوم",
      "subtitle_en": "Official warranty in Khartoum",
      "target_city": "all | khartoum | red_sea | ...",
      "duration_days": 7,
      "paid_amount_sdg": 120000,
      "payment_ref": "BNK-98451234",
      "image_url": "https://..."
    }
    ```
  - **Response (`201`):** Returns created `ApiSponsoredAd` with `status: "scheduled"` and `payment_status: "pending"`. Appears immediately in Admin Portal → Sponsored Ads for approval/activation.

---

## 10. Domain 8 — Merchant Store, Verification, Inventory & Staff (20 Endpoints)

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `GET /api/v1/stores/me` | Merchant | Fetch authenticated merchant's store profile, verification status, and metadata. |
| `EXISTING` | `PUT /api/v1/stores/me/profile` | Merchant | Update store public profile (name AR/EN, address, city, hours, phones, WhatsApp, warranty policy, trade-in policy). |
| `EXISTING` | `PUT /api/v1/stores/me` | Merchant | Update store operational settings (e.g., auto-reply preferences, display settings). |
| `EXISTING` | `GET /api/v1/stores/me/verification` | Merchant | Get store KYC verification state, submitted docs, and rejection notes if any. |
| `EXISTING` | `POST /api/v1/stores/me/verification/documents` | Merchant | Step 1 presigned upload init specifically for store KYC documents (Commercial Registry, Owner ID, Storefront photo). |
| `EXISTING` | `POST /api/v1/stores/me/verification/submit` | Merchant | Submit uploaded document IDs (`{ "documents": ["doc-1", "doc-2"] }`) for admin verification review. |
| `EXISTING` | `POST /api/v1/stores/me/reverification` | Merchant | Request reverification after critical profile/location changes (`{ "note", "name?", "city?", "documents?" }`). |
| `EXISTING` | `GET /api/v1/stores/me/dashboard` | Merchant | Store KPIs: published count, stock alerts, 7-day views, total WhatsApp/phone clicks, daily chart series. |
| `EXISTING` | `GET /api/v1/stores/me/listings` | Merchant | List all store listings (published, out-of-stock, flagged, archived). |
| **`UPGRADED`** | `POST /api/v1/stores/me/listings` | Merchant | Create a new or used phone listing via the 6-step wizard (`Idempotency-Key`). **Upgrade:** now accepts and persists `used_checklist` (5 boolean verification checks) for used phones. |
| **`UPGRADED`** | `PATCH /api/v1/stores/me/listings/:id/price` | Merchant | Fast inline price update (`{ "version": 2, "price": "2750000.00" }`, optimistic lock). **Upgrade:** stores `previous_price_sdg` for discount badges and triggers `price_drop` notifications for matching `price_alerts`. |
| `EXISTING` | `PATCH /api/v1/stores/me/listings/:id/stock` | Merchant | Fast stock quantity / `used_availability` update (`{ "version", "quantity", "used_availability?" }`). |
| **`UPGRADED`** | `PATCH /api/v1/stores/me/listings/:id` | Merchant | Full listing edit modal endpoint. **Upgrade:** now edits `storage_gb`, `ram_gb`, `color`, `warranty_months`, `accessories`, `defects`, `replaced_parts`, `battery_health`, `condition_grade`, `accepts_trade_in`, `usd_price`, `notes`, and `used_checklist` (with optimistic `version` increment). |
| **`NEW`** | `POST /api/v1/stores/me/listings/:id/duplicate` | Merchant | Clone an existing listing into a fresh listing with same model/specs/images/price (resets `version: 1`, generates new ID) so merchants can list another storage/color variant in seconds. |
| `EXISTING` | `DELETE /api/v1/stores/me/listings/:id` | Merchant | Archive/delete a store listing. |
| **`UPGRADED`** | `POST /api/v1/stores/me/listings/bulk-price` | Merchant | Bulk re-price inventory (`{ "mode": "percent | usd_rate", "percent?", "usd_rate?", "round_to?", "condition": "all | new | used" }`). **Upgrade:** supports `round_to` (default `1000` SDG), applies `usd_rate` to all USD-referenced listings, tracks previous prices, and dispatches `price_drop` alerts when prices decrease. |
| `EXISTING` | `POST /api/v1/stores/me/listings/import` | Merchant | Bulk CSV/JSON stock & price update (`{ "rows": [{ "listing_id", "price?", "quantity?", "usd_price?", "accepts_trade_in?" }] }`). |
| `EXISTING` | `GET /api/v1/stores/me/staff` | Merchant | List store team members (`owner`, `manager`, `clerk`, `staff`). |
| **`UPGRADED`** | `POST /api/v1/stores/me/staff` | Merchant | Invite/add a staff member (`{ "name?", "phone?", "user_id?", "role": "manager | clerk | staff" }`). **Upgrade:** persists display `name` and returns a shareable `invite_code` (e.g., `SP-482910`) for WhatsApp onboarding. |
| `EXISTING` | `DELETE /api/v1/stores/me/staff/:id` | Merchant | Remove a staff member from the store. |

---

## 11. Domain 9 — Admin Operations, Governance, Ads & Catalog Manager (24 Endpoints)

| Status | Method & Path | Auth | Summary |
| --- | --- | --- | --- |
| `EXISTING` | `GET /api/v1/admin/overview` | Admin | Platform-wide KPIs (pending verifications, flagged listings, open reports, verified stores, active listings, ad revenue). |
| `EXISTING` | `GET /api/v1/admin/verifications` | Admin | Queue of store KYC verification applications (`?limit=100`). |
| `EXISTING` | `GET /api/v1/admin/verifications/:id/documents` | Admin | Retrieve presigned preview URLs for KYC documents attached to verification `:id`. |
| `EXISTING` | `POST /api/v1/admin/verifications/:id/decision` | Admin | Approve, reject, or request changes (`{ "decision", "version", "reason" }`). |
| `EXISTING` | `GET /api/v1/admin/moderation/queue` | Admin | Listings flagged by users or automated checks awaiting review. |
| `EXISTING` | `POST /api/v1/admin/listings/:id/moderate` | Admin | Approve, hide, or remove a listing (`{ "action", "version", "reason" }`). |
| `EXISTING` | `GET /api/v1/admin/reports` | Admin | Customer trust/safety reports (`?status=all | open | reviewed | dismissed`). |
| `EXISTING` | `POST /api/v1/admin/reports/:id/resolve` | Admin | Resolve or dismiss report (`{ "status", "resolution_note", "flag_listing" }`). |
| `EXISTING` | `POST /api/v1/admin/stores/:id/suspend` | Admin | Suspend a store (or open dual-approval request if required by governance policy) (`{ "reason" }`). |
| `EXISTING` | `GET /api/v1/admin/roles` | Admin | List custom RBAC roles and permission sets. |
| `EXISTING` | `POST /api/v1/admin/roles` | Admin | Create or update an admin RBAC role. |
| `EXISTING` | `DELETE /api/v1/admin/roles/:id` | Admin | Delete a custom admin RBAC role. |
| `EXISTING` | `GET /api/v1/admin/users` | Admin | List admin/staff operators and their assigned roles. |
| `EXISTING` | `GET /api/v1/admin/dual-approvals` | Admin | List four-eyes dual-approval governance requests (`?status=all | pending | approved | rejected`). |
| `EXISTING` | `POST /api/v1/admin/dual-approvals/:id/decision` | Admin | Second-admin approval/rejection (`{ "decision": "approve | reject", "version" }`). |
| `EXISTING` | `GET /api/v1/admin/audit-events` | Admin | Immutable audit trail of admin actions (`?actor=&action=&limit=100`). |
| `EXISTING` | `GET /api/v1/admin/ads` | Admin | List all sponsored ad campaigns (including merchant self-serve requests). |
| `EXISTING` | `POST /api/v1/admin/ads` | Admin | Create a new sponsored ad campaign directly. |
| `EXISTING` | `PATCH /api/v1/admin/ads/:id` | Admin | Update campaign status (`active | paused | scheduled | ended`), payment status (`paid | pending | invoiced`), priority, dates, or creatives. |
| `EXISTING` | `DELETE /api/v1/admin/ads/:id` | Admin | Delete a sponsored ad campaign. |
| **`NEW`** | `POST /api/v1/admin/catalog/brands` | Admin | Add a new phone brand (`{ "name": "Honor", "name_ar": "هونر" }`) to the shared reference catalog. |
| **`NEW`** | `POST /api/v1/admin/catalog/models` | Admin | Add a new phone model with specs and default storage/RAM/color variants so merchants can list it immediately. |
| **`NEW`** | `PATCH /api/v1/admin/catalog/models/:id` | Admin | Update a phone model's name or specifications JSON. |
| **`NEW`** | `DELETE /api/v1/admin/catalog/models/:id` | Admin | Delete a catalog phone model (blocked with `409 Conflict` if active listings reference it, or soft-deactivated). |

#### New Admin Catalog Request/Response Examples
- **`POST /api/v1/admin/catalog/brands`**
  - **Request:** `{ "name": "Honor", "name_ar": "هونر" }`
  - **Response (`201`):** `{ "data": { "id": 6, "name": "Honor", "slug": "honor", "name_ar": "هونر", "model_count": 0 } }`
- **`POST /api/v1/admin/catalog/models`**
  - **Request:**
    ```json
    {
      "brand_id": 1,
      "name": "iPhone 16 Pro Max",
      "release_year": 2024,
      "display_size": 6.9,
      "display_type": "LTPO Super Retina XDR OLED",
      "chipset": "Apple A18 Pro",
      "camera_mp": 48,
      "battery_mah": 4685,
      "variants": [
        { "storage_gb": 256, "ram_gb": 8, "color": "Desert Titanium" },
        { "storage_gb": 512, "ram_gb": 8, "color": "Natural Titanium" }
      ]
    }
    ```
  - **Response (`201`):** Returns the created `ApiCatalogModel` (and auto-generates default 128GB / 256GB / 512GB variants if `variants` is omitted).

---

## 12. PostgreSQL Schema & Django Migration Checklist (New & Upgraded Fields)

To support all 12 new and 5 upgraded endpoints in Django REST Framework + PostgreSQL 16, add the following tables and columns:

1. **`listings` table (ALTER):**
   - `used_checklist JSONB NULL` — stores `{ original_screen, biometrics_working, imei_clean, sudan_network_unlocked, accessories_included }`.
   - `previous_price_sdg NUMERIC(14,2) NULL` — populated automatically on price drops for discount badges and price alerts.
2. **`stores` table (ALTER):**
   - `latitude DOUBLE PRECISION NULL`, `longitude DOUBLE PRECISION NULL` — powers interactive map pins and Haversine `"Near Me"` distance sorting (fallback to Sudan state centroid if null).
3. **`store_staff` table (ALTER):**
   - `display_name VARCHAR(120) NOT NULL DEFAULT ''`
   - `invite_code VARCHAR(24) UNIQUE NULL`
4. **`price_alerts` table (NEW):**
   - `id BIGSERIAL PK`, `user_id BIGINT NULL FK`, `visitor_id UUID NULL`, `listing_id BIGINT NOT NULL FK`, `initial_price_sdg NUMERIC(14,2)`, `target_price_sdg NUMERIC(14,2) NULL`, `created_at TIMESTAMPTZ`.
   - Unique index on `(COALESCE(user_id::text, visitor_id::text), listing_id)`.
5. **`customer_notifications` table (NEW):**
   - `id BIGSERIAL PK`, `user_id BIGINT NULL FK`, `visitor_id UUID NULL`, `type VARCHAR(32)`, `title_ar TEXT`, `title_en TEXT`, `body_ar TEXT`, `body_en TEXT`, `listing_id BIGINT NULL`, `store_id BIGINT NULL`, `is_read BOOLEAN DEFAULT FALSE`, `created_at TIMESTAMPTZ`.
6. **`store_chat_threads` & `store_chat_messages` tables (NEW / UPGRADED):**
   - Thread key indexed by `(store_id, user_id / visitor_id)`, storing `customer_name`, `customer_phone`, `unread_by_store INT DEFAULT 0`, `last_message_at TIMESTAMPTZ`, plus message rows with `sender_role ('customer' | 'store')`, `listing_id`, `listing_title`, `listing_price_sdg`, `text`, `is_auto_reply`.
7. **`sponsored_ads` table (ALTER):**
   - Ensure `payment_status IN ('pending', 'invoiced', 'paid')`, `payment_ref VARCHAR(100)`, `requested_by_merchant BOOLEAN DEFAULT FALSE` so merchant self-serve ad requests flow cleanly into the Admin approval queue.
8. **`catalog_brands`, `catalog_models`, `catalog_variants` (EXISTING — ADD ADMIN PERMISSIONS):**
   - Enforce `catalog.manage` admin permission on `POST/PATCH/DELETE /api/v1/admin/catalog/*` and emit `audit_events` rows on every catalog mutation.
