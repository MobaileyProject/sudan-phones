from urllib.parse import quote
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from django.db.models import Sum, F
from django.utils import timezone
from core.common.domain import require, DomainError, require_actor
from core.stores.models import Store, Verification
from core.stores.services import member_store
from core.listings.models import Listing
from core.discovery.queries import visible_listings
from .models import (
    AdminRole,
    RoleAssignment,
    DualApproval,
    AuditEvent,
    ContactEvent,
    DailyMetrics,
)
from .audit import record
from .authorization import require_admin


def require_founder(actor):
    require_actor(actor)
    require(actor.is_superuser, "FORBIDDEN", 403)


def role_data(role):
    return {
        "id": role.pk,
        "name": role.name,
        "permissions": role.permissions,
        "version": role.version,
        "user_ids": list(
            RoleAssignment.objects.filter(role=role).values_list("user_id", flat=True)
        ),
    }


def roles(actor, query):
    require_founder(actor)
    return [
        role_data(r)
        for r in AdminRole.objects.order_by("pk")[
            query["offset"] : query["offset"] + query["limit"]
        ]
    ]


@transaction.atomic
def save_role(actor, data, actor_ip=None):
    require_founder(actor)
    # All role/assignment writes lock founder actors in a stable order, then roles.
    list(
        get_user_model()
        .objects.select_for_update()
        .filter(is_superuser=True)
        .order_by("pk")
    )
    if "id" in data:
        role = AdminRole.objects.select_for_update().filter(pk=data["id"]).first()
        require(role is not None, "NOT_FOUND", 404)
        require(role.version == data["version"], "STALE_VERSION", 409)
        role.version += 1
        role.name, role.permissions = data["name"], data["permissions"]
    else:
        role = AdminRole(name=data["name"], permissions=data["permissions"])
    from .policy import PERMISSIONS

    require(set(role.permissions) <= set(PERMISSIONS), "INVALID_PERMISSIONS")
    try:
        with transaction.atomic():
            role.save()
    except IntegrityError:
        raise DomainError("ROLE_EXISTS", 409) from None
    if "user_ids" in data:
        users = list(
            get_user_model().objects.filter(
                pk__in=data["user_ids"], is_active=True, is_superuser=False
            )
        )
        require(len(users) == len(set(data["user_ids"])), "INVALID_ASSIGNEES")
        RoleAssignment.objects.filter(role=role).exclude(
            user_id__in=data["user_ids"]
        ).delete()
        for user in users:
            RoleAssignment.objects.update_or_create(user=user, defaults={"role": role})
    record(actor, "role.saved", role.pk, version=role.version, actor_ip=actor_ip)
    return role_data(role)


@transaction.atomic
def delete_role(actor, role_id, actor_ip=None):
    require_founder(actor)
    role = AdminRole.objects.select_for_update().filter(pk=role_id).first()
    require(role is not None, "NOT_FOUND", 404)
    approval = DualApproval.objects.create(
        requested_by=actor,
        operation="delete_role",
        target_id=role.pk,
        target_version=role.version,
        reason="Delete custom role and revoke assignments",
    )
    record(
        actor,
        "dual_approval.requested",
        approval.pk,
        operation="delete_role",
        target=role.pk,
        actor_ip=actor_ip,
    )
    return approval


def request_suspension(actor, store, reason, actor_ip=None):
    require_founder(actor)
    require(store.status == "verified", "INVALID_STATE", 409)
    approval = DualApproval.objects.create(
        requested_by=actor,
        operation="suspend_store",
        target_id=store.pk,
        target_version=store.version,
        reason=reason,
    )
    record(
        actor,
        "dual_approval.requested",
        approval.pk,
        operation="suspend_store",
        target=store.pk,
        actor_ip=actor_ip,
    )
    return approval


def approvals(actor, query):
    require_founder(actor)
    return DualApproval.objects.filter(status="pending").order_by("pk")[
        query["offset"] : query["offset"] + query["limit"]
    ]


@transaction.atomic
def decide(actor, approval_id, data, actor_ip=None):
    require_founder(actor)
    approval = DualApproval.objects.select_for_update().filter(pk=approval_id).first()
    require(approval is not None, "NOT_FOUND", 404)
    require(approval.requested_by_id != actor.pk, "SELF_APPROVAL_FORBIDDEN", 403)
    require(
        approval.status == "pending" and approval.version == data["version"],
        "STALE_VERSION",
        409,
    )
    require(
        approval.requested_by.is_active and approval.requested_by.is_superuser,
        "REQUESTER_NO_LONGER_FOUNDER",
        409,
    )
    if data["decision"] == "approve":
        if approval.operation == "suspend_store":
            store = (
                Store.objects.select_for_update().filter(pk=approval.target_id).first()
            )
            require(
                store
                and store.status == "verified"
                and store.version == approval.target_version,
                "STALE_TARGET",
                409,
            )
            require(actor.pk != store.owner_id, "SELF_REVIEW_FORBIDDEN", 403)
            store.status, store.feedback = "suspended", approval.reason
            store.version += 1
            store.save()
            record(
                actor,
                "store.suspended",
                store.pk,
                approval_id=approval.pk,
                actor_ip=actor_ip,
            )
        elif approval.operation == "delete_role":
            role = (
                AdminRole.objects.select_for_update()
                .filter(pk=approval.target_id)
                .first()
            )
            require(
                role and role.version == approval.target_version, "STALE_TARGET", 409
            )
            RoleAssignment.objects.filter(role=role).delete()
            role.delete()
            record(
                actor,
                "role.deleted",
                approval.target_id,
                approval_id=approval.pk,
                actor_ip=actor_ip,
            )
        else:
            raise DomainError("INVALID_OPERATION")
    approval.status = "approved" if data["decision"] == "approve" else "rejected"
    approval.version += 1
    approval.decided_by, approval.decided_at = actor, timezone.now()
    approval.save()
    record(
        actor,
        "dual_approval.decided",
        approval.pk,
        decision=data["decision"],
        actor_ip=actor_ip,
    )
    return approval


def audits(actor, query):
    require_admin(actor, "view_audit")
    events = AuditEvent.objects.order_by("-pk")
    for key in ["action", "actor_id", "resource"]:
        if key in query:
            events = events.filter(**{key: query[key]})
    return events[query["offset"] : query["offset"] + query["limit"]]


def dashboard_counts(queryset):
    totals = queryset.aggregate(views=Sum("views"), contact_leads=Sum("contact_leads"))
    return {
        "active_listings": queryset.filter(status="published", quantity__gt=0).count(),
        "out_of_stock": queryset.filter(quantity=0).count(),
        "views": totals["views"] or 0,
        "contact_leads": totals["contact_leads"] or 0,
    }


def dashboard(actor):
    store = member_store(actor, verified=True)
    return dashboard_counts(Listing.objects.filter(store=store))


def overview(actor):
    require_admin(actor, "view_metrics")
    counts = dashboard_counts(Listing.objects.all())
    counts["active_listings"] = visible_listings().count()
    return counts | {
        "stores": Store.objects.count(),
        "verified_stores": Store.objects.filter(status="verified").count(),
        "pending_verifications": Verification.objects.filter(
            status="pending_verification"
        ).count(),
        "daily_searches": DailyMetrics.objects.filter(day=timezone.localdate())
        .values_list("searches", flat=True)
        .first()
        or 0,
    }


def contact_methods(listing_id):
    listing = visible_listings().filter(pk=listing_id).first()
    require(listing is not None, "NOT_FOUND", 404)
    message = f"{listing.variant.model.name} ({listing.condition}) {listing.price:.2f} SDG — {settings.PUBLIC_LISTING_BASE_URL.rstrip('/')}/{listing.pk}"
    return {
        "phone_url": f"tel:{listing.store.phone}",
        "whatsapp_url": f"https://wa.me/{listing.store.whatsapp.lstrip('+')}?text={quote(message, safe='')}",
    }


@transaction.atomic
def contact_event(listing_id, data):
    target = Listing.objects.filter(pk=listing_id).first()
    require(target is not None, "NOT_FOUND", 404)
    Store.objects.select_for_update().get(pk=target.store_id)
    listing = visible_listings().filter(pk=listing_id).first()
    require(listing is not None, "NOT_FOUND", 404)
    try:
        with transaction.atomic():
            event, created = ContactEvent.objects.get_or_create(
                event_id=data["event_id"],
                defaults={"listing": listing, "method": data["method"]},
            )
    except IntegrityError:
        event, created = ContactEvent.objects.get(event_id=data["event_id"]), False
    require(
        event.listing_id == listing.pk and event.method == data["method"],
        "IDEMPOTENCY_CONFLICT",
        409,
    )
    if created:
        Listing.objects.filter(pk=listing.pk).update(
            contact_leads=F("contact_leads") + 1
        )
    return {"accepted": True}
