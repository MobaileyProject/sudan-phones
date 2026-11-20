"""Real PostgreSQL connections exercise conflicting writers and duplicate requests."""

import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from django.db import connection, close_old_connections
from django.test import TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from .factories import InventoryFixture


@skipUnless(
    connection.vendor == "postgresql", "PostgreSQL required for row-lock evidence"
)
@override_settings(
    MEDIA_STORAGE_BACKEND="core.tests.test_verification_media.MemoryStorage"
)
class InventoryConcurrencyTests(InventoryFixture, TransactionTestCase):
    def concurrent(self, operation):
        barrier = Barrier(2)
        actor_id = self.owner.pk

        def run(index):
            close_old_connections()
            try:
                actor = get_user_model().objects.get(pk=actor_id)
                barrier.wait(timeout=10)
                return operation(actor, index)
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            return list(executor.map(run, range(2)))

    def test_simultaneous_duplicate_creation_has_one_durable_result(self):
        from core.listings.services import create_listing
        from core.models import Listing, Mutation, PriceHistory

        data, key = self.payload(), str(uuid.uuid4())
        results = self.concurrent(lambda actor, index: create_listing(actor, data, key))
        self.assertEqual(results[0], results[1])
        self.assertEqual(Listing.objects.count(), 1)
        self.assertEqual(Mutation.objects.count(), 1)
        self.assertEqual(PriceHistory.objects.count(), 1)

    def test_conflicting_absolute_stock_updates_allow_only_one_version(self):
        from core.listings.services import update_listing
        from core.common.domain import DomainError
        from core.models import Listing

        listing = self.create_listing()

        def operation(actor, index):
            try:
                result = update_listing(
                    actor,
                    listing["id"],
                    {"version": 1, "quantity": index},
                    str(uuid.uuid4()),
                    "stock",
                )
                return ("ok", result["quantity"])
            except DomainError as error:
                return ("error", error.status)

        results = self.concurrent(operation)
        self.assertEqual(sum(r[0] == "ok" for r in results), 1)
        self.assertIn(("error", 409), results)
        stored = Listing.objects.get(pk=listing["id"])
        self.assertEqual(stored.version, 2)
        self.assertEqual(stored.quantity, next(r[1] for r in results if r[0] == "ok"))
