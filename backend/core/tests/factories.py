"""Shared realistic fixtures; no production cleanup hooks or mock behavior assertions."""

import uuid
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


class InventoryFixture:
    def setUp(self):
        from core.models import Account, Store, Membership, Brand, PhoneModel, Variant

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
            status="verified",
            phone="+249912345678",
            whatsapp="+249912345678",
        )
        Membership.objects.create(store=self.store, user=self.owner, role="owner")
        self.brand = Brand.objects.create(name="Apple")
        self.model = PhoneModel.objects.create(brand=self.brand, name="iPhone 13")
        self.variant = Variant.objects.create(
            model=self.model, storage_gb=128, ram_gb=4, color="Black"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.founder = get_user_model().objects.create_superuser(
            "founder", "a@example.com", "Strong-Pass42"
        )

    def assets(self, kinds, status="ready"):
        from django.utils import timezone
        from core.models import MediaAsset

        return [
            str(
                MediaAsset.objects.create(
                    store=self.store,
                    purpose="listing",
                    kind=kind,
                    size=10,
                    sha256="a" * 64,
                    content_type="image/jpeg",
                    upload_key=str(uuid.uuid4()),
                    processed_key=f"public/image-{uuid.uuid4()}.jpg",
                    thumbnail_key=f"public/thumb-{uuid.uuid4()}.jpg",
                    status=status,
                    expires_at=timezone.now(),
                ).pk
            )
            for kind in kinds
        ]

    def payload(self, condition="new", status="ready"):
        data = {
            "variant_id": self.variant.pk,
            "condition": condition,
            "price": "500000.00",
            "quantity": 3 if condition == "new" else 1,
            "media": self.assets(
                ["seal"] if condition == "new" else ["front", "back", "screen"], status
            ),
        }
        if condition == "new":
            data.update(warranty_months=12, is_sealed=True)
        else:
            data.update(
                grade="good",
                battery_health=83,
                defects="Minor scratches",
                warranty_days=3,
                has_original_box=False,
            )
        return data

    def create_listing(self, data=None, key=None):
        response = self.client.post(
            "/api/v1/stores/me/listings",
            data or self.payload(),
            format="json",
            HTTP_IDEMPOTENCY_KEY=key or str(uuid.uuid4()),
        )
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["data"]

    def patch(self, listing, suffix, data, key=None):
        return self.client.patch(
            f"/api/v1/stores/me/listings/{listing['id']}{suffix}",
            data,
            format="json",
            HTTP_IDEMPOTENCY_KEY=key or str(uuid.uuid4()),
        )
