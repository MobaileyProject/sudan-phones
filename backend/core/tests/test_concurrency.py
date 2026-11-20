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

    def test_revoked_staff_cannot_write_after_waiting_for_store_lock(self):
        from threading import Event
        from django.db import transaction
        from core.models import Store, Membership, Listing
        from core.stores.services import remove_staff
        from core.listings.services import update_listing
        from core.common.domain import DomainError

        listing = self.create_listing()
        staff = get_user_model().objects.create_user("revoked-staff")
        membership = Membership.objects.create(
            store=self.store, user=staff, role="staff"
        )
        waiting = Event()

        def writer():
            close_old_connections()

            def observe(execute, sql, params, many, context):
                if "core_store" in sql and "FOR UPDATE" in sql:
                    waiting.set()
                return execute(sql, params, many, context)

            try:
                actor = get_user_model().objects.get(pk=staff.pk)
                with connection.execute_wrapper(observe):
                    try:
                        update_listing(
                            actor,
                            listing["id"],
                            {"version": 1, "quantity": 0},
                            str(uuid.uuid4()),
                            "stock",
                        )
                        return "committed"
                    except DomainError as error:
                        return error.status
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                Store.objects.select_for_update().get(pk=self.store.pk)
                future = pool.submit(writer)
                self.assertTrue(
                    waiting.wait(timeout=10), "writer did not reach the store lock"
                )
                remove_staff(self.owner, membership.pk)
            self.assertEqual(future.result(timeout=10), 403)
        self.assertEqual(Listing.objects.get(pk=listing["id"]).quantity, 3)

    def test_simultaneous_phone_proofs_bind_only_one_identity(self):
        from datetime import timedelta
        from django.utils import timezone
        from django.contrib.auth.hashers import make_password
        from core.models import Account, OTPChallenge
        from core.identity.services import verify
        from core.common.domain import DomainError

        identities = []
        phone = "+249911111111"
        for index in range(2):
            user = get_user_model().objects.create_user(f"pending-proof-{index}")
            Account.objects.create(user=user, phone=phone)
            OTPChallenge.objects.create(
                user=user,
                purpose="verify",
                channel="whatsapp",
                digest=make_password("123456"),
                expires_at=timezone.now() + timedelta(minutes=5),
            )
            identities.append(user.pk)

        def prove(actor, index):
            user = get_user_model().objects.get(pk=identities[index])
            try:
                verify(user, {"channel": "whatsapp", "code": "123456"})
                return 200
            except DomainError as error:
                return error.status

        self.assertEqual(sorted(self.concurrent(prove)), [200, 409])
        self.assertEqual(
            Account.objects.filter(phone=phone, phone_verified=True).count(), 1
        )

    def test_revoked_admin_permission_cannot_commit_after_store_lock_wait(self):
        from threading import Event
        from django.db import transaction
        from core.models import Store, AdminRole, RoleAssignment, Listing
        from core.operations.services import save_role
        from core.listings.services import moderate
        from core.common.domain import DomainError

        listing = self.create_listing()
        moderator = get_user_model().objects.create_user("revoked-moderator")
        role = AdminRole.objects.create(
            name="Temporary moderator", permissions=["moderate_listings"]
        )
        RoleAssignment.objects.create(user=moderator, role=role)
        waiting = Event()

        def writer():
            close_old_connections()

            def observe(execute, sql, params, many, context):
                if "core_store" in sql and "FOR UPDATE" in sql:
                    waiting.set()
                return execute(sql, params, many, context)

            try:
                actor = get_user_model().objects.get(pk=moderator.pk)
                with connection.execute_wrapper(observe):
                    try:
                        moderate(
                            actor,
                            listing["id"],
                            {"action": "remove", "reason": "Policy", "version": 1},
                        )
                        return "committed"
                    except DomainError as error:
                        return error.status
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                Store.objects.select_for_update().get(pk=self.store.pk)
                future = pool.submit(writer)
                self.assertTrue(waiting.wait(timeout=10))
                save_role(
                    self.founder,
                    {"id": role.pk, "version": 1, "name": role.name, "permissions": []},
                )
            self.assertEqual(future.result(timeout=10), 403)
        self.assertEqual(Listing.objects.get(pk=listing["id"]).status, "published")
