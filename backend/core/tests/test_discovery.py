"""BE-09 guest discovery: visibility must apply to every entry point."""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .factories import InventoryFixture


@override_settings(
    MEDIA_STORAGE_BACKEND="core.tests.test_verification_media.MemoryStorage"
)
class DiscoveryTests(InventoryFixture, TestCase):
    def setUp(self):
        super().setUp()
        self.listing = self.create_listing(self.payload("used"))
        self.guest = APIClient()

    def test_composite_filters_and_public_details(self):
        response = self.guest.get(
            "/api/v1/listings",
            {
                "q": "iPhone 13",
                "brand_id": self.brand.pk,
                "condition": "used",
                "city": "khartoum",
                "min_price": "499999.99",
                "max_price": "500000.00",
                "storage_gb": 128,
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["data"][0]["id"], self.listing["id"])
        self.assertEqual(response.data["meta"]["count"], 1)
        response = self.guest.get(f"/api/v1/listings/{self.listing['id']}")
        self.assertEqual(response.status_code, 200, response.content)
        item = response.data["data"]
        self.assertEqual(item["model"], "iPhone 13")
        self.assertEqual(item["currency"], "SDG")
        self.assertEqual(len(item["media"]), 3)
        self.assertIn("cdn.invalid", item["media"][0]["url"])
        self.assertNotIn("csrftoken", response.cookies)
        self.assertNotIn("sessionid", response.cookies)
        self.assertNotIn("upload_key", str(item))
        for path in [
            "/api/v1/home",
            "/api/v1/stores/featured",
            f"/api/v1/stores/{self.store.pk}",
            f"/api/v1/stores/{self.store.pk}/listings",
            f"/api/v1/product-variants/{self.variant.pk}/listings",
            f"/api/v1/listings/{self.listing['id']}/related",
        ]:
            response = self.guest.get(path)
            self.assertEqual(response.status_code, 200, (path, response.content))

    def test_suspension_removal_zero_stock_and_failed_media_hide_direct_and_feeds(self):
        from core.models import Listing, MediaAsset

        for change in ["suspended", "removed", "zero", "failed_media"]:
            self.store.status = "suspended" if change == "suspended" else "verified"
            self.store.save()
            Listing.objects.filter(pk=self.listing["id"]).update(
                status="removed" if change == "removed" else "published",
                quantity=0 if change == "zero" else 1,
            )
            MediaAsset.objects.filter(store=self.store).update(
                status="failed" if change == "failed_media" else "ready"
            )
            self.assertEqual(
                self.guest.get(f"/api/v1/listings/{self.listing['id']}").status_code,
                404,
            )
            for path in [
                "/api/v1/listings",
                f"/api/v1/product-variants/{self.variant.pk}/listings",
                f"/api/v1/stores/{self.store.pk}/listings",
            ]:
                response = self.guest.get(path)
                if response.status_code == 200:
                    self.assertEqual(response.data["data"], [], (change, path))
                else:
                    self.assertEqual(response.status_code, 404)

    def test_invalid_unknown_repeated_filters_and_price_order(self):
        for query in [
            "min_price=5&max_price=1",
            "city=foreign",
            "limit=101",
            "sort=password",
            "q=a&q=b",
            "unknown=1",
        ]:
            response = self.guest.get("/api/v1/listings?" + query)
            self.assertEqual(response.status_code, 400, (query, response.content))
        response = self.guest.get("/api/v1/listings", {"q": "no such phone"})
        self.assertEqual(response.data["data"], [])
        self.assertEqual(response.data["meta"]["count"], 0)
