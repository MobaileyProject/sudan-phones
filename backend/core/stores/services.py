import secrets
from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from core.common.domain import DomainError, require, require_actor
from core.operations.audit import record
from .models import Store, Membership


def member_store(actor, owner=False, verified=False, lock=False, allow_inactive=False):
    require_actor(actor)
    member = Membership.objects.filter(user=actor).first()
    require(member is not None, "FORBIDDEN", 403)
    stores = Store.objects.select_for_update() if lock else Store.objects
    store = stores.get(pk=member.store_id)
    if lock:
        member = Membership.objects.filter(user=actor, store=store).first()
        require(member is not None, "FORBIDDEN", 403)
    if not allow_inactive:
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


def _staff_data(m):
    account = getattr(m.user, "account", None) if m.user else None
    resolved_name = (
        m.display_name
        or (m.user.first_name or m.user.username if m.user else "")
        or m.phone
        or "Staff"
    )
    resolved_phone = m.phone or (account.phone if account else "")
    return {
        "id": m.pk,
        "user_id": m.user_id,
        "name": resolved_name,
        "phone": resolved_phone,
        "role": m.role,
        "invite_code": m.invite_code,
        "created_at": m.created_at,
    }


def list_staff(actor):
    store = member_store(actor)
    members = (
        Membership.objects.select_related("user", "user__account")
        .filter(store=store)
        .order_by("pk")
    )
    return [_staff_data(m) for m in members]


def _unique_invite_code():
    for _ in range(10):
        code = f"SP-{secrets.randbelow(900000) + 100000}"
        if not Membership.objects.filter(invite_code=code).exists():
            return code
    return f"SP-{secrets.token_hex(4).upper()}"


@transaction.atomic
def add_staff(actor, data):
    from core.identity.models import Account

    store = member_store(actor, owner=True, lock=True)
    display_name = (data.get("name") or "").strip()
    role = data.get("role", "staff")
    invite_code = _unique_invite_code()
    if data.get("user_id"):
        user = (
            get_user_model()
            .objects.filter(pk=data["user_id"], is_active=True)
            .first()
        )
        require(user is not None, "NOT_FOUND", 404)
        account = Account.objects.filter(user=user).first()
        phone_val = account.phone if account else ""
    else:
        phone_val = data["phone"]
        account = (
            Account.objects.select_related("user")
            .filter(phone=phone_val, phone_verified=True, user__is_active=True)
            .first()
        )
        user = account.user if account else None
        if user is None and Membership.objects.filter(store=store, phone=phone_val).exists():
            raise DomainError("MEMBERSHIP_EXISTS", 409)
    try:
        with transaction.atomic():
            member = Membership.objects.create(
                store=store,
                user=user,
                display_name=display_name,
                phone=phone_val,
                invite_code=invite_code,
                role=role,
            )
    except IntegrityError:
        raise DomainError("MEMBERSHIP_EXISTS", 409) from None
    record(actor, "store.staff_added", store.pk, membership=member.pk, role=role)
    return _staff_data(member)


@transaction.atomic
def remove_staff(actor, member_id):
    store = member_store(actor, owner=True, lock=True)
    member = (
        Membership.objects.filter(store=store, pk=member_id)
        .exclude(role="owner")
        .first()
    )
    require(member is not None, "NOT_FOUND", 404)
    member.delete()
    record(actor, "store.staff_removed", store.pk, membership=member_id)
