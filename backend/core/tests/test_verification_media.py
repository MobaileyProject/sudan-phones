"""BE-05/08: private evidence snapshots and untrusted upload processing."""

from io import BytesIO
import hashlib
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from PIL import Image


class MemoryStorage:
    objects = {}

    def upload_url(self, key, content_type, size):
        return {
            "url": "https://private.invalid/" + key,
            "headers": {"Content-Type": content_type, "Content-Length": str(size)},
        }

    def read(self, key, limit):
        return self.objects[key][: limit + 1]

    def write(self, key, data, content_type):
        self.objects[key] = data

    def private_url(self, key, seconds):
        return "https://private.invalid/read/" + key + "?ttl=" + str(seconds)

    def public_url(self, key):
        return "https://cdn.invalid/" + key

    def delete(self, key):
        self.objects.pop(key, None)


def photo():
    output = BytesIO()
    Image.new("RGB", (40, 40), "blue").save(output, "JPEG")
    return output.getvalue()


@override_settings(
    MEDIA_STORAGE_BACKEND="core.tests.test_verification_media.MemoryStorage"
)
class VerificationMediaTests(TestCase):
    def setUp(self):
        from core.models import Account, Store, Membership

        MemoryStorage.objects.clear()
        self.owner = get_user_model().objects.create_user("owner")
        Account.objects.create(
            user=self.owner,
            phone="+249912345678",
            phone_verified=True,
            is_merchant=True,
        )
        self.store = Store.objects.create(
            owner=self.owner,
            name="Nile",
            city="khartoum",
            address="Market",
            phone="+249912345678",
            whatsapp="+249912345678",
        )
        Membership.objects.create(store=self.store, user=self.owner, role="owner")
        self.founder = get_user_model().objects.create_superuser(
            "founder", "a@example.com", "Strong-Pass42"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def upload(self, kind, content=None):
        from core.models import MediaAsset
        from core.media.services import process_asset

        content = photo() if content is None else content
        response = self.client.post(
            "/api/v1/stores/me/verification/documents",
            {
                "kind": kind,
                "content_type": "image/jpeg",
                "size": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        asset = MediaAsset.objects.get(pk=response.data["data"]["id"])
        MemoryStorage.objects[asset.upload_key] = content
        self.assertEqual(
            self.client.post(f"/api/v1/media/uploads/{asset.pk}/complete").status_code,
            202,
        )
        process_asset(str(asset.pk))
        asset.refresh_from_db()
        return asset

    def test_evidence_review_approval_and_audit_are_atomic(self):
        assets = [self.upload(kind) for kind in ["id_front", "id_back", "signboard"]]
        response = self.client.post(
            "/api/v1/stores/me/verification/submit",
            {"documents": [str(a.pk) for a in assets]},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        verification_id = response.data["data"]["id"]
        self.assertEqual(
            self.client.get("/api/v1/admin/verifications").status_code, 403
        )
        self.client.force_authenticate(self.founder)
        detail = self.client.get(f"/api/v1/admin/verifications/{verification_id}")
        self.assertEqual(detail.status_code, 200, detail.content)
        self.assertEqual(detail.data["data"]["profile"]["name"], "Nile")
        self.assertEqual(detail.data["data"]["profile"]["address"], "Market")
        docs = self.client.get(
            f"/api/v1/admin/verifications/{verification_id}/documents"
        )
        self.assertEqual(len(docs.data["data"]), 3)
        self.assertIn("ttl=900", docs.data["data"][0]["url"])
        response = self.client.post(
            f"/api/v1/admin/verifications/{verification_id}/decision",
            {"decision": "verified", "version": 1, "reason": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, "verified")
        from core.models import AuditEvent

        self.assertTrue(
            AuditEvent.objects.filter(
                action="verification.decided", actor=self.founder
            ).exists()
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/admin/verifications/{verification_id}/decision",
                {"decision": "rejected", "version": 1, "reason": "No"},
                format="json",
            ).status_code,
            409,
        )

    def test_corrupt_content_never_becomes_ready(self):
        asset = self.upload("id_front", b"not-a-photo")
        self.assertEqual(asset.status, "failed")
        response = self.client.post(
            "/api/v1/stores/me/verification/submit",
            {"documents": [str(asset.pk)]},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_cross_store_complete_is_hidden_and_no_keys_leak(self):
        asset = self.upload("id_front")
        other = get_user_model().objects.create_user("other")
        self.client.force_authenticate(other)
        self.assertIn(
            self.client.post(f"/api/v1/media/uploads/{asset.pk}/complete").status_code,
            [403, 404],
        )
        self.client.force_authenticate(self.owner)
        response = self.client.get("/api/v1/stores/me/verification")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(asset.upload_key, str(response.data))
        self.assertNotIn("private.invalid", str(response.data))

    def test_replay_cannot_replace_validated_private_evidence(self):
        from core.media.services import process_asset

        asset = self.upload("id_front")
        original = MemoryStorage.objects[asset.processed_key]
        MemoryStorage.objects[asset.upload_key] = b"changed after validation"
        process_asset(str(asset.pk))
        self.assertEqual(MemoryStorage.objects[asset.processed_key], original)

    def test_durable_worker_processes_media_and_strips_metadata(self):
        from core.media.tasks import process_pending
        from core.models import MediaAsset

        self.store.status = "verified"
        self.store.save()
        content = photo()
        response = self.client.post(
            "/api/v1/media/uploads",
            {
                "kind": "seal",
                "content_type": "image/jpeg",
                "size": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        asset = MediaAsset.objects.get(pk=response.data["data"]["id"])
        MemoryStorage.objects[asset.upload_key] = content
        self.client.post(f"/api/v1/media/uploads/{asset.pk}/complete")
        process_pending()
        asset.refresh_from_db()
        self.assertEqual(asset.status, "ready")
        image = Image.open(BytesIO(MemoryStorage.objects[asset.processed_key]))
        self.assertEqual(image.getexif(), {})
        self.assertIn("-thumb.jpg", asset.thumbnail_key)

    def test_admin_audit_records_request_ip_without_adding_guest_tracking(self):
        from core.models import AuditEvent

        assets = [self.upload(kind) for kind in ["id_front", "id_back", "commercial"]]
        response = self.client.post(
            "/api/v1/stores/me/verification/submit",
            {"documents": [str(a.pk) for a in assets]},
            format="json",
        )
        self.client.force_authenticate(self.founder)
        self.client.post(
            f"/api/v1/admin/verifications/{response.data['data']['id']}/decision",
            {"decision": "verified", "version": 1, "reason": ""},
            format="json",
            REMOTE_ADDR="192.0.2.10",
        )
        event = AuditEvent.objects.get(action="verification.decided")
        self.assertEqual(getattr(event, "actor_ip", None), "192.0.2.10")
