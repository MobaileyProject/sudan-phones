from decimal import Decimal
import hashlib
import json
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.utils import timezone
from core.common.domain import require
from core.stores.services import member_store
from core.stores.models import Store
from core.catalog.models import Variant
from core.media.models import MediaAsset
from core.operations.audit import record
from core.operations.authorization import require_admin
from .models import Listing, ListingMedia, PriceHistory, Mutation

FIELDS = (
    "id",
    "store_id",
    "variant_id",
    "condition",
    "price",
    "quantity",
    "grade",
    "battery_health",
    "defects",
    "replaced_parts",
    "used_unit_code",
    "used_availability",
    "warranty_months",
    "warranty_days",
    "warranty_type",
    "is_sealed",
    "has_original_box",
    "featured",
    "status",
    "moderation",
    "feedback",
    "version",
    "views",
    "contact_leads",
    "created_at",
    "published_at",
)


def ordered_media(listing):
    links = getattr(listing, "_prefetched_objects_cache", {}).get("media_links")
    if links is None:
        return list(listing.media_links.select_related("asset").order_by("position"))
    return sorted(links, key=lambda link: link.position)


def listing_data(listing, include_merchant_meta=False):
    from core.common.domain import DomainError
    from core.media.storage import storage

    provider = None
    if include_merchant_meta:
        try:
            provider = storage()
        except DomainError:
            provider = None
    used_av = listing.used_availability
    if listing.condition == "used" and not used_av:
        used_av = "available" if listing.quantity > 0 else "sold"
    media_items = []
    for link in ordered_media(listing):
        item = {
            "id": link.asset_id,
            "kind": link.asset.kind,
            "status": link.asset.status,
        }
        if (
            include_merchant_meta
            and provider is not None
            and link.asset.status == "ready"
            and link.asset.processed_key
        ):
            try:
                item["url"] = provider.public_url(link.asset.processed_key)
                item["thumbnail_url"] = (
                    provider.public_url(link.asset.thumbnail_key)
                    if link.asset.thumbnail_key
                    else ""
                )
            except DomainError:
                pass
        media_items.append(item)
    base = {
        **{key: getattr(listing, key) for key in FIELDS},
        "used_availability": used_av,
        "currency": "SDG",
        "media_status": media_items,
    }
    if include_merchant_meta:
        variant = listing.variant
        history = [
            {
                "id": ph.pk,
                "price": ph.price,
                "changed_by": ph.actor.first_name or ph.actor.username,
                "created_at": ph.created_at,
            }
            for ph in PriceHistory.objects.select_related("actor")
            .filter(listing=listing)
            .order_by("-pk")[:20]
        ]
        base.update(
            {
                "brand": variant.model.brand.name,
                "model": variant.model.name,
                "storage_gb": variant.storage_gb,
                "ram_gb": variant.ram_gb,
                "color": variant.color,
                "price_history": history,
            }
        )
    return base


def invariant(data, creation=False):
    price = Decimal(str(data["price"]))
    require(
        price.is_finite()
        and price > 0
        and price < Decimal("1000000000000")
        and price.as_tuple().exponent >= -2,
        "INVALID_PRICE",
    )
    require(
        type(data["quantity"]) is int and 0 <= data["quantity"] <= 1000000,
        "INVALID_QUANTITY",
    )
    if creation:
        require(data["quantity"] > 0, "INVALID_QUANTITY")
    require(data["condition"] in ["new", "used"], "INVALID_CONDITION")
    if data["condition"] == "used":
        require(
            data["quantity"] <= 1
            and data.get("grade") in ["like_new", "excellent", "good", "fair"],
            "INVALID_USED_UNIT",
        )
        require(
            "defects" in data
            and "battery_health" in data
            and "has_original_box" in data
            and data.get("warranty_days") is not None,
            "INCOMPLETE_USED_UNIT",
        )
        battery = data.get("battery_health")
        require(
            battery is None or type(battery) is int and 50 <= battery <= 100,
            "INVALID_BATTERY",
        )
        require(
            not data.get("is_sealed") and data.get("warranty_months") is None,
            "INVALID_USED_UNIT",
        )
    else:
        require(
            data.get("is_sealed") is True and data.get("warranty_months") is not None,
            "INCOMPLETE_NEW_STOCK",
        )
        require(
            not data.get("defects")
            and data.get("grade", "new") == "new"
            and data.get("battery_health", 100) == 100
            and data.get("warranty_days") is None,
            "INVALID_NEW_STOCK",
        )


def fingerprint(data):
    return hashlib.sha256(
        json.dumps(data, cls=DjangoJSONEncoder, sort_keys=True).encode()
    ).hexdigest()


def previous(actor, store, operation, key, data):
    require(isinstance(key, str) and 1 <= len(key) <= 128, "IDEMPOTENCY_KEY_REQUIRED")
    mutation = Mutation.objects.filter(
        actor=actor, store=store, operation=operation, key=key
    ).first()
    if mutation:
        require(mutation.fingerprint == fingerprint(data), "IDEMPOTENCY_CONFLICT", 409)
        return mutation.result


def remember(actor, store, operation, key, data, result):
    snapshot = json.loads(json.dumps(result, cls=DjangoJSONEncoder))
    Mutation.objects.create(
        actor=actor,
        store=store,
        operation=operation,
        key=key,
        fingerprint=fingerprint(data),
        result=snapshot,
    )
    return snapshot


def ready(listing):
    links = list(listing.media_links.select_related("asset").all())
    return bool(links) and all(link.asset.status == "ready" for link in links)


def publish_ready(store):
    # Caller holds the store lock. Eligibility is also rechecked on every public read.
    if store.status != "verified":
        return
    for listing in Listing.objects.select_for_update().filter(
        store=store, status="processing"
    ):
        if ready(listing):
            listing.status, listing.published_at = "published", timezone.now()
            listing.save(update_fields=["status", "published_at"])
            record(store.owner, "listing.published", listing.pk)


@transaction.atomic
def create_listing(actor, data, key):
    store = member_store(actor, verified=True, lock=True)
    operation = "listing.create"
    replay = previous(actor, store, operation, key, data)
    if replay is not None:
        return replay
    require(
        set(data)
        <= {
            "variant_id",
            "condition",
            "price",
            "quantity",
            "media",
            "grade",
            "battery_health",
            "defects",
            "replaced_parts",
            "used_unit_code",
            "used_availability",
            "warranty_months",
            "warranty_days",
            "warranty_type",
            "is_sealed",
            "has_original_box",
            "featured",
        },
        "INVALID_MUTATION",
    )
    invariant(data, creation=True)
    require(
        Variant.objects.filter(pk=data["variant_id"]).exists(), "VARIANT_NOT_FOUND", 404
    )
    ids = data["media"]
    assets = list(
        MediaAsset.objects.filter(
            pk__in=ids,
            store=store,
            purpose="listing",
            status__in=["awaiting", "queued", "ready"],
        )
    )
    require(
        len(assets) == len(ids)
        and not ListingMedia.objects.filter(asset_id__in=ids).exists(),
        "INVALID_MEDIA",
    )
    kinds = {a.kind for a in assets}
    require(
        ({"front", "back"} <= kinds and bool({"screen", "screen_on"} & kinds))
        if data["condition"] == "used"
        else "seal" in kinds,
        "MISSING_PHOTOS",
    )
    values = {k: v for k, v in data.items() if k != "media"}
    if data["condition"] == "new":
        values.update(grade="new", battery_health=100, used_availability="")
    elif not values.get("used_availability"):
        values["used_availability"] = "available" if values["quantity"] > 0 else "sold"
    listing = Listing.objects.create(store=store, **values)
    ListingMedia.objects.bulk_create(
        [
            ListingMedia(listing=listing, asset_id=asset_id, position=n)
            for n, asset_id in enumerate(ids)
        ]
    )
    PriceHistory.objects.create(listing=listing, actor=actor, price=listing.price)
    record(actor, "listing.created", listing.pk)
    publish_ready(store)
    listing.refresh_from_db()
    return remember(
        actor,
        store,
        operation,
        key,
        data,
        listing_data(listing, include_merchant_meta=True),
    )


@transaction.atomic
def update_listing(actor, listing_id, data, key, operation):
    store = member_store(actor, verified=True, lock=True)
    route = f"listing.{operation}.{listing_id}"
    replay = previous(actor, store, route, key, data)
    if replay is not None:
        return replay
    listing = (
        Listing.objects.select_for_update().filter(store=store, pk=listing_id).first()
    )
    require(listing is not None, "NOT_FOUND", 404)
    require(listing.version == data["version"], "STALE_VERSION", 409)
    allowed = {
        "price": {"price"},
        "stock": {"quantity", "used_availability"},
        "edit": {
            "grade",
            "battery_health",
            "defects",
            "replaced_parts",
            "used_unit_code",
            "warranty_months",
            "warranty_days",
            "warranty_type",
            "has_original_box",
            "featured",
            "media",
        },
    }
    require(
        operation in allowed
        and set(data) - {"version"} <= allowed[operation]
        and len(data) > 1,
        "INVALID_MUTATION",
    )
    merged = {**listing_data(listing), **data}
    invariant(merged)
    if "media" in data:
        ids = data["media"]
        assets = list(
            MediaAsset.objects.filter(
                pk__in=ids,
                store=store,
                purpose="listing",
                status__in=["awaiting", "queued", "ready"],
            )
        )
        require(
            1 <= len(ids) <= 8
            and len(assets) == len(ids)
            and not ListingMedia.objects.filter(asset_id__in=ids)
            .exclude(listing=listing)
            .exists(),
            "INVALID_MEDIA",
        )
        kinds = {a.kind for a in assets}
        require(
            ({"front", "back"} <= kinds and bool({"screen", "screen_on"} & kinds))
            if listing.condition == "used"
            else "seal" in kinds,
            "MISSING_PHOTOS",
        )
        listing.media_links.all().delete()
        ListingMedia.objects.bulk_create(
            [
                ListingMedia(listing=listing, asset_id=asset_id, position=n)
                for n, asset_id in enumerate(ids)
            ]
        )
        if listing.status != "removed":
            listing.status, listing.moderation = "processing", "pending"
    for name, value in data.items():
        if name not in ["version", "media"]:
            setattr(listing, name, value)
    if operation == "stock" and listing.condition == "used":
        if "used_availability" in data:
            listing.used_availability = data["used_availability"]
            if data["used_availability"] in ("reserved", "sold"):
                listing.quantity = 0
            else:
                listing.quantity = 1
        else:
            listing.used_availability = "available" if listing.quantity > 0 else "sold"
    if listing.moderation == "flagged":
        listing.moderation = "pending"
    listing.version += 1
    listing.save()
    publish_ready(store)
    listing.refresh_from_db()
    if operation == "price":
        PriceHistory.objects.create(listing=listing, actor=actor, price=listing.price)
    record(actor, f"listing.{operation}", listing.pk, version=listing.version)
    return remember(
        actor,
        store,
        route,
        key,
        data,
        listing_data(listing, include_merchant_meta=True),
    )


def merchant_list(actor, query):
    store = member_store(actor)
    qs = (
        Listing.objects.select_related("variant__model__brand")
        .prefetch_related("media_links__asset")
        .filter(store=store)
        .order_by("-pk")[query["offset"] : query["offset"] + query["limit"]]
    )
    return [listing_data(l, include_merchant_meta=True) for l in qs]


def merchant_status(actor, listing_id):
    store = member_store(actor)
    listing = (
        Listing.objects.select_related("variant__model__brand")
        .prefetch_related("media_links__asset")
        .filter(pk=listing_id, store=store)
        .first()
    )
    require(listing is not None, "NOT_FOUND", 404)
    return listing_data(listing, include_merchant_meta=True)


def moderation_queue(actor, query):
    require_admin(actor, "moderate_listings")
    qs = (
        Listing.objects.select_related("variant__model__brand")
        .prefetch_related("media_links__asset")
        .filter(status="published", moderation__in=["pending", "flagged"])
        .order_by("pk")[query["offset"] : query["offset"] + query["limit"]]
    )
    return [listing_data(l, include_merchant_meta=True) for l in qs]


@transaction.atomic
def moderate(actor, listing_id, data, actor_ip=None):
    require_admin(actor, "moderate_listings")
    target = Listing.objects.filter(pk=listing_id).first()
    require(target is not None, "NOT_FOUND", 404)
    store = Store.objects.select_for_update().get(pk=target.store_id)
    require_admin(actor, "moderate_listings", lock=True)
    listing = Listing.objects.select_for_update().get(pk=listing_id)
    require(store.owner_id != actor.pk, "SELF_REVIEW_FORBIDDEN", 403)
    require(listing.version == data["version"], "STALE_VERSION", 409)
    action = data["action"]
    if action == "suspend_store":
        from core.operations.services import request_suspension

        return {
            "listing": listing_data(listing, include_merchant_meta=True),
            "approval": request_suspension(
                actor, store, data["reason"], actor_ip=actor_ip
            ),
        }
    if action == "remove":
        listing.status, listing.moderation = "removed", "removed"
    elif action == "restore":
        require(store.status == "verified" and ready(listing), "NOT_READY", 409)
        listing.status, listing.moderation = "published", "approved"
    elif action == "approve":
        require(listing.status == "published", "INVALID_STATE", 409)
        listing.moderation = "approved"
    elif action == "flag":
        require(listing.status == "published", "INVALID_STATE", 409)
        listing.moderation = "flagged"
    else:
        require(False, "INVALID_ACTION")
    listing.feedback = data["reason"] if action in ["flag", "remove"] else ""
    listing.version += 1
    listing.save()
    record(
        actor,
        "listing.moderated",
        listing.pk,
        decision=action,
        reason=data["reason"],
        actor_ip=actor_ip,
    )
    return {"listing": listing_data(listing, include_merchant_meta=True), "approval": None}
