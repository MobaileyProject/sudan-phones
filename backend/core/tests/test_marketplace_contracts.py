"""Contracts for API-087..API-114 and full frontend-backend parity flows."""

import uuid
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .factories import InventoryFixture


@override_settings(
    MEDIA_STORAGE_BACKEND="core.tests.test_verification_media.MemoryStorage"
)
class MarketplaceContractTests(InventoryFixture, TestCase):
    def setUp(self):
        super().setUp()
        self.buyer = get_user_model().objects.create_user("buyer", "buyer@example.com", "Strong-Pass42")
        from core.models import Account

        Account.objects.create(
            user=self.buyer,
            phone="+249911112222",
            phone_verified=True,
            is_merchant=False,
        )
        self.buyer_client = APIClient()
        self.buyer_client.force_authenticate(self.buyer)
        self.guest = APIClient()

    def test_duplicate_full_edit_checklist_and_bulk_price_condition(self):
        payload = self.payload("used")
        payload["used_checklist"] = {
            "biometricsWorking": True,
            "originalScreen": True,
            "networkUnlocked": True,
            "cleanImei": True,
            "accessoriesIncluded": False,
        }
        listing = self.create_listing(payload)
        self.assertEqual(listing["used_checklist"]["cleanImei"], True)
        self.assertEqual(listing["used_checklist"]["accessoriesIncluded"], False)

        dup = self.client.post(f"/api/v1/stores/me/listings/{listing['id']}/duplicate")
        self.assertEqual(dup.status_code, 201, dup.content)
        self.assertNotEqual(dup.data["data"]["id"], listing["id"])
        self.assertEqual(dup.data["data"]["condition"], "used")

        # Full PATCH edit (price drop + storage + checklist)
        edit_res = self.client.patch(
            f"/api/v1/stores/me/listings/{listing['id']}",
            {
                "version": listing["version"],
                "price": "450000.00",
                "defects": "Light frame mark",
                "used_checklist": {**payload["used_checklist"], "accessoriesIncluded": True},
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
        )
        self.assertEqual(edit_res.status_code, 200, edit_res.content)
        self.assertEqual(Decimal(edit_res.data["data"]["price"]), Decimal("450000.00"))
        self.assertTrue(edit_res.data["data"]["price_dropped"])
        self.assertTrue(edit_res.data["data"]["used_checklist"]["accessoriesIncluded"])

        # Bulk price update with condition="used"
        bulk_res = self.client.post(
            "/api/v1/stores/me/listings/bulk-price",
            {"mode": "percent", "percent": -10, "round_to": 1000, "condition": "used"},
            format="json",
        )
        self.assertEqual(bulk_res.status_code, 200, bulk_res.content)
        self.assertGreaterEqual(bulk_res.data["data"]["updated_count"], 2)

    def test_price_alerts_notifications_and_price_drop_trigger(self):
        listing = self.create_listing()
        lid = listing["id"]
        # Visitor (guest) price alert & notification flow
        alert_res = self.guest.post(
            "/api/v1/me/alerts",
            {"listing_id": lid, "target_price_sdg": 450000},
            format="json",
            HTTP_X_CHAT_VISITOR_ID="visitor-abc-123",
        )
        self.assertEqual(alert_res.status_code, 201, alert_res.content)
        alert_id = alert_res.data["data"]["id"]

        list_alerts = self.guest.get(
            "/api/v1/me/alerts", HTTP_X_CHAT_VISITOR_ID="visitor-abc-123"
        )
        self.assertEqual(len(list_alerts.data["data"]), 1)

        # Authenticated buyer also sets alert
        b_alert = self.buyer_client.post(
            "/api/v1/me/alerts", {"listing_id": lid}, format="json"
        )
        self.assertEqual(b_alert.status_code, 201, b_alert.content)

        # Merchant drops price -> creates price_drop notifications for both subscribers
        drop = self.patch(listing, "/price", {"version": listing["version"], "price": "400000.00"})
        self.assertEqual(drop.status_code, 200, drop.content)

        v_notifs = self.guest.get(
            "/api/v1/me/notifications", HTTP_X_CHAT_VISITOR_ID="visitor-abc-123"
        )
        self.assertEqual(v_notifs.status_code, 200)
        self.assertEqual(len(v_notifs.data["data"]), 1)
        self.assertEqual(v_notifs.data["data"][0]["type"], "price_drop")
        self.assertFalse(v_notifs.data["data"][0]["read"])

        b_notifs = self.buyer_client.get("/api/v1/me/notifications")
        self.assertTrue(any(n["type"] == "price_drop" for n in b_notifs.data["data"]))

        mark_read = self.buyer_client.post("/api/v1/me/notifications/read")
        self.assertEqual(mark_read.status_code, 200)
        b_notifs_after = self.buyer_client.get("/api/v1/me/notifications")
        self.assertTrue(all(n["read"] for n in b_notifs_after.data["data"]))

        del_alert = self.guest.delete(
            f"/api/v1/me/alerts/{alert_id}",
            HTTP_X_CHAT_VISITOR_ID="visitor-abc-123",
        )
        self.assertEqual(del_alert.status_code, 200)
        self.assertEqual(
            len(
                self.guest.get(
                    "/api/v1/me/alerts", HTTP_X_CHAT_VISITOR_ID="visitor-abc-123"
                ).data["data"]
            ),
            0,
        )

    def test_two_way_chat_store_notifications_and_read_receipts(self):
        listing = self.create_listing()
        send_res = self.buyer_client.post(
            f"/api/v1/stores/{self.store.pk}/messages",
            {
                "text": "Is the iPhone 13 still in stock?",
                "sender_name": "Ahmed Buyer",
                "sender_phone": "+249911112222",
                "listing_id": listing["id"],
                "listing_title": "Apple iPhone 13",
                "listing_price_sdg": 500000,
            },
            format="json",
        )
        self.assertEqual(send_res.status_code, 201, send_res.content)
        self.assertIsNotNone(send_res.data["data"]["reply"])  # First-message bilingual auto-reply

        # Buyer sees thread in /api/v1/me/chats
        buyer_chats = self.buyer_client.get("/api/v1/me/chats")
        self.assertEqual(buyer_chats.status_code, 200)
        self.assertEqual(len(buyer_chats.data["data"]), 1)

        # Store receives notification of type new_message
        owner_notifs = self.client.get("/api/v1/me/notifications")
        self.assertTrue(any(n["type"] == "new_message" and not n["read"] for n in owner_notifs.data["data"]))

        # Merchant sees unread thread
        m_chats = self.client.get("/api/v1/stores/me/chats")
        self.assertEqual(m_chats.status_code, 200)
        self.assertEqual(len(m_chats.data["data"]), 1)
        tkey = m_chats.data["data"][0]["thread_key"]
        self.assertEqual(m_chats.data["data"][0]["unread_count"], 1)

        # Merchant marks read -> unread_count becomes 0 and store new_message notif marked read
        read_res = self.client.post(f"/api/v1/stores/me/chats/{tkey}/read")
        self.assertEqual(read_res.status_code, 200)
        m_chats_after = self.client.get("/api/v1/stores/me/chats")
        self.assertEqual(m_chats_after.data["data"][0]["unread_count"], 0)
        owner_notifs_after = self.client.get("/api/v1/me/notifications")
        self.assertTrue(
            all(n["read"] for n in owner_notifs_after.data["data"] if n["type"] == "new_message")
        )

        # Merchant replies -> buyer receives chat_reply notification
        reply_res = self.client.post(
            f"/api/v1/stores/me/chats/{tkey}/reply",
            {"text": "Yes, available in our Khartoum showroom today!"},
            format="json",
        )
        self.assertEqual(reply_res.status_code, 201, reply_res.content)
        buyer_notifs = self.buyer_client.get("/api/v1/me/notifications")
        self.assertTrue(any(n["type"] == "chat_reply" for n in buyer_notifs.data["data"]))

    def test_product_ratings_aggregation_and_staff_invite(self):
        listing = self.create_listing()
        rate_res = self.buyer_client.post(
            f"/api/v1/listings/{listing['id']}/ratings",
            {"stars": 5, "comment": "Original sealed unit!", "author_name": "Ahmed"},
            format="json",
        )
        self.assertEqual(rate_res.status_code, 201, rate_res.content)

        all_pr = self.guest.get("/api/v1/ratings/products")
        self.assertEqual(all_pr.status_code, 200)
        self.assertEqual(len(all_pr.data["data"]), 1)
        self.assertEqual(all_pr.data["data"][0]["model_id"], self.model.pk)

        # Parent phone model ratings aggregate listing product ratings
        model_ratings = self.guest.get(f"/api/v1/models/{self.model.pk}/ratings")
        self.assertEqual(model_ratings.status_code, 200)
        self.assertEqual(model_ratings.data["summary"]["count"], 1)
        self.assertEqual(model_ratings.data["summary"]["average"], 5.0)

        # Invite staff by phone & display name without requiring prior registration
        staff_res = self.client.post(
            "/api/v1/stores/me/staff",
            {"name": "Osman Sales", "phone": "+249922223333", "role": "clerk"},
            format="json",
        )
        self.assertEqual(staff_res.status_code, 201, staff_res.content)
        self.assertEqual(staff_res.data["data"]["name"], "Osman Sales")

    def test_sponsored_ads_and_admin_catalog_crud(self):
        listing = self.create_listing()
        # Merchant requests ad
        m_req = self.client.post(
            "/api/v1/stores/me/ads/request",
            {
                "listing_id": listing["id"],
                "title_ar": "عرض خاص",
                "title_en": "Special Deal",
                "target_city": "khartoum",
                "duration_days": 7,
                "paid_amount_sdg": "50000.00",
                "payment_ref": "BK-1234",
            },
            format="json",
        )
        self.assertEqual(m_req.status_code, 201, m_req.content)

        # Admin creates active ad, guest logs impression & click
        self.client.force_authenticate(self.founder)
        ad_res = self.client.post(
            "/api/v1/admin/ads",
            {
                "store_id": self.store.pk,
                "listing_id": listing["id"],
                "title_ar": "آيفون 13",
                "title_en": "iPhone 13 Promo",
                "target_city": "khartoum",
                "status": "active",
                "priority": 90,
                "skip_delay_sec": 3,
                "paid_amount_sdg": "75000.00",
            },
            format="json",
        )
        self.assertEqual(ad_res.status_code, 201, ad_res.content)
        ad_id = ad_res.data["data"]["id"]

        active = self.guest.get("/api/v1/ads/active", {"city": "khartoum"})
        self.assertEqual(len(active.data["data"]), 1)
        imp = self.guest.post(f"/api/v1/ads/{ad_id}/impression", {"city": "khartoum"}, format="json")
        self.assertEqual(imp.data["data"]["impressions"], 1)
        clk = self.guest.post(
            f"/api/v1/ads/{ad_id}/click", {"time_to_click_ms": 1400}, format="json"
        )
        self.assertEqual(clk.data["data"]["clicks"], 1)

        # Admin updates & deletes ad
        upd_ad = self.client.patch(
            f"/api/v1/admin/ads/{ad_id}", {"status": "paused"}, format="json"
        )
        self.assertEqual(upd_ad.data["data"]["status"], "paused")
        del_ad = self.client.delete(f"/api/v1/admin/ads/{ad_id}")
        self.assertEqual(del_ad.status_code, 200)

        # Admin Catalog CRUD: brand -> model -> patch -> delete
        b_res = self.client.post(
            "/api/v1/admin/catalog/brands",
            {"name": "Nothing", "name_ar": "ناثينج"},
            format="json",
        )
        self.assertEqual(b_res.status_code, 201, b_res.content)
        bid = b_res.data["data"]["id"]

        m_res = self.client.post(
            "/api/v1/admin/catalog/models",
            {
                "brand_id": bid,
                "name": "Phone (2a)",
                "release_year": 2024,
                "display_size": 6.7,
                "display_type": "AMOLED",
                "chipset": "Dimensity 7200 Pro",
                "camera_mp": 50,
                "battery_mah": 5000,
                "variants": [{"storage_gb": 256, "ram_gb": 12, "color": "Black"}],
            },
            format="json",
        )
        self.assertEqual(m_res.status_code, 201, m_res.content)
        mid = m_res.data["data"]["id"]

        patch_m = self.client.patch(
            f"/api/v1/admin/catalog/models/{mid}", {"battery_mah": 5100}, format="json"
        )
        self.assertEqual(patch_m.status_code, 200, patch_m.content)

        # In-use model cannot be deleted (409); unused model deletes cleanly (200)
        in_use_del = self.client.delete(f"/api/v1/admin/catalog/models/{self.model.pk}")
        self.assertEqual(in_use_del.status_code, 409)
        ok_del = self.client.delete(f"/api/v1/admin/catalog/models/{mid}")
        self.assertEqual(ok_del.status_code, 200)

    def test_bulk_import_by_listing_id_and_flagged_moderation_queue_priority(self):
        # Verify listing_id-based CSV bulk import updates price/quantity & returns *_count fields
        created = self.create_listing(self.payload("new"))
        lid = created["id"]
        imp = self.client.post(
            "/api/v1/stores/me/listings/import",
            {"rows": [{"listing_id": lid, "price": 775000, "quantity": 6}]},
            format="json",
        )
        self.assertEqual(imp.status_code, 200, imp.content)
        self.assertEqual(imp.data["data"]["updated_count"], 1)
        self.assertEqual(imp.data["data"]["skipped_count"], 0)
        from core.models import Listing

        obj = Listing.objects.get(pk=lid)
        self.assertEqual(int(obj.price), 775000)

        # Verify moderation_queue prioritizes flagged listings ahead of pending items
        founder = get_user_model().objects.create_superuser(
            "mod_founder", "modfounder@example.com", "Strong-Pass42"
        )
        admin_client = APIClient()
        admin_client.force_authenticate(founder)
        flag = admin_client.post(
            f"/api/v1/admin/listings/{lid}/moderate",
            {"action": "flag", "version": obj.version, "reason": "QA flag check"},
            format="json",
        )
        self.assertEqual(flag.status_code, 200, flag.content)
        q_res = admin_client.get("/api/v1/admin/moderation/queue", {"limit": 1})
        self.assertEqual(q_res.status_code, 200, q_res.content)
        self.assertEqual(q_res.data["data"][0]["id"], lid)

    def test_merchant_pause_and_repost_listing_status(self):
        created = self.create_listing(self.payload("new"))
        lid = created["id"]
        ver = created["version"]

        # Initially published and visible publicly
        pub1 = self.client.get("/api/v1/listings", {"limit": 50})
        self.assertEqual(pub1.status_code, 200)
        self.assertIn(lid, [item["id"] for item in pub1.data["data"]])

        # Stale version fails with 409
        stale = self.client.patch(
            f"/api/v1/stores/me/listings/{lid}/status",
            {"status": "paused", "version": ver + 99},
            format="json",
        )
        self.assertEqual(stale.status_code, 409)

        # Pause hides listing from public search while keeping it in merchant inventory
        pause_res = self.client.patch(
            f"/api/v1/stores/me/listings/{lid}/status",
            {"status": "paused", "version": ver},
            format="json",
        )
        self.assertEqual(pause_res.status_code, 200, pause_res.content)
        self.assertEqual(pause_res.data["data"]["status"], "paused")
        self.assertEqual(pause_res.data["data"]["version"], ver + 1)

        pub2 = self.client.get("/api/v1/listings", {"limit": 50})
        self.assertEqual(pub2.status_code, 200)
        self.assertNotIn(lid, [item["id"] for item in pub2.data["data"]])

        mine = self.client.get("/api/v1/stores/me/listings", {"limit": 50})
        self.assertEqual(mine.status_code, 200)
        mine_row = next(item for item in mine.data["data"] if item["id"] == lid)
        self.assertEqual(mine_row["status"], "paused")

        # Repost restores public visibility
        repost_res = self.client.patch(
            f"/api/v1/stores/me/listings/{lid}/status",
            {"status": "published", "version": ver + 1},
            format="json",
        )
        self.assertEqual(repost_res.status_code, 200, repost_res.content)
        self.assertEqual(repost_res.data["data"]["status"], "published")
        pub3 = self.client.get("/api/v1/listings", {"limit": 50})
        self.assertIn(lid, [item["id"] for item in pub3.data["data"]])

        # Flagged listing cannot be toggled by merchant status endpoint
        founder = get_user_model().objects.create_superuser(
            "pause_flag_founder", "pauseflag@example.com", "Strong-Pass42"
        )
        admin_client = APIClient()
        admin_client.force_authenticate(founder)
        flag = admin_client.post(
            f"/api/v1/admin/listings/{lid}/moderate",
            {"action": "flag", "version": repost_res.data["data"]["version"], "reason": "Flagged check"},
            format="json",
        )
        self.assertEqual(flag.status_code, 200)
        blocked = self.client.patch(
            f"/api/v1/stores/me/listings/{lid}/status",
            {"status": "paused"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 409)
        clear = admin_client.post(
            f"/api/v1/admin/listings/{lid}/moderate",
            {"action": "approve", "version": flag.data["data"]["listing"]["version"], "reason": "Cleared"},
            format="json",
        )
        self.assertEqual(clear.status_code, 200, clear.content)
