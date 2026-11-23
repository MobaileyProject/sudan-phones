"""Tests for frontend-aligned APIs: email/Google auth, PDF verification, 19 cities, ratings, reports, staff, re-verification."""

import hashlib
import uuid
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .factories import InventoryFixture
from .test_verification_media import MemoryStorage, photo

SAMPLE_PDF = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"


def fake_google_verifier(id_token):
    from core.common.domain import DomainError

    if id_token == "valid-new-user-token":
        return {
            "sub": "google-sub-1001",
            "email": "buyer@example.com",
            "name": "Ahmed Buyer",
        }
    if id_token == "valid-founder-email-token":
        return {
            "sub": "google-sub-9999",
            "email": "founder@example.com",
            "name": "Fake Founder",
        }
    raise DomainError("INVALID_GOOGLE_TOKEN", 401)


@override_settings(
    MEDIA_STORAGE_BACKEND="core.tests.test_verification_media.MemoryStorage",
    GOOGLE_TOKEN_VERIFIER="core.tests.test_frontend_alignment.fake_google_verifier",
)
class FrontendAlignmentTests(InventoryFixture, TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        super().setUp()
        self.guest = APIClient()

    def test_strict_sudan_phone_and_email_login(self):
        # Reject non-Sudan phone numbers strictly
        bad = self.guest.post(
            "/api/v1/auth/register",
            {
                "phone": "+201012345678",
                "password": "Strong-Password42",
                "name": "Outside Sudan",
            },
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        # Create a verified-email buyer and log in by email
        from core.models import Account

        user = get_user_model().objects.create_user(
            username="email-buyer",
            email="customer@example.com",
            password="Strong-Email-Pass42",
            first_name="Mona",
        )
        Account.objects.create(
            user=user,
            phone="+249911111111",
            phone_verified=True,
            email_verified=True,
        )
        resp = self.guest.post(
            "/api/v1/auth/login",
            {"email": "customer@example.com", "password": "Strong-Email-Pass42"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertTrue(resp.data["data"]["authenticated"])

        # Founder can also log in by email
        founder_client = APIClient()
        self.founder.email = "founder@example.com"
        self.founder.save(update_fields=["email"])
        f_resp = founder_client.post(
            "/api/v1/auth/login",
            {"email": "founder@example.com", "password": "Strong-Pass42"},
            format="json",
        )
        self.assertEqual(f_resp.status_code, 200, f_resp.content)
        self.assertEqual(f_resp.data["data"]["role"], "admin")

    def test_google_oauth_login_register_and_me_profile(self):
        from core.models import Account

        resp = self.guest.post(
            "/api/v1/auth/google",
            {"id_token": "valid-new-user-token"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertTrue(resp.data["data"]["authenticated"])
        self.assertEqual(resp.data["data"]["role"], "buyer")
        self.assertTrue(resp.data["data"]["email_verified"])
        user_id = resp.data["data"]["user_id"]
        self.assertTrue(Account.objects.filter(google_sub="google-sub-1001").exists())

        # GET and PATCH /api/v1/me
        me = self.guest.get("/api/v1/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["data"]["name"], "Ahmed Buyer")

        updated = self.guest.patch(
            "/api/v1/me",
            {"name": "Ahmed Osman", "preferred_city": "al_jazirah", "preferred_locale": "en"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.data["data"]["name"], "Ahmed Osman")
        self.assertEqual(updated.data["data"]["preferred_city"], "al_jazirah")

        # Returning Google user resolves to the same user
        again = APIClient().post(
            "/api/v1/auth/google",
            {"id_token": "valid-new-user-token"},
            format="json",
        )
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.data["data"]["user_id"], user_id)

        # Invalid token rejected
        self.assertEqual(
            APIClient()
            .post("/api/v1/auth/google", {"id_token": "bad-token-12345"}, format="json")
            .status_code,
            401,
        )

        # Superuser email cannot be hijacked via Google OAuth
        self.founder.email = "founder@example.com"
        self.founder.save(update_fields=["email"])
        self.assertEqual(
            APIClient()
            .post(
                "/api/v1/auth/google",
                {"id_token": "valid-founder-email-token"},
                format="json",
            )
            .status_code,
            401,
        )

    def test_pdf_verification_pipeline_and_distinct_store_contact_phone(self):
        from core.models import Account, Store, Membership, MediaAsset
        from core.media.services import process_asset

        owner = get_user_model().objects.create_user("pdf-owner", password="Strong-Pass42")
        Account.objects.create(
            user=owner, phone="+249912340001", phone_verified=True, is_merchant=True
        )
        store = Store.objects.create(owner=owner)
        Membership.objects.create(store=store, user=owner, role="owner")
        mc = APIClient()
        mc.force_authenticate(owner)

        # Store phone and whatsapp can differ from owner login phone (+249912340001)
        prof = mc.put(
            "/api/v1/stores/me/profile",
            {
                "name": "Wad Madani Mobiles",
                "city": "al_jazirah",
                "address": "Central Market",
                "phone": "+249912349999",
                "whatsapp": "+249912348888",
                "description": "Trusted phones in Al Jazirah",
            },
            format="json",
        )
        self.assertEqual(prof.status_code, 200, prof.content)
        self.assertEqual(prof.data["data"]["city"], "al_jazirah")
        self.assertEqual(prof.data["data"]["whatsapp"], "+249912348888")

        # Upload PDF commercial registration + image owner ID
        pdf_init = mc.post(
            "/api/v1/stores/me/verification/documents",
            {
                "kind": "commercial",
                "content_type": "application/pdf",
                "size": len(SAMPLE_PDF),
                "sha256": hashlib.sha256(SAMPLE_PDF).hexdigest(),
            },
            format="json",
        )
        self.assertEqual(pdf_init.status_code, 201, pdf_init.content)
        pdf_asset = MediaAsset.objects.get(pk=pdf_init.data["data"]["id"])
        MemoryStorage.objects[pdf_asset.upload_key] = SAMPLE_PDF
        self.assertEqual(
            mc.post(f"/api/v1/media/uploads/{pdf_asset.pk}/complete").status_code, 202
        )
        process_asset(str(pdf_asset.pk))
        pdf_asset.refresh_from_db()
        self.assertEqual(pdf_asset.status, "ready")
        self.assertTrue(pdf_asset.processed_key.startswith("evidence/"))
        self.assertTrue(pdf_asset.processed_key.endswith(".pdf"))

        # Corrupt PDF fails validation
        bad_pdf = b"not-a-pdf-at-all-12345"
        bad_init = mc.post(
            "/api/v1/stores/me/verification/documents",
            {
                "kind": "signboard",
                "content_type": "application/pdf",
                "size": len(bad_pdf),
                "sha256": hashlib.sha256(bad_pdf).hexdigest(),
            },
            format="json",
        )
        self.assertEqual(bad_init.status_code, 201)
        bad_asset = MediaAsset.objects.get(pk=bad_init.data["data"]["id"])
        MemoryStorage.objects[bad_asset.upload_key] = bad_pdf
        mc.post(f"/api/v1/media/uploads/{bad_asset.pk}/complete")
        process_asset(str(bad_asset.pk))
        bad_asset.refresh_from_db()
        self.assertEqual(bad_asset.status, "failed")

        # Listing uploads still reject PDF
        self.assertEqual(
            self.client.post(
                "/api/v1/media/uploads",
                {
                    "kind": "front",
                    "content_type": "application/pdf",
                    "size": len(SAMPLE_PDF),
                    "sha256": hashlib.sha256(SAMPLE_PDF).hexdigest(),
                },
                format="json",
            ).status_code,
            400,
        )

        # Upload ID image and submit verification with 2 docs (id_front + PDF commercial)
        img = photo()
        id_init = mc.post(
            "/api/v1/stores/me/verification/documents",
            {
                "kind": "id_front",
                "content_type": "image/jpeg",
                "size": len(img),
                "sha256": hashlib.sha256(img).hexdigest(),
            },
            format="json",
        )
        id_asset = MediaAsset.objects.get(pk=id_init.data["data"]["id"])
        MemoryStorage.objects[id_asset.upload_key] = img
        mc.post(f"/api/v1/media/uploads/{id_asset.pk}/complete")
        process_asset(str(id_asset.pk))

        sub = mc.post(
            "/api/v1/stores/me/verification/submit",
            {"documents": [str(id_asset.pk), str(pdf_asset.pk)]},
            format="json",
        )
        self.assertEqual(sub.status_code, 201, sub.content)

    def test_ratings_require_account_and_persist_in_database(self):
        from core.models import Rating

        # Guest cannot submit ratings
        self.assertIn(
            self.guest.post(
                f"/api/v1/stores/{self.store.pk}/ratings",
                {"stars": 5, "comment": "Great"},
                format="json",
            ).status_code,
            [401, 403],
        )
        self.assertIn(
            self.guest.post(
                f"/api/v1/models/{self.model.pk}/ratings",
                {"stars": 4, "comment": "Good phone"},
                format="json",
            ).status_code,
            [401, 403],
        )

        # Store owner cannot rate own store
        self.assertEqual(
            self.client.post(
                f"/api/v1/stores/{self.store.pk}/ratings",
                {"stars": 5, "comment": "My own shop"},
                format="json",
            ).status_code,
            403,
        )

        # Authenticated buyer can submit and update store & phone model ratings
        buyer = get_user_model().objects.create_user("rater", first_name="Sami")
        bc = APIClient()
        bc.force_authenticate(buyer)
        r1 = bc.post(
            f"/api/v1/stores/{self.store.pk}/ratings",
            {"stars": 5, "comment": "Honest merchant"},
            format="json",
        )
        self.assertEqual(r1.status_code, 201, r1.content)
        r2 = bc.post(
            f"/api/v1/models/{self.model.pk}/ratings",
            {"stars": 4, "comment": "Solid battery"},
            format="json",
        )
        self.assertEqual(r2.status_code, 201, r2.content)
        self.assertEqual(Rating.objects.count(), 2)

        # Re-submitting updates existing rating instead of duplicating
        r1_upd = bc.post(
            f"/api/v1/stores/{self.store.pk}/ratings",
            {"stars": 4, "comment": "Updated review"},
            format="json",
        )
        self.assertEqual(r1_upd.status_code, 201)
        self.assertEqual(Rating.objects.filter(target_type="store").count(), 1)

        # Public GET returns ratings + summary
        pub_store = self.guest.get(f"/api/v1/stores/{self.store.pk}/ratings")
        self.assertEqual(pub_store.status_code, 200)
        self.assertEqual(pub_store.data["summary"]["count"], 1)
        self.assertEqual(pub_store.data["summary"]["average"], 4.0)
        self.assertEqual(pub_store.data["summary"]["distribution"]["4"], 1)

        pub_model = self.guest.get(f"/api/v1/models/{self.model.pk}/ratings")
        self.assertEqual(pub_model.status_code, 200)
        self.assertEqual(pub_model.data["summary"]["count"], 1)

    def test_reports_reverification_staff_public_models_and_admin_users(self):
        from core.models import Account, CustomerReport

        listing = self.create_listing(self.payload("used"))

        # Public models endpoint returns listing_count, min_price, and rating stats
        models_resp = self.guest.get("/api/v1/models", {"brand": "apple", "city": "khartoum"})
        self.assertEqual(models_resp.status_code, 200, models_resp.content)
        self.assertEqual(len(models_resp.data["data"]), 1)
        self.assertEqual(models_resp.data["data"][0]["listing_count"], 1)

        # Home supports ?city= filter and search supports sort=newest & brand slug
        self.assertEqual(self.guest.get("/api/v1/home", {"city": "khartoum"}).status_code, 200)
        self.assertEqual(
            len(
                self.guest.get(
                    "/api/v1/listings", {"brand": "apple", "sort": "newest"}
                ).data["data"]
            ),
            1,
        )

        # Merchant listings include enriched metadata & price_history
        inv = self.client.get("/api/v1/stores/me/listings").data["data"]
        self.assertEqual(inv[0]["brand"], "Apple")
        self.assertEqual(inv[0]["model"], "iPhone 13")
        self.assertEqual(len(inv[0]["price_history"]), 1)

        # Merchant can mark used listing as reserved (hides from public)
        res = self.client.patch(
            f"/api/v1/stores/me/listings/{listing['id']}/stock",
            {"version": 1, "quantity": 0, "used_availability": "reserved"},
            format="json",
            HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.data["data"]["used_availability"], "reserved")
        self.assertEqual(
            self.guest.get(f"/api/v1/listings/{listing['id']}").status_code, 404
        )
        # Restore to available so we can report it
        self.client.patch(
            f"/api/v1/stores/me/listings/{listing['id']}/stock",
            {"version": 2, "quantity": 1, "used_availability": "available"},
            format="json",
            HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
        )

        # Guest submits customer report -> Admin lists & resolves with flag_listing=True
        rep = self.guest.post(
            "/api/v1/reports",
            {
                "target_type": "listing",
                "target_id": listing["id"],
                "reason": "misleading_price",
                "details": "Price on call was higher",
            },
            format="json",
        )
        self.assertEqual(rep.status_code, 201, rep.content)
        report_id = rep.data["data"]["id"]

        fc = APIClient()
        fc.force_authenticate(self.founder)
        rep_list = fc.get("/api/v1/admin/reports")
        self.assertEqual(rep_list.status_code, 200)
        self.assertEqual(len(rep_list.data["data"]), 1)

        resolved = fc.post(
            f"/api/v1/admin/reports/{report_id}/resolve",
            {"status": "reviewed", "resolution_note": "Flagged for price check", "flag_listing": True},
            format="json",
        )
        self.assertEqual(resolved.status_code, 200, resolved.content)
        self.assertEqual(CustomerReport.objects.get(pk=report_id).status, "reviewed")

        # Merchant staff: add by phone + role, then GET list
        clerk = get_user_model().objects.create_user("clerk-user", first_name="Hassan")
        Account.objects.create(user=clerk, phone="+249915555555", phone_verified=True)
        added = self.client.post(
            "/api/v1/stores/me/staff",
            {"phone": "+249915555555", "role": "manager"},
            format="json",
        )
        self.assertEqual(added.status_code, 201, added.content)
        staff_list = self.client.get("/api/v1/stores/me/staff")
        self.assertEqual(staff_list.status_code, 200)
        self.assertEqual(len(staff_list.data["data"]), 2)

        # Post-approval re-verification keeps store verified while pending, updates name on approval
        reverify = self.client.post(
            "/api/v1/stores/me/reverification",
            {"note": "Updated trade name", "name": "Nile Flagship", "city": "port_sudan"},
            format="json",
        )
        self.assertEqual(reverify.status_code, 201, reverify.content)
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, "verified")
        dec = fc.post(
            f"/api/v1/admin/verifications/{reverify.data['data']['id']}/decision",
            {"decision": "approved", "version": 1, "reason": "Verified new license"},
            format="json",
        )
        self.assertEqual(dec.status_code, 200, dec.content)
        self.store.refresh_from_db()
        self.assertEqual(self.store.name, "Nile Flagship")
        self.assertEqual(self.store.city, "port_sudan")

        # Direct store suspension request & admin users list
        susp = fc.post(
            f"/api/v1/admin/stores/{self.store.pk}/suspend",
            {"reason": "Repeated fraud reports"},
            format="json",
        )
        self.assertEqual(susp.status_code, 202, susp.content)
        admin_users = fc.get("/api/v1/admin/users")
        self.assertEqual(admin_users.status_code, 200)
        self.assertTrue(any(u["is_superuser"] for u in admin_users.data["data"]))
