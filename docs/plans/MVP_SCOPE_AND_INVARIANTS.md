# MVP Scope, Business Invariants & Architecture Sign-Off

> **Document ID:** `SPEC-SCOPE-01`  
> **Status:** Agreed & Signed Off by Both Founders  
> **Backend Founder:** Rasheed (@marco47t)  
> **Frontend Founder:** Moataz (@MoatazAbdElmutaal)  
> **Date:** 2026-11-16  
> **Milestone Reference:** `MILE-01` | **Roadmap Gate:** `GATE-01` (`Rec0CHJB6225D`) | **Backlog Checkpoint:** `INT-01` (`Rec0CJ1L4Q8EM`)  

---

## 1. Executive Summary & Sign-Off

This document records the joint agreement between backend founder Rasheed and frontend founder Moataz on the MVP scope, target technology stack, business invariants, trust policies, and API contract standards for **Sudan Phones** (سوق الموبايلات في السودان).

By signing off on this specification, both founders establish the formal boundary for Step 1 (Phase 1) and unlock Step 2 (Phase 2: Foundation & Dual Client Shells) under `GATE-01`.

---

## 2. Confirmed Application Stack & Founder Roles

Following explicit user and founder direction:

- **Backend & Infrastructure (Rasheed @marco47t):**
  - **Framework:** Django 5.x with Django REST Framework (DRF).
  - **Database:** PostgreSQL 16 with Django ORM and standard migrations.
  - **Task Queue & Cache:** Celery with Redis for asynchronous background processing (media processing, webhook callbacks, cache invalidation).
  - **Object Storage:** Cloudflare R2 (S3-compatible API) for public listing images and private verification documents.
  - **Layer Separation:** Strict flow: HTTP Views / ViewSets ➔ Serializers / Validators ➔ Domain Services ➔ Models / Queries.

- **Frontend & Client Applications (Moataz @MoatazAbdElmutaal):**
  - **Customer Mobile App:** Flutter (Android & iOS target; optimized for low-resource Android devices, low-data consumption, and offline resilience).
  - **Merchant & Admin Web Portal:** React 18+ with Vite, Tailwind CSS, and headless UI components.
  - **Localization & UX:** Arabic RTL first across all screens (`ar`), with secondary English support (`en`).

- **Operating Contract Transition:**
  - Transition roadmap is defined in `docs/plans/STACK_TRANSITION.md`.
  - Application implementation remains gated until Step 2 (`GATE-02`) establishes baseline scaffolds and verified CI checks.

---

## 3. MVP Scope Boundary & Out-of-Scope Exclusions

### 3.1 In-Scope for MVP
1. **Verified Store Catalog & Listings:** Public browsing of phone listings published exclusively by verified retail stores.
2. **Search & Multi-Facet Filtering:** Full-text phone search with filters by city/region, brand, price range, condition (new vs used), and storage capacity.
3. **Price Comparison on Same Device Variant:** Side-by-side price comparison of different verified store offers for identical phone models.
4. **Direct WhatsApp & Phone Inquiries:** Immediate 1-tap customer inquiry to verified merchant via WhatsApp click-to-chat and native phone dialer.
5. **Merchant Portal:** Store profile setup, business verification evidence submission, and inventory management (new stock and used units).
6. **Founder Administration Portal:** Review queue for pending store verifications and post-publication listing moderation feed.
7. **Bilingual Arabic RTL Interface:** Culturally native Sudanese Arabic terminology with robust offline/reconnect handling.

### 3.2 Out-of-Scope for MVP (Explicitly Deferred)
1. **In-App Payment Processing & Escrow:** No online checkout, cart, or payment gateway integration in MVP. Transactions take place offline between customer and merchant upon inspection.
2. **Delivery & Logistics Dispatch:** No integrated courier dispatch or package tracking in MVP.
3. **Mandatory Customer Accounts:** Guest browsing and search require **no login**. Customer registration and saved favorites are deferred.
4. **Paid Advertising & Sponsored Banners:** The homepage functions strictly via organic catalog discovery (top brands, verified store spotlights, latest arrivals). Paid ad campaigns are deferred.
5. **Customer-to-Customer (C2C) Private Selling:** Only approved, verified retail shops sell on the platform. Individual consumer listings are strictly prohibited in MVP.

---

## 4. Core Business Invariants

### 4.1 Currency & Pricing
- **Single Currency:** **Sudanese Pound (`SDG`)** across all listings, pricing comparisons, and configuration.
- **Precision:** Prices are stored as decimal numbers with 2 decimal places (or integer minor units where applicable). No multi-currency conversion or dynamic forex rates in MVP.

### 4.2 Pilot Launch Regions & Geolocation Detection
- Initial pilot launch is restricted to physical stores located in:
  1. **Port Sudan** (بورتسودان — Red Sea State)
  2. **Khartoum** (الخرطوم)
  3. **Omdurman** (أم درمان)
- Pilot merchants must maintain an operational, verifiable physical storefront in one of these pilot cities.
- **Automated Geolocation Detection with Manual Fallback:**
  - `GET /api/v1/config` (API-019) provides geographic coordinates (`lat`, `lon`) and auto-detection coverage radius (`radius_km`) for each supported city.
  - Client applications query the device location upon launch/city selection:
    - If the user's distance is within `radius_km` of a supported city, that city is auto-selected by default and marked as auto-detected.
    - If the user is outside all supported pilot regions, or if device location permission is denied/unavailable, the app gracefully prompts the user to manually select their preferred market.
    - Users can manually override and switch their selected city at any time via the UI city selector.

### 4.3 Customer Contact & Guest Privacy
- Customers interact with merchants directly off-platform:
  - **WhatsApp Direct Message:** URL format: `https://wa.me/<merchant_phone>?text=<encoded_inquiry_text>`. Pre-filled inquiry text includes device model, condition, price, and listing link.
  - **Phone Call:** Native `tel:+249...` dialer action.
- **Privacy Guarantee:** Guest customers require no account. No customer IP, name, phone number, or tracking cookies are gathered or exposed to merchants during browsing.

---

## 5. Inventory Invariants: New vs Used Phones

The marketplace enforces a strict domain distinction between new and used device inventory:

| Invariant Dimension | New Phones (هواتف جديدة) | Used Phones (هواتف مستعملة) |
| :--- | :--- | :--- |
| **Identity & Unit Tracking** | Tracked by SKU / Model Variant + Stock Quantity (`quantity >= 1`). | Tracked as **discrete, individual physical units** (`quantity = 1`). |
| **Packaging & Seal** | Sealed box indicator (`is_sealed: true`). | Unsealed. Requires packaging status (`has_original_box: bool`). |
| **Warranty Terms** | Official agency warranty or merchant warranty period (in months). | Store return/inspection warranty period (in days, e.g., 3–7 days). |
| **Physical Condition Grade** | Uniform brand-new (`grade: "new"`). | Standardized physical grade: `like_new` (كالجديد), `excellent` (ممتاز), `good` (جيد), `fair` (مقبول). |
| **Battery Health** | 100% factory battery. | Exact battery health percentage (`battery_health: 50..100%` or null if unverified). |
| **Defects & Scratches** | None permitted. | Explicit description of scratches, dents, or replaced parts. |
| **Media Requirements** | Official catalog stock photos allowed + store seal photo. | **Minimum 3 real photos of the exact physical unit** (front, back, powered-on screen). |

---

## 6. Store Trust & Verification Policy

Trust is the central value proposition of Sudan Phones. Stores must be strictly vetted before any public listing is visible.

### 6.1 Required Verification Evidence
Every merchant must provide:
1. **Merchant National ID (الرقم الوطني / البطاقة القومية):** Clear color photo or scan of front and back.
2. **Commercial Registration (السجل التجاري) OR Physical Storefront Signboard:**
   - Formal Commercial Registration certificate, OR:
   - Clear high-resolution photo of the store signboard displaying the registered store name, street address, and storefront facade.
3. **Active WhatsApp & Contact Phone Number:** Verified via test communication during onboarding.

### 6.2 Evidence Privacy & Storage
- Verification evidence is stored in a **private Cloudflare R2 bucket**.
- Evidence documents are strictly accessible to authorized founders through time-limited (max 15-minute) presigned URLs.
- Verification evidence is **never exposed in public API responses**, search feeds, or client bundles.

### 6.3 Store State Machine
```
[ draft ] ──(Submit Documents)──► [ pending_verification ]
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
          [ changes_requested ]                              [ verified ]
                  │                                               │
                  └─► (Resubmit Documents) ─► [ pending ]         ▼
                                                             [ suspended ]
                                                                  │
                                                                  ▼
                                                             [ rejected ]
```
- **`draft`:** Store registered; documents not yet submitted.
- **`pending_verification`:** Documents submitted; awaiting founder review in `A-03`.
- **`changes_requested`:** Reviewer flagged an issue (e.g. illegible scan, mismatched store name). Merchant can view reviewer feedback on `M-04`, edit evidence on `M-03`, and resubmit.
- **`verified`:** Approved by founder. Unlocks merchant dashboard (`M-05+`) and listing publication.
- **`suspended`:** Store temporarily deactivated due to violation or dispute. All active listings immediately hidden from public search.
- **`rejected`:** Terminal rejection for fraudulent or unauthorized submissions.

---

## 7. Two-Tier Publication Trigger & Moderation Mechanics

The publication workflow balances merchant speed with marketplace safety:

1. **Gate 1 — Store Eligibility (Hard Pre-Condition):**
   - Only stores with `status == "verified"` can publish listings.
   - Any attempt by an unverified or suspended store to publish returns `403 Forbidden`.

2. **Gate 2 — Automated Pipeline Validation (Publish Trigger):**
   - When a verified merchant submits a complete listing:
     1. Required fields, condition grade, and pricing rules are validated.
     2. Photos are uploaded to Cloudflare R2; background processing validates format, bounds dimensions, strips metadata, and generates thumbnails.
     3. Once media processing signals completion and validation passes, the listing status transitions automatically to **`published`**.
     4. The listing immediately becomes discoverable in search and catalog endpoints.

3. **Founder Moderation Queue (`A-05` — Post-Publication Oversight):**
   - Rather than blocking every single phone listing on manual founder pre-approval, all published listings enter the Founder Moderation Queue.
   - Founders review live listings with 4 actions:
     - **Approve / Clear:** Confirms listing is compliant.
     - **Flag for Review:** Notifies merchant to amend incorrect data (e.g. wrong variant).
     - **Remove Listing:** Immediately revokes publication (`status: "removed"`); hides listing from search.
     - **Suspend Store:** Immediately suspends the merchant account and hides all associated inventory.

---

## 8. Ten-Field API Contract Standard

All 60 endpoints in the **API Contracts Catalog** (`F0CHJB5C939`) adhere to the agreed 10-field specification format:

1. **Endpoint & HTTP Method:** Explicit path (e.g., `POST /api/v1/listings`) and standard method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
2. **Input Parameters:** Query parameters, route path parameters, and header specifications.
3. **Request Body Schema:** JSON structure, types, field constraints, and required markers.
4. **Response Schema:** Envelope format `{"data": {...}}` with HTTP status code (`200 OK`, `201 Created`).
5. **Authentication Requirements:** Auth tier (`Public Guest`, `Merchant Session / Token`, `Founder Admin Session`).
6. **Authorization Scope:** Granular role check and tenant boundary (e.g., store owner matching authenticated actor; verified merchant only).
7. **Error Responses:** Standard JSON error envelope:
   ```json
   {
     "error": {
       "code": "STRING_CONSTANT",
       "message": "Human-readable bilingual error description",
       "details": []
     }
   }
   ```
   with explicit HTTP codes (`400`, `401`, `403`, `404`, `409`, `422`, `500`).
8. **Pagination & Filtering:** Offset/limit or cursor parameters, allowed sort keys, and default page sizes.
9. **Side Effects & Business-State Changes:** Database transactions, state machine transitions, audit log events, and background jobs.
10. **Acceptance Test Scenarios:** Explicit test assertions covering happy path, unauthorized attempt, invalid input, and idempotent retry.

---

## 9. First Approved-Store Vertical Slice

The foundational end-to-end integration slice verified in Step 1 and implemented in subsequent phases consists of:

```
[ Merchant Sign-up & Verification ]
      │ M-01 (Auth) ➔ M-02 (Store Profile) ➔ M-03 (Document Upload)
      ▼
[ Founder Verification Review ]
      │ A-02 (Verification Queue) ➔ A-03 (Evidence Detail) ➔ A-04 (Approve Store)
      ▼
[ Merchant Listing Creation ]
      │ M-06 (Select Model) ➔ M-07/M-08 (New/Used Phone Details & Photos) ➔ R2 Media Pipeline
      ▼
[ Automated Publication & Discovery ]
      │ Listing Published ➔ C-01 (Homepage) ➔ C-02 (Search/Filters) ➔ C-03 (Listing Detail)
      ▼
[ Customer Direct Contact ]
      │ C-03 WhatsApp Action ➔ Direct Merchant Chat with Pre-filled Phone Listing Context
```

---

## 10. Step 1 Sign-Off & Acceptance Record

| Requirement | Backend Founder (Rasheed) | Frontend Founder (Moataz) | Status |
| :--- | :--- | :--- | :--- |
| **Technology Stack Confirmation** | Approved (Django DRF / PG16 / R2 / Celery) | Approved (Flutter Customer / React Admin / RTL) | **Agreed** |
| **MVP vs Later Scope** | Approved (No in-app payments, no ads, guest-first) | Approved (Guest browsing without login) | **Agreed** |
| **Currency Invariant** | Approved (`SDG` Sudanese Pound) | Approved (`SDG` Sudanese Pound) | **Agreed** |
| **Pilot Region** | Approved (Port Sudan / Khartoum / Omdurman) | Approved (Port Sudan / Khartoum / Omdurman) | **Agreed** |
| **New vs Used Inventory Model** | Approved (Quantity SKU vs Single Unit Grade) | Approved (Form fields M-07 vs M-08) | **Agreed** |
| **Trust & Verification Policy** | Approved (Private R2, ID + Signboard/Register) | Approved (M-02, M-03, M-04 screens) | **Agreed** |
| **Publication Trigger** | Approved (Store Gate + Auto Media Validation) | Approved (Dashboard status M-13 & Admin A-05) | **Agreed** |
| **Ten-Field API Contract Standard** | Approved (10 canonical fields) | Approved (10 canonical fields) | **Agreed** |
| **First Vertical Slice** | Approved (Full slice agreed) | Approved (Full slice agreed) | **Agreed** |
| **Phase Gate 1 (`GATE-01`)** | **PASSED** | **PASSED** | **ACCEPTED** |

*Signed off on 2026-11-16 by Rasheed (@marco47t) and Moataz (@MoatazAbdElmutaal).*
