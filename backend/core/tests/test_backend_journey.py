"""Backend-only INT-03..06 journey through the real HTTP/service/image pipeline."""

import hashlib
import uuid
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .test_identity_stores import sent
from .test_verification_media import MemoryStorage, photo


@override_settings(
    OTP_DELIVERY_BACKEND="core.tests.test_identity_stores.deliver",
    MEDIA_STORAGE_BACKEND="core.tests.test_verification_media.MemoryStorage",
)
class BackendJourneyTests(TestCase):
    def test_signup_evidence_approval_media_search_contact_and_dashboard(self):
        from core.models import Brand, PhoneModel, Variant, MediaAsset
        from core.media.tasks import process_pending

        cache.clear()
        sent.clear()
        MemoryStorage.objects.clear()
        merchant = APIClient()
        register = merchant.post(
            "/api/v1/merchant/auth/register",
            {
                "name": "Nile owner",
                "phone": "+249912345678",
                "password": "Strong-Phone-Pass42",
            },
            format="json",
        )
        self.assertEqual(register.status_code, 201, register.content)
        self.assertEqual(
            merchant.post(
                "/api/v1/merchant/auth/verify", {"code": sent[-1][1]}, format="json"
            ).status_code,
            200,
        )
        profile = merchant.put(
            "/api/v1/stores/me/profile",
            {
                "name": "Nile Phones",
                "city": "khartoum",
                "address": "Market 1",
                "phone": "+249912345678",
                "whatsapp": "+249912345678",
            },
            format="json",
        )
        self.assertEqual(profile.status_code, 200, profile.content)

        def upload(path, kind):
            data = photo()
            response = merchant.post(
                path,
                {
                    "content_type": "image/jpeg",
                    "size": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "kind": kind,
                },
                format="json",
            )
            self.assertEqual(response.status_code, 201, response.content)
            asset = MediaAsset.objects.get(pk=response.data["data"]["id"])
            MemoryStorage.objects[asset.upload_key] = data
            self.assertEqual(
                merchant.post(f"/api/v1/media/uploads/{asset.pk}/complete").status_code,
                202,
            )
            return str(asset.pk)

        documents = [
            upload("/api/v1/stores/me/verification/documents", kind)
            for kind in ["id_front", "id_back", "signboard"]
        ]
        process_pending()
        application = merchant.post(
            "/api/v1/stores/me/verification/submit",
            {"documents": documents},
            format="json",
        )
        self.assertEqual(application.status_code, 201, application.content)
        founder = get_user_model().objects.create_superuser(
            "founder", "founder@example.com", "Strong-Pass42"
        )
        reviewer = APIClient()
        reviewer.force_authenticate(founder)
        self.assertEqual(
            reviewer.get("/api/v1/admin/verifications").data["data"][0]["id"],
            application.data["data"]["id"],
        )
        decision = reviewer.post(
            f"/api/v1/admin/verifications/{application.data['data']['id']}/decision",
            {"decision": "verified", "reason": "", "version": 1},
            format="json",
        )
        self.assertEqual(decision.status_code, 200, decision.content)
        brand = Brand.objects.create(name="Apple")
        model = PhoneModel.objects.create(brand=brand, name="iPhone 13")
        variant = Variant.objects.create(
            model=model, storage_gb=128, ram_gb=4, color="Black"
        )
        ids = []
        for condition in ["new", "used"]:
            media = [
                upload("/api/v1/media/uploads", kind)
                for kind in (
                    ["seal"] if condition == "new" else ["front", "back", "screen"]
                )
            ]
            body = {
                "variant_id": variant.pk,
                "condition": condition,
                "price": "500000.00",
                "quantity": 3 if condition == "new" else 1,
                "media": media,
            }
            if condition == "new":
                body.update(warranty_months=12, is_sealed=True)
            else:
                body.update(
                    grade="good",
                    battery_health=83,
                    defects="Minor scratches",
                    warranty_days=3,
                    has_original_box=False,
                )
            response = merchant.post(
                "/api/v1/stores/me/listings",
                body,
                format="json",
                HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
            )
            self.assertEqual(response.status_code, 201, response.content)
            self.assertEqual(response.data["data"]["status"], "processing")
            ids.append(response.data["data"]["id"])
        guest = APIClient()
        self.assertEqual(guest.get("/api/v1/listings").data["data"], [])
        process_pending()
        search = guest.get(
            "/api/v1/listings",
            {"q": "iPhone 13", "condition": "used", "city": "khartoum"},
        )
        self.assertEqual(search.data["meta"]["count"], 1)
        self.assertEqual(
            len(
                guest.get(f"/api/v1/product-variants/{variant.pk}/listings").data[
                    "data"
                ]
            ),
            2,
        )
        self.assertEqual(guest.get(f"/api/v1/listings/{ids[1]}").status_code, 200)
        self.assertEqual(
            guest.get(f"/api/v1/listings/{ids[1]}/contact-methods").status_code, 200
        )
        event = {"event_id": str(uuid.uuid4()), "method": "whatsapp"}
        for _ in range(2):
            self.assertEqual(
                guest.post(
                    f"/api/v1/listings/{ids[1]}/contact-events", event, format="json"
                ).status_code,
                200,
            )
        dashboard = merchant.get("/api/v1/stores/me/dashboard").data["data"]
        self.assertEqual(
            {
                k: dashboard[k]
                for k in ("active_listings", "out_of_stock", "views", "contact_leads")
            },
            {"active_listings": 2, "out_of_stock": 0, "views": 1, "contact_leads": 1},
        )
        self.assertEqual(len(dashboard["daily_views"]), 7)
        self.assertEqual(dashboard["daily_views"][-1]["count"], 1)
        events = reviewer.get("/api/v1/admin/audit-events").data["data"]
        self.assertTrue(
            any(event["action"] == "verification.decided" for event in events)
        )
