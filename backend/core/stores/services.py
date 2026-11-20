from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from core.common.domain import DomainError, require, require_actor
from core.operations.audit import record
from .models import Store, Membership


def member_store(actor, owner=False, verified=False, lock=False):
    require_actor(actor)
    member = Membership.objects.filter(user=actor).first()
    require(member is not None, "FORBIDDEN", 403)
    stores = Store.objects.select_for_update() if lock else Store.objects
    store = stores.get(pk=member.store_id)
    if lock:
        member = Membership.objects.filter(user=actor, store=store).first()
        require(member is not None, "FORBIDDEN", 403)
    require(store.status not in ["suspended", "rejected"], "FORBIDDEN", 403)
    require(not owner or member.role == "owner", "FORBIDDEN", 403)
    require(not verified or store.status == "verified", "STORE_NOT_VERIFIED", 403)
    return store


@transaction.atomic
def update_profile(actor, data):
    store = member_store(actor, owner=True, lock=True)
    require(
        getattr(actor, "account", None) and actor.account.phone_verified,
        "PHONE_NOT_VERIFIED",
        403,
    )
    require(store.status in ["draft", "changes_requested"], "PROFILE_LOCKED", 409)
    require(
        data["whatsapp"] == actor.account.phone
        and data["phone"] == actor.account.phone,
        "CONTACT_NOT_VERIFIED",
    )
    for key, value in data.items():
        setattr(store, key, value)
    store.version += 1
    store.save()
    record(actor, "store.profile_updated", store.pk)
    return store


@transaction.atomic
def update_settings(actor, data):
    store = member_store(actor, owner=True, lock=True)
    for key, value in data.items():
        setattr(store, key, value)
    store.version += 1
    store.save()
    record(actor, "store.settings_updated", store.pk)
    return store


@transaction.atomic
def add_staff(actor, data):
    store = member_store(actor, owner=True, lock=True)
    user = get_user_model().objects.filter(pk=data["user_id"], is_active=True).first()
    require(user is not None, "NOT_FOUND", 404)
    try:
        with transaction.atomic():
            member = Membership.objects.create(store=store, user=user, role="staff")
    except IntegrityError:
        raise DomainError("MEMBERSHIP_EXISTS", 409) from None
    record(actor, "store.staff_added", store.pk, membership=member.pk)
    return member


@transaction.atomic
def remove_staff(actor, member_id):
    store = member_store(actor, owner=True, lock=True)
    member = Membership.objects.filter(store=store, pk=member_id, role="staff").first()
    require(member is not None, "NOT_FOUND", 404)
    member.delete()
    record(actor, "store.staff_removed", store.pk, membership=member_id)
