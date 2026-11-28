from datetime import timedelta
from urllib.parse import quote
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from django.db.models import Avg, Count, Q, Sum, F
from django.utils import timezone
from core.common.domain import require, DomainError, require_actor
from core.stores.models import Store, Verification
from core.stores.services import member_store
from core.catalog.models import PhoneModel
from core.listings.models import Listing
from core.discovery.queries import visible_listings, visible_stores
from .models import (
    AdminRole,
    RoleAssignment,
    DualApproval,
    AuditEvent,
    ContactEvent,
    DailyMetrics,
    StoreDailyMetrics,
    CustomerReport,
    Rating,
)
from .audit import record
from .authorization import require_admin
from .engagement import notify_price_drop  # noqa: F401


def require_founder(actor):
    require_actor(actor)
    require(actor.is_superuser, "FORBIDDEN", 403)


def role_data(role):
    return {
        "id": role.pk,
        "name": role.name,
        "description": role.description,
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
        role.description = data.get("description", role.description)
    else:
        role = AdminRole(
            name=data["name"],
            description=data.get("description", ""),
            permissions=data["permissions"],
        )
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


def approval_data(approval):
    req_user = approval.requested_by
    dec_user = approval.decided_by
    return {
        "id": approval.pk,
        "requested_by_id": approval.requested_by_id,
        "requested_by_name": req_user.first_name or req_user.username,
        "decided_by_id": approval.decided_by_id,
        "decided_by_name": (dec_user.first_name or dec_user.username) if dec_user else "",
        "operation": approval.operation,
        "target_id": approval.target_id,
        "target_version": approval.target_version,
        "reason": approval.reason,
        "status": approval.status,
        "version": approval.version,
        "created_at": approval.created_at,
        "decided_at": approval.decided_at,
    }


def approvals(actor, query):
    require_founder(actor)
    qs = DualApproval.objects.select_related("requested_by", "decided_by")
    status_filter = query.get("status", "pending")
    if status_filter != "all":
        qs = qs.filter(status=status_filter)
    return [
        approval_data(a)
        for a in qs.order_by("pk")[query["offset"] : query["offset"] + query["limit"]]
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
    events = AuditEvent.objects.select_related("actor").order_by("-pk")
    for key in ["action", "actor_id", "resource"]:
        if key in query:
            events = events.filter(**{key: query[key]})
    if "q" in query and query["q"].strip():
        term = query["q"].strip()
        events = events.filter(
            Q(action__icontains=term)
            | Q(resource__icontains=term)
            | Q(actor__first_name__icontains=term)
            | Q(actor__username__icontains=term)
        )
    rows = events[query["offset"] : query["offset"] + query["limit"]]
    return [
        {
            "id": e.pk,
            "actor_id": e.actor_id,
            "actor_name": e.actor.first_name or e.actor.username,
            "actor_ip": e.actor_ip,
            "action": e.action,
            "resource": e.resource,
            "metadata": e.metadata,
            "created_at": e.created_at,
        }
        for e in rows
    ]


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
    today = timezone.localdate()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    by_day = {
        m.day: m.views
        for m in StoreDailyMetrics.objects.filter(store=store, day__gte=days[0])
    }
    return dashboard_counts(Listing.objects.filter(store=store)) | {
        "daily_views": [{"day": d, "count": by_day.get(d, 0)} for d in days]
    }


def overview(actor):
    from .ads import ads_overview_metrics

    require_admin(actor, "view_metrics")
    counts = dashboard_counts(Listing.objects.all())
    counts["active_listings"] = visible_listings().count()
    today = timezone.localdate()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    by_day = {
        m.day: m.searches
        for m in DailyMetrics.objects.filter(day__gte=days[0])
    }
    return counts | ads_overview_metrics() | {
        "stores": Store.objects.count(),
        "verified_stores": Store.objects.filter(status="verified").count(),
        "pending_verifications": Verification.objects.filter(
            status="pending_verification"
        ).count(),
        "flagged_listings": Listing.objects.filter(
            status="published", moderation="flagged"
        ).count(),
        "pending_approvals": DualApproval.objects.filter(status="pending").count(),
        "open_reports": CustomerReport.objects.filter(status="open").count(),
        "daily_searches": by_day.get(today, 0),
        "daily_searches_trend": [{"day": d, "count": by_day.get(d, 0)} for d in days],
        "daily_views": [],
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
        metric, _ = StoreDailyMetrics.objects.get_or_create(
            store_id=listing.store_id, day=timezone.localdate()
        )
        StoreDailyMetrics.objects.filter(pk=metric.pk).update(
            contact_leads=F("contact_leads") + 1
        )
    return {"accepted": True}


def _rating_data(rating):
    return {
        "id": rating.pk,
        "target_type": rating.target_type,
        "target_id": (
            rating.store_id
            if rating.target_type == "store"
            else rating.listing_id
            if rating.target_type == "listing"
            else rating.phone_model_id
        ),
        "author_id": rating.author_id or 0,
        "author_name": rating.author_name
        or ((rating.author.first_name or rating.author.username) if rating.author else "Customer"),
        "stars": rating.stars,
        "comment": rating.comment,
        "created_at": rating.created_at,
        "updated_at": rating.updated_at,
    }


def _rating_summary(qs):
    agg = qs.aggregate(avg=Avg("stars"), count=Count("id"))
    dist = {str(i): 0 for i in range(1, 6)}
    for row in qs.values("stars").annotate(c=Count("id")):
        dist[str(row["stars"])] = row["c"]
    return {
        "average": round(agg["avg"], 2) if agg["avg"] is not None else None,
        "count": agg["count"] or 0,
        "distribution": dist,
    }


def list_ratings(target_type, target_id, query):
    if target_type == "store":
        require(visible_stores().filter(pk=target_id).exists(), "NOT_FOUND", 404)
        qs = Rating.objects.select_related("author").filter(
            target_type="store", store_id=target_id
        )
    else:
        require(PhoneModel.objects.filter(pk=target_id).exists(), "NOT_FOUND", 404)
        qs = Rating.objects.select_related("author").filter(
            Q(target_type="phone_model", phone_model_id=target_id)
            | Q(target_type="listing", listing__variant__model_id=target_id)
        )
    rows = qs.order_by("-updated_at", "-pk")[
        query["offset"] : query["offset"] + query["limit"]
    ]
    return {
        "data": [_rating_data(r) for r in rows],
        "summary": _rating_summary(qs),
    }


@transaction.atomic
def submit_rating(actor, target_type, target_id, data):
    require_actor(actor)
    author_name = (data.get("author_name") or "").strip()[:120] or (
        actor.first_name or actor.username
    )
    if target_type == "store":
        store = visible_stores().filter(pk=target_id).first()
        require(store is not None, "NOT_FOUND", 404)
        require(store.owner_id != actor.pk, "SELF_RATING_FORBIDDEN", 403)
        rating, _ = Rating.objects.update_or_create(
            author=actor,
            store=store,
            defaults={
                "target_type": "store",
                "phone_model": None,
                "listing": None,
                "author_name": author_name,
                "stars": data["stars"],
                "comment": data.get("comment", "").strip(),
            },
        )
    else:
        model = PhoneModel.objects.filter(pk=target_id).first()
        require(model is not None, "NOT_FOUND", 404)
        rating, _ = Rating.objects.update_or_create(
            author=actor,
            phone_model=model,
            target_type="phone_model",
            defaults={
                "store": None,
                "listing": None,
                "author_name": author_name,
                "stars": data["stars"],
                "comment": data.get("comment", "").strip(),
            },
        )
    return _rating_data(rating)


@transaction.atomic
def submit_report(actor, data):
    reporter = actor if (actor and actor.is_authenticated) else None
    if data["target_type"] == "listing":
        listing = visible_listings().filter(pk=data["target_id"]).first()
        require(listing is not None, "NOT_FOUND", 404)
        report = CustomerReport.objects.create(
            target_type="listing",
            listing=listing,
            reason=data["reason"],
            details=data["details"],
            reporter_contact=data.get("reporter_contact", ""),
            reporter=reporter,
        )
    else:
        store = visible_stores().filter(pk=data["target_id"]).first()
        require(store is not None, "NOT_FOUND", 404)
        report = CustomerReport.objects.create(
            target_type="store",
            store=store,
            reason=data["reason"],
            details=data["details"],
            reporter_contact=data.get("reporter_contact", ""),
            reporter=reporter,
        )
    return report


def list_reports(actor, query):
    require_admin(actor, "moderate_listings")
    qs = CustomerReport.objects.order_by("-created_at", "-pk")
    if query.get("status") != "all":
        qs = qs.filter(status=query["status"])
    return list(qs[query["offset"] : query["offset"] + query["limit"]])


@transaction.atomic
def resolve_report(actor, report_id, data, actor_ip=None):
    require_admin(actor, "moderate_listings", lock=True)
    report = CustomerReport.objects.select_for_update().filter(pk=report_id).first()
    require(report is not None, "NOT_FOUND", 404)
    report.status = data["status"]
    report.resolution_note = data.get("resolution_note", "")
    report.resolved_by = actor
    report.resolved_at = timezone.now()
    report.save(
        update_fields=["status", "resolution_note", "resolved_by", "resolved_at"]
    )
    if data.get("flag_listing") and report.listing_id:
        listing = (
            Listing.objects.select_for_update()
            .filter(pk=report.listing_id, status="published")
            .first()
        )
        if listing and listing.store.owner_id != actor.pk:
            listing.moderation = "flagged"
            listing.feedback = data.get("resolution_note") or report.reason
            listing.version += 1
            listing.save(update_fields=["moderation", "feedback", "version"])
    record(
        actor,
        "report.resolved",
        report.pk,
        status=report.status,
        flag_listing=bool(data.get("flag_listing")),
        actor_ip=actor_ip,
    )
    return report


@transaction.atomic
def suspend_store_request(actor, store_id, data, actor_ip=None):
    require_founder(actor)
    store = Store.objects.select_for_update().filter(pk=store_id).first()
    require(store is not None, "NOT_FOUND", 404)
    approval = request_suspension(actor, store, data["reason"], actor_ip=actor_ip)
    return approval_data(approval)


def list_admin_users(actor):
    from .policy import PERMISSIONS

    require_founder(actor)
    assignments = {
        a.user_id: a.role
        for a in RoleAssignment.objects.select_related("role").all()
    }
    user_ids = set(assignments.keys())
    users = (
        get_user_model()
        .objects.select_related("account")
        .filter(Q(is_superuser=True) | Q(pk__in=user_ids), is_active=True)
        .order_by("-is_superuser", "pk")
    )
    result = []
    for u in users:
        role = assignments.get(u.pk)
        account = getattr(u, "account", None)
        result.append(
            {
                "id": u.pk,
                "name": u.first_name or u.username,
                "email": u.email,
                "phone": account.phone if account else "",
                "is_superuser": u.is_superuser,
                "role_id": role.pk if role else None,
                "role_name": "Founder" if u.is_superuser else (role.name if role else ""),
                "permissions": PERMISSIONS if u.is_superuser else (role.permissions if role else []),
            }
        )
    return result


def list_favorites(actor):
    from .models import Favorite

    require_actor(actor)
    return list(
        Favorite.objects.filter(user=actor)
        .order_by("-created_at")
        .values_list("listing_id", flat=True)
    )


@transaction.atomic
def add_favorite(actor, listing_id):
    from .models import Favorite

    require_actor(actor)
    require(visible_listings().filter(pk=listing_id).exists(), "NOT_FOUND", 404)
    Favorite.objects.get_or_create(user=actor, listing_id=listing_id)
    return {"listing_id": listing_id, "saved": True}


@transaction.atomic
def remove_favorite(actor, listing_id):
    from .models import Favorite

    require_actor(actor)
    Favorite.objects.filter(user=actor, listing_id=listing_id).delete()
    return {"listing_id": listing_id, "saved": False}
