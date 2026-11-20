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
    "warranty_months",
    "warranty_days",
    "is_sealed",
    "has_original_box",
    "status",
    "moderation",
    "feedback",
    "version",
)


def listing_data(listing):
    return {
        **{key: getattr(listing, key) for key in FIELDS},
        "currency": "SDG",
        "media_status": [
            {"id": link.asset_id, "kind": link.asset.kind, "status": link.asset.status}
            for link in listing.media_links.select_related("asset").order_by("position")
        ],
    }


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
            "warranty_months",
            "warranty_days",
            "is_sealed",
            "has_original_box",
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
        ({"front", "back", "screen"} <= kinds)
        if data["condition"] == "used"
        else "seal" in kinds,
        "MISSING_PHOTOS",
    )
    values = {k: v for k, v in data.items() if k != "media"}
    if data["condition"] == "new":
        values.update(grade="new", battery_health=100)
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
    return remember(actor, store, operation, key, data, listing_data(listing))


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
        "stock": {"quantity"},
        "edit": {
            "grade",
            "battery_health",
            "defects",
            "warranty_months",
            "warranty_days",
            "has_original_box",
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
            ({"front", "back", "screen"} <= kinds)
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
    if listing.moderation == "flagged":
        listing.moderation = "pending"
    listing.version += 1
    listing.save()
    publish_ready(store)
    listing.refresh_from_db()
    if operation == "price":
        PriceHistory.objects.create(listing=listing, actor=actor, price=listing.price)
    record(actor, f"listing.{operation}", listing.pk, version=listing.version)
    return remember(actor, store, route, key, data, listing_data(listing))


def merchant_list(actor, query):
    store = member_store(actor)
    return [
        listing_data(l)
        for l in Listing.objects.filter(store=store).order_by("-pk")[
            query["offset"] : query["offset"] + query["limit"]
        ]
    ]


def merchant_status(actor, listing_id):
    store = member_store(actor)
    listing = Listing.objects.filter(pk=listing_id, store=store).first()
    require(listing is not None, "NOT_FOUND", 404)
    return listing_data(listing)


def moderation_queue(actor, query):
    require_admin(actor, "moderate_listings")
    return [
        listing_data(l)
        for l in Listing.objects.filter(
            status="published", moderation__in=["pending", "flagged"]
        ).order_by("pk")[query["offset"] : query["offset"] + query["limit"]]
    ]


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
            "listing": listing_data(listing),
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
    return {"listing": listing_data(listing), "approval": None}
