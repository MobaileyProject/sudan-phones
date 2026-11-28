from decimal import Decimal
import hashlib
import json
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.db.models import Case, Value, When
from django.utils import timezone
from core.common.domain import require
from core.stores.services import member_store
from core.stores.models import Store
from core.catalog.models import PhoneModel, Variant
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
    "previous_price",
    "usd_price",
    "accepts_trade_in",
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
    "used_checklist",
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
        "price_dropped": bool(
            listing.previous_price is not None and listing.previous_price > listing.price
        ),
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
            "model_id",
            "storage_gb",
            "ram_gb",
            "color",
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
            "used_checklist",
            "featured",
            "accepts_trade_in",
            "usd_price",
        },
        "INVALID_MUTATION",
    )
    invariant(data, creation=True)
    custom_color = (data.get("color") or "").strip()[:80]
    if data.get("variant_id"):
        base_variant = Variant.objects.filter(pk=data["variant_id"]).first()
        require(base_variant is not None, "VARIANT_NOT_FOUND", 404)
        if custom_color and custom_color != base_variant.color:
            resolved_variant, _ = Variant.objects.get_or_create(
                model_id=base_variant.model_id,
                storage_gb=base_variant.storage_gb,
                ram_gb=base_variant.ram_gb,
                color=custom_color,
            )
            resolved_variant_id = resolved_variant.pk
        else:
            resolved_variant_id = base_variant.pk
    else:
        require(
            data.get("model_id") and data.get("storage_gb") and data.get("ram_gb"),
            "INVALID_MUTATION",
        )
        require(
            PhoneModel.objects.filter(pk=data["model_id"]).exists(),
            "MODEL_NOT_FOUND",
            404,
        )
        resolved_variant, _ = Variant.objects.get_or_create(
            model_id=data["model_id"],
            storage_gb=data["storage_gb"],
            ram_gb=data["ram_gb"],
            color=custom_color or "Standard",
        )
        resolved_variant_id = resolved_variant.pk
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
    values = {
        k: v
        for k, v in data.items()
        if k not in {"media", "model_id", "storage_gb", "ram_gb", "color"}
    }
    values["variant_id"] = resolved_variant_id
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
        Listing.objects.select_for_update()
        .select_related("variant")
        .filter(store=store, pk=listing_id)
        .first()
    )
    require(listing is not None, "NOT_FOUND", 404)
    if operation != "edit" or "version" in data:
        require("version" in data and listing.version == data["version"], "STALE_VERSION", 409)
    allowed = {
        "price": {"price"},
        "stock": {"quantity", "used_availability"},
        "edit": {
            "price",
            "storage_gb",
            "ram_gb",
            "color",
            "quantity",
            "used_availability",
            "is_sealed",
            "grade",
            "battery_health",
            "defects",
            "replaced_parts",
            "used_unit_code",
            "warranty_months",
            "warranty_days",
            "warranty_type",
            "has_original_box",
            "used_checklist",
            "featured",
            "accepts_trade_in",
            "usd_price",
            "media",
        },
    }
    require(
        operation in allowed
        and set(data) - {"version"} <= allowed[operation]
        and len(set(data) - {"version"}) >= 1,
        "INVALID_MUTATION",
    )
    invariant_input = {
        **listing_data(listing),
        **{
            k: v
            for k, v in data.items()
            if k not in {"storage_gb", "ram_gb", "color", "used_checklist"}
        },
    }
    if operation == "edit" and listing.condition == "new":
        # New stock invariant requires is_sealed=True in DB constraint.
        invariant_input["is_sealed"] = True
    invariant(invariant_input)
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
    if any(k in data for k in ("storage_gb", "ram_gb", "color")):
        cur_var = listing.variant
        new_storage = data.get("storage_gb", cur_var.storage_gb)
        new_ram = data.get("ram_gb", cur_var.ram_gb)
        new_color = (data.get("color") or cur_var.color).strip()[:80] or cur_var.color
        resolved_variant, _ = Variant.objects.get_or_create(
            model_id=cur_var.model_id,
            storage_gb=new_storage,
            ram_gb=new_ram,
            color=new_color,
        )
        listing.variant = resolved_variant
    old_price = listing.price
    for name, value in data.items():
        if name not in ["version", "media", "storage_gb", "ram_gb", "color"]:
            if name == "is_sealed" and listing.condition == "new":
                continue
            setattr(listing, name, value)
    price_changed = (operation == "price" or "price" in data) and listing.price != old_price
    if price_changed:
        listing.previous_price = old_price
    if (operation == "stock" or "used_availability" in data or "quantity" in data) and listing.condition == "used":
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
    if price_changed or operation == "price":
        PriceHistory.objects.create(listing=listing, actor=actor, price=listing.price)
    if price_changed and listing.price < old_price:
        from core.operations.services import notify_price_drop

        notify_price_drop(listing, old_price, listing.price)
    record(actor, f"listing.{operation}", listing.pk, version=listing.version)
    return remember(
        actor,
        store,
        route,
        key,
        data,
        listing_data(listing, include_merchant_meta=True),
    )


@transaction.atomic
def set_listing_status(actor, listing_id, data):
    """Toggle a verified merchant's listing between published and paused."""
    store = member_store(actor, verified=True, lock=True)
    listing = (
        Listing.objects.select_for_update()
        .select_related("variant")
        .filter(store=store, pk=listing_id)
        .first()
    )
    require(listing is not None, "NOT_FOUND", 404)
    if "version" in data:
        require(listing.version == data["version"], "STALE_VERSION", 409)
    require(listing.status != "removed", "REMOVED_LISTING", 409)
    require(listing.moderation != "flagged", "FLAGGED_LISTING", 409)
    target = data["status"]
    if target == "published":
        require(ready(listing), "NOT_READY", 409)
        listing.status = "published"
        if listing.published_at is None:
            listing.published_at = timezone.now()
    else:
        require(
            listing.status in ("published", "paused"),
            "INVALID_STATUS_TRANSITION",
            409,
        )
        listing.status = "paused"
    listing.version += 1
    listing.save(update_fields=["status", "published_at", "version"])
    record(actor, f"listing.status.{listing.status}", listing.pk, version=listing.version)
    return listing_data(listing, include_merchant_meta=True)


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
        .annotate(
            _mod_priority=Case(When(moderation="flagged", then=Value(0)), default=Value(1))
        )
        .order_by("_mod_priority", "-pk")[query["offset"] : query["offset"] + query["limit"]]
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


@transaction.atomic
def archive_listing(actor, listing_id):
    store = member_store(actor, verified=True, lock=True)
    listing = (
        Listing.objects.select_for_update().filter(store=store, pk=listing_id).first()
    )
    require(listing is not None, "NOT_FOUND", 404)
    listing.status = "removed"
    listing.version += 1
    listing.save(update_fields=["status", "version"])
    record(actor, "listing.archived", listing.pk, version=listing.version)
    return {"archived": True, "id": listing.pk}


@transaction.atomic
def duplicate_listing(actor, listing_id):
    import uuid
    from datetime import timedelta

    store = member_store(actor, verified=True, lock=True)
    source = (
        Listing.objects.prefetch_related("media_links__asset")
        .filter(store=store, pk=listing_id)
        .exclude(status="removed")
        .first()
    )
    require(source is not None, "NOT_FOUND", 404)
    cloned = Listing.objects.create(
        store=store,
        variant=source.variant,
        condition=source.condition,
        price=source.price,
        previous_price=None,
        usd_price=source.usd_price,
        accepts_trade_in=source.accepts_trade_in,
        quantity=1 if source.condition == "used" else max(1, source.quantity),
        grade=source.grade,
        battery_health=source.battery_health,
        defects=source.defects,
        replaced_parts=source.replaced_parts,
        used_unit_code="",
        used_availability="available" if source.condition == "used" else "",
        warranty_months=source.warranty_months,
        warranty_days=source.warranty_days,
        warranty_type=source.warranty_type,
        is_sealed=source.is_sealed,
        has_original_box=source.has_original_box,
        used_checklist=source.used_checklist,
        featured=False,
        status=source.status,
        moderation="approved" if source.status == "published" else "pending",
        published_at=timezone.now() if source.status == "published" else None,
    )
    if cloned.condition == "used":
        cloned.used_unit_code = f"SD-{store.pk}{cloned.pk}"
        cloned.save(update_fields=["used_unit_code"])
    for link in ordered_media(source):
        src_asset = link.asset
        cloned_asset = MediaAsset.objects.create(
            id=uuid.uuid4(),
            store=store,
            purpose=src_asset.purpose,
            kind=src_asset.kind,
            content_type=src_asset.content_type,
            size=src_asset.size,
            sha256=src_asset.sha256,
            upload_key=f"dup/{uuid.uuid4()}",
            processed_key=src_asset.processed_key,
            thumbnail_key=src_asset.thumbnail_key,
            status=src_asset.status,
            expires_at=timezone.now() + timedelta(days=1),
        )
        ListingMedia.objects.create(listing=cloned, asset=cloned_asset, position=link.position)
    PriceHistory.objects.create(listing=cloned, actor=actor, price=cloned.price)
    record(actor, "listing.duplicated", cloned.pk, source_id=source.pk)
    return listing_data(cloned, include_merchant_meta=True)


@transaction.atomic
def bulk_update_prices(actor, data):
    from decimal import ROUND_HALF_UP
    from core.operations.services import notify_price_drop

    store = member_store(actor, verified=True, lock=True)
    qs = Listing.objects.select_for_update().filter(
        store=store, status__in=["published", "processing"]
    )
    scope = data.get("condition_scope", "all")
    if scope in ("new", "used"):
        qs = qs.filter(condition=scope)
    round_to = Decimal(str(data.get("round_to") or 1000))
    mode = data["mode"]
    updated = 0
    history_rows = []
    for listing in qs:
        if mode == "percent":
            factor = Decimal("1") + (Decimal(str(data["percent"])) / Decimal("100"))
            raw_new = listing.price * factor
        else:
            if not listing.usd_price:
                continue
            raw_new = listing.usd_price * Decimal(str(data["usd_rate"]))
        rounded = (raw_new / round_to).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * round_to
        if rounded <= 0:
            rounded = round_to
        if rounded != listing.price:
            old_price = listing.price
            listing.previous_price = old_price
            listing.price = rounded
            listing.version += 1
            listing.save(update_fields=["previous_price", "price", "version"])
            history_rows.append(PriceHistory(listing=listing, actor=actor, price=rounded))
            if rounded < old_price:
                notify_price_drop(listing, old_price, rounded)
            updated += 1
    if history_rows:
        PriceHistory.objects.bulk_create(history_rows)
    record(actor, "listing.bulk_price", store.pk, mode=mode, updated=updated)
    return {"updated_count": updated}


def _apply_bulk_import_row(existing, row, actor, history_rows):
    """Apply imported price, stock, USD reference, and trade-in updates to a locked listing."""
    if row.get("price") is not None:
        new_price = Decimal(str(row["price"]))
        if new_price != existing.price:
            existing.previous_price = existing.price
            existing.price = new_price
            history_rows.append(PriceHistory(listing=existing, actor=actor, price=new_price))
    if row.get("quantity") is not None:
        qty = row["quantity"]
        if existing.condition == "new":
            existing.quantity = qty
        else:
            existing.quantity = min(1, qty)
            existing.used_availability = "available" if existing.quantity > 0 else "sold"
    if "usd_price" in row:
        existing.usd_price = row["usd_price"]
    if "accepts_trade_in" in row:
        existing.accepts_trade_in = bool(row["accepts_trade_in"])
    existing.version += 1
    existing.save()


@transaction.atomic
def bulk_import_listings(actor, data):
    from core.catalog.models import Brand

    store = member_store(actor, verified=True, lock=True)
    updated = 0
    skipped = 0
    errors = []
    history_rows = []
    for idx, row in enumerate(data["rows"], start=1):
        listing_id = row.get("listing_id")
        if listing_id is not None:
            existing = (
                Listing.objects.select_for_update()
                .filter(pk=listing_id, store=store)
                .exclude(status="removed")
                .first()
            )
            if not existing:
                skipped += 1
                errors.append(f"Row {idx}: Listing #{listing_id} not found for this store.")
                continue
            _apply_bulk_import_row(existing, row, actor, history_rows)
            updated += 1
            continue

        brand_name = row["brand"].strip()
        model_name = row["model"].strip()
        brand = Brand.objects.filter(name__iexact=brand_name).first()
        if not brand:
            brand = Brand.objects.filter(name_ar__iexact=brand_name).first()
        if not brand:
            skipped += 1
            errors.append(f"Row {idx}: Unknown brand '{brand_name}'")
            continue
        model = PhoneModel.objects.filter(brand=brand, name__iexact=model_name).first()
        if not model:
            model = PhoneModel.objects.filter(brand=brand, name__icontains=model_name).first()
        if not model:
            skipped += 1
            errors.append(f"Row {idx}: Unknown model '{model_name}' for {brand.name}")
            continue
        color_val = (row.get("color") or "").strip()[:80] or "Standard"
        variant, _ = Variant.objects.get_or_create(
            model=model,
            storage_gb=row["storage_gb"],
            ram_gb=row["ram_gb"],
            color=color_val,
        )
        existing = (
            Listing.objects.select_for_update()
            .filter(store=store, variant=variant, condition=row["condition"])
            .exclude(status="removed")
            .first()
        )
        if existing:
            _apply_bulk_import_row(existing, row, actor, history_rows)
            updated += 1
        else:
            skipped += 1
            errors.append(
                f"Row {idx}: No existing listing found for {brand.name} {model.name} ({row['storage_gb']}GB/{row['ram_gb']}GB {color_val}); create it with photos first."
            )
    if history_rows:
        PriceHistory.objects.bulk_create(history_rows)
    record(actor, "listing.bulk_import", store.pk, updated=updated, skipped=skipped)
    return {
        "updated": updated,
        "skipped": skipped,
        "updated_count": updated,
        "skipped_count": skipped,
        "errors": errors[:25],
    }
