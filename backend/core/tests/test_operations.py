"""BE-10: scoped admin authority, immutable audit and distinct-founder decisions."""

import uuid
from django.contrib.auth import get_user_model
from django.db import transaction, DatabaseError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .factories import InventoryFixture


@override_settings(
    MEDIA_STORAGE_BACKEND="core.tests.test_verification_media.MemoryStorage"
)
class OperationsTests(InventoryFixture, TestCase):
    def setUp(self):
        super().setUp()
        self.listing = self.create_listing()
        self.guest = APIClient()

    def test_contact_links_and_retry_safe_lead_counters(self):
        listing_id = self.listing["id"]
        response = self.guest.get(f"/api/v1/listings/{listing_id}/contact-methods")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn(
            "https://wa.me/249912345678?text=", response.data["data"]["whatsapp_url"]
        )
        self.assertIn("iPhone%2013", response.data["data"]["whatsapp_url"])
        self.assertEqual(response.data["data"]["phone_url"], "tel:+249912345678")
        event = {"event_id": str(uuid.uuid4()), "method": "whatsapp"}
        for _ in range(2):
            response = self.guest.post(
                f"/api/v1/listings/{listing_id}/contact-events", event, format="json"
            )
            self.assertEqual(response.status_code, 200, response.content)
        self.guest.get(f"/api/v1/listings/{listing_id}")
        response = self.client.get("/api/v1/stores/me/dashboard")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["data"]["contact_leads"], 1)
        self.assertEqual(response.data["data"]["views"], 1)
        self.assertEqual(response.data["data"]["active_listings"], 1)
        self.store.status = "suspended"
        self.store.save()
        self.assertEqual(
            self.guest.get(
                f"/api/v1/listings/{listing_id}/contact-methods"
            ).status_code,
            404,
        )
        self.assertEqual(
            self.guest.post(
                f"/api/v1/listings/{listing_id}/contact-events", event, format="json"
            ).status_code,
            404,
        )

    def test_moderator_permissions_do_not_escalate_to_founder(self):
        moderator = get_user_model().objects.create_user("moderator")
        self.client.force_authenticate(self.founder)
        response = self.client.post(
            "/api/v1/admin/roles",
            {
                "name": "Listings moderator",
                "permissions": ["moderate_listings"],
                "user_ids": [moderator.pk],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        role_id = response.data["data"]["id"]
        self.client.force_authenticate(moderator)
        self.assertEqual(
            self.client.get("/api/v1/admin/moderation/queue").status_code, 200
        )
        for path in [
            "/api/v1/admin/roles",
            "/api/v1/admin/verifications",
            "/api/v1/admin/audit-events",
            "/api/v1/admin/overview",
        ]:
            self.assertEqual(self.client.get(path).status_code, 403, path)
        self.assertEqual(
            self.client.post(
                "/api/v1/admin/roles",
                {"name": "Escalate", "permissions": ["verify_stores"]},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.delete(f"/api/v1/admin/roles/{role_id}").status_code, 403
        )
        self.client.force_authenticate(self.founder)
        self.assertEqual(self.client.get("/api/v1/admin/overview").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/admin/roles").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/admin/audit-events").status_code, 200)

    def test_destructive_actions_need_two_distinct_founders_and_cannot_replay(self):
        self.client.force_authenticate(self.founder)
        response = self.client.post(
            f"/api/v1/admin/listings/{self.listing['id']}/moderate",
            {"action": "suspend_store", "reason": "Policy violation", "version": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        approval_id = response.data["data"]["approval"]["id"]
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, "verified")
        command = {"decision": "approve", "version": 1}
        self.assertEqual(
            self.client.post(
                f"/api/v1/admin/dual-approvals/{approval_id}/decision",
                command,
                format="json",
            ).status_code,
            403,
        )
        second = get_user_model().objects.create_superuser(
            "founder2", "b@example.com", "Strong-Pass42"
        )
        self.client.force_authenticate(second)
        response = self.client.post(
            f"/api/v1/admin/dual-approvals/{approval_id}/decision",
            command,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, "suspended")
        self.assertEqual(self.guest.get("/api/v1/listings").data["data"], [])
        self.assertEqual(
            self.client.post(
                f"/api/v1/admin/dual-approvals/{approval_id}/decision",
                command,
                format="json",
            ).status_code,
            409,
        )

    def test_audit_cannot_be_updated_or_deleted_through_queryset(self):
        from core.models import AuditEvent

        event = AuditEvent.objects.first()
        self.assertIsNotNone(event)
        with self.assertRaises(DatabaseError), transaction.atomic():
            AuditEvent.objects.filter(pk=event.pk).update(action="tampered")
        with self.assertRaises(DatabaseError), transaction.atomic():
            AuditEvent.objects.filter(pk=event.pk).delete()
        event.refresh_from_db()
        self.assertEqual(event.action, "listing.created")

    def test_founder_metrics_count_searches_without_guest_identity(self):
        self.guest.get("/api/v1/listings", {"q": "iPhone"})
        self.guest.get("/api/v1/listings", {"city": "khartoum"})
        self.client.force_authenticate(self.founder)
        response = self.client.get("/api/v1/admin/overview")
        self.assertEqual(response.data["data"]["daily_searches"], 2)
