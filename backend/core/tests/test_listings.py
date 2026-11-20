"""BE-06/07/08: inventory invariants, retry safety and automatic publication."""

import uuid
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .factories import InventoryFixture


@override_settings(
    MEDIA_STORAGE_BACKEND="core.tests.test_verification_media.MemoryStorage"
)
class ListingTests(InventoryFixture, TestCase):
    def test_new_and_used_publish_automatically_and_catalog_filters(self):
        new = self.create_listing()
        used = self.create_listing(self.payload("used"))
        self.assertEqual(new["status"], "published")
        self.assertEqual(used["quantity"], 1)
        self.assertEqual(used["battery_health"], 83)
        self.assertEqual(
            self.client.get("/api/v1/catalog/models", {"brand_id": self.brand.pk}).data[
                "data"
            ][0]["name"],
            "iPhone 13",
        )
        self.assertEqual(
            self.client.get(
                "/api/v1/catalog/variants", {"model_id": self.model.pk}
            ).data["data"][0]["storage_gb"],
            128,
        )
        self.assertEqual(self.client.get("/api/v1/stores/me/listings").status_code, 200)
        self.assertEqual(
            self.client.get(f"/api/v1/stores/me/listings/{new['id']}/status").data[
                "data"
            ]["status"],
            "published",
        )

    def test_stock_version_price_history_and_original_replay(self):
        from core.models import PriceHistory

        listing = self.create_listing()
        key = str(uuid.uuid4())
        command = {"version": 1, "quantity": 0}
        response = self.patch(listing, "/stock", command, key)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["data"]["version"], 2)
        self.assertEqual(response.data["data"]["quantity"], 0)
        replay = self.patch(listing, "/stock", command, key)
        self.assertEqual(replay.data, response.data)
        self.assertEqual(
            self.patch(listing, "/stock", {"version": 1, "quantity": 3}).status_code,
            409,
        )
        self.assertEqual(
            self.patch(
                listing, "/stock", {"version": 2, "quantity": 1}, key
            ).status_code,
            409,
        )
        self.assertEqual(
            self.patch(
                listing, "/price", {"version": 2, "price": "510000.00"}
            ).status_code,
            200,
        )
        self.assertEqual(
            PriceHistory.objects.filter(listing_id=listing["id"]).count(), 2
        )
        self.assertEqual(
            PriceHistory.objects.filter(listing_id=listing["id"]).latest("pk").price,
            Decimal("510000.00"),
        )

    def test_used_units_and_money_validation(self):
        payload = self.payload("used")
        for field, value in [
            ("quantity", 2),
            ("battery_health", 49),
            ("price", "-1.00"),
            ("price", "1.001"),
            ("grade", "new"),
        ]:
            response = self.client.post(
                "/api/v1/stores/me/listings",
                {**payload, field: value},
                format="json",
                HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
            )
            self.assertEqual(response.status_code, 400, (field, response.content))
        payload["media"] = payload["media"][:2]
        self.assertEqual(
            self.client.post(
                "/api/v1/stores/me/listings",
                payload,
                format="json",
                HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
            ).status_code,
            400,
        )

    def test_cross_store_ids_and_unverified_publication_are_denied(self):
        from core.models import Store, Membership, Listing

        listing = self.create_listing()
        other = get_user_model().objects.create_user("other")
        other_store = Store.objects.create(owner=other)
        Membership.objects.create(user=other, store=other_store, role="owner")
        self.client.force_authenticate(other)
        self.assertEqual(
            self.patch(listing, "/price", {"version": 1, "price": "12.00"}).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/stores/me/listings",
                self.payload(),
                format="json",
                HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
            ).status_code,
            403,
        )
        from core.listings.services import update_listing
        from core.common.domain import DomainError

        with self.assertRaises(DomainError):
            update_listing(
                other,
                listing["id"],
                {"version": 1, "price": Decimal("1.00")},
                str(uuid.uuid4()),
                "price",
            )
        self.assertEqual(
            Listing.objects.get(pk=listing["id"]).price, Decimal("500000.00")
        )

    def test_pending_media_does_not_publish_and_removed_cannot_republish(self):
        from core.models import Listing
        from core.listings.services import publish_ready

        listing = self.create_listing(self.payload(status="queued"))
        self.assertEqual(listing["status"], "processing")
        self.client.force_authenticate(self.founder)
        response = self.client.post(
            f"/api/v1/admin/listings/{listing['id']}/moderate",
            {"action": "remove", "reason": "Wrong item", "version": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        from django.db import transaction

        with transaction.atomic():
            publish_ready(self.store)
        self.assertEqual(Listing.objects.get(pk=listing["id"]).status, "removed")

    def test_failed_media_can_be_replaced_without_bypassing_publication(self):
        from core.models import MediaAsset, Listing

        listing = self.create_listing(self.payload(status="queued"))
        MediaAsset.objects.filter(store=self.store).update(status="failed")
        status = self.client.get(f"/api/v1/stores/me/listings/{listing['id']}/status")
        self.assertEqual(status.data["data"]["media_status"][0]["status"], "failed")
        response = self.patch(
            listing, "", {"version": 1, "media": self.assets(["seal"])}
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["data"]["status"], "published")
        self.assertEqual(Listing.objects.get(pk=listing["id"]).version, 2)

    def test_flag_feedback_reaches_merchant_and_amendment_returns_to_review(self):
        listing = self.create_listing()
        self.client.force_authenticate(self.founder)
        response = self.client.post(
            f"/api/v1/admin/listings/{listing['id']}/moderate",
            {"action": "flag", "reason": "Correct the warranty term", "version": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.client.force_authenticate(self.owner)
        status = self.client.get(f"/api/v1/stores/me/listings/{listing['id']}/status")
        self.assertEqual(status.data["data"]["feedback"], "Correct the warranty term")
        amended = self.patch(listing, "", {"version": 2, "warranty_months": 24})
        self.assertEqual(amended.status_code, 200, amended.content)
        self.assertEqual(amended.data["data"]["moderation"], "pending")
        guest = APIClient()
        public = guest.get(f"/api/v1/listings/{listing['id']}")
        self.assertNotIn("feedback", public.data["data"])
