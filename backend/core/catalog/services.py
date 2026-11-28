from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Min, Q
from django.utils.text import slugify
from core.common.domain import DomainError, require
from core.stores.services import member_store
from core.common.public_cache import cached
from core.operations.audit import record
from core.operations.authorization import require_admin
from .models import Brand, PhoneModel, Variant


def choices(actor, kind, query, public=False):
    if not public:
        member_store(actor, verified=True)
    if kind == "categories":
        return [{"id": "phones", "name": "Phones"}]
    if public and kind == "brands":
        term = (query.get("q") or "").strip()
        def _brands():
            qs = Brand.objects.annotate(model_count=Count("phonemodel")).order_by("name", "pk")
            if term:
                qs = qs.filter(Q(name__icontains=term) | Q(name_ar__icontains=term))
            rows = list(qs.values("id", "name", "slug", "name_ar", "model_count")[
                query["offset"]:query["offset"] + query["limit"]
            ])
            for row in rows:
                if not row["slug"]:
                    row["slug"] = slugify(row["name"])
            return rows
        return _brands() if term else cached(f"brands_v2:{query['offset']}:{query['limit']}", _brands)
    term = (query.get("q") or "").strip()
    if kind == "brands":
        queryset = Brand.objects.order_by("name", "pk")
        if term:
            queryset = queryset.filter(Q(name__icontains=term) | Q(name_ar__icontains=term))
    elif kind == "models":
        queryset = PhoneModel.objects.select_related("brand").order_by("name", "pk")
        if "brand_id" in query:
            queryset = queryset.filter(brand_id=query["brand_id"])
        if term:
            queryset = queryset.filter(Q(name__icontains=term) | Q(brand__name__icontains=term))
    else:
        queryset = Variant.objects.order_by("storage_gb", "ram_gb", "color", "pk")
        if "model_id" in query:
            queryset = queryset.filter(model_id=query["model_id"])
    return queryset[query["offset"] : query["offset"] + query["limit"]]


def public_models(query):
    from core.discovery.queries import visible_listings
    from core.operations.models import Rating

    qs = PhoneModel.objects.select_related("brand").order_by("pk")
    if "brand_id" in query:
        qs = qs.filter(brand_id=query["brand_id"])
    if "brand" in query:
        slug = query["brand"].lower()
        qs = qs.filter(Q(brand__slug__iexact=slug) | Q(brand__name__iexact=slug))
    if "q" in query:
        term = query["q"].strip()
        if term:
            qs = qs.filter(Q(name__icontains=term) | Q(brand__name__icontains=term))

    models = list(qs[query["offset"] : query["offset"] + query["limit"]])
    if not models:
        return []
    model_ids = [m.pk for m in models]

    vis = visible_listings().filter(variant__model_id__in=model_ids)
    if "city" in query:
        vis = vis.filter(store__city=query["city"])
    listing_stats = {
        row["variant__model_id"]: row
        for row in vis.values("variant__model_id").annotate(
            listing_count=Count("id"), min_price=Min("price")
        )
    }
    rating_stats = {
        row["phone_model_id"]: row
        for row in Rating.objects.filter(
            target_type="phone_model", phone_model_id__in=model_ids
        )
        .values("phone_model_id")
        .annotate(rating_average=Avg("stars"), rating_count=Count("id"))
    }

    result = []
    for m in models:
        lstat = listing_stats.get(m.pk, {})
        rstat = rating_stats.get(m.pk, {})
        avg = rstat.get("rating_average")
        result.append(
            {
                "id": m.pk,
                "brand_id": m.brand_id,
                "brand": m.brand.name,
                "name": m.name,
                "specifications": m.specifications,
                "listing_count": lstat.get("listing_count", 0),
                "min_price": lstat.get("min_price"),
                "rating_average": round(avg, 2) if avg is not None else None,
                "rating_count": rstat.get("rating_count", 0),
            }
        )
    return result


def _invalidate_brand_cache():
    try:
        cache.clear()
    except Exception:
        pass


def _public_model_item(model):
    from core.discovery.queries import visible_listings
    from core.operations.models import Rating

    vis = visible_listings().filter(variant__model_id=model.pk)
    lstat = vis.aggregate(listing_count=Count("id"), min_price=Min("price"))
    rstat = Rating.objects.filter(
        Q(target_type="phone_model", phone_model_id=model.pk)
        | Q(target_type="listing", listing__variant__model_id=model.pk)
    ).aggregate(rating_average=Avg("stars"), rating_count=Count("id"))
    avg = rstat.get("rating_average")
    return {
        "id": model.pk,
        "brand_id": model.brand_id,
        "brand": model.brand.name,
        "name": model.name,
        "specifications": model.specifications,
        "listing_count": lstat.get("listing_count") or 0,
        "min_price": lstat.get("min_price"),
        "rating_average": round(avg, 2) if avg is not None else None,
        "rating_count": rstat.get("rating_count") or 0,
    }


@transaction.atomic
def create_brand(actor, data, actor_ip=None):
    require_admin(actor, "moderate_listings")
    name = data["name"].strip()
    require(bool(name), "VALIDATION_ERROR")
    name_ar = (data.get("name_ar") or name).strip()
    slug = slugify(name) or f"brand-{Brand.objects.count() + 1}"
    require(
        not Brand.objects.filter(Q(name__iexact=name) | Q(slug__iexact=slug)).exists(),
        "DUPLICATE_BRAND",
        409,
    )
    try:
        brand = Brand.objects.create(name=name, slug=slug, name_ar=name_ar)
    except IntegrityError:
        raise DomainError("DUPLICATE_BRAND", 409) from None
    _invalidate_brand_cache()
    record(actor, "catalog.brand_created", brand.pk, name=name, actor_ip=actor_ip)
    return {
        "id": brand.pk,
        "name": brand.name,
        "slug": brand.slug,
        "name_ar": brand.name_ar,
        "model_count": 0,
    }


@transaction.atomic
def create_model(actor, data, actor_ip=None):
    require_admin(actor, "moderate_listings")
    brand = Brand.objects.filter(pk=data["brand_id"]).first()
    require(brand is not None, "INVALID_BRAND", 400)
    name = data["name"].strip()
    require(bool(name), "VALIDATION_ERROR")
    require(
        not PhoneModel.objects.filter(brand=brand, name__iexact=name).exists(),
        "DUPLICATE_MODEL",
        409,
    )
    is_apple = (brand.slug or brand.name).lower() == "apple"
    specs = {
        "release_year": int(data.get("release_year") or 2025),
        "series": (data.get("series") or "").strip() or brand.name,
        "display": {
            "size_inches": float(data.get("display_size") or 6.7),
            "type": (data.get("display_type") or "AMOLED").strip(),
            "resolution": "1080 x 2400",
            "refresh_rate_hz": 120,
        },
        "performance": {
            "chipset": (data.get("chipset") or "Snapdragon 8 Gen 3").strip(),
            "os": "iOS 18" if is_apple else "Android 15",
        },
        "camera": {
            "rear_main_mp": int(data.get("camera_mp") or 50),
            "rear": f"{int(data.get('camera_mp') or 50)}MP Main",
            "rear_ois": True,
            "front": "16MP",
            "video": "4K@60fps",
        },
        "battery": {
            "capacity_mah": int(data.get("battery_mah") or 5000),
            "charging_wired_w": 45,
            "charging_wireless_w": 15,
        },
        "connectivity": {
            "network": "5G / 4G LTE",
            "sim": "Dual SIM",
            "nfc": True,
            "usb": "USB-C",
            "headphone_jack": False,
            "microsd": False,
        },
        "build": {"fingerprint": "Face ID" if is_apple else "In-display", "ip_rating": "IP68"},
    }
    model = PhoneModel.objects.create(brand=brand, name=name, specifications=specs)
    variants_input = data.get("variants") or [
        {"storage_gb": 128, "ram_gb": 8, "color": "Black"},
        {"storage_gb": 256, "ram_gb": 12, "color": "Titanium"},
    ]
    for v in variants_input:
        Variant.objects.get_or_create(
            model=model,
            storage_gb=v["storage_gb"],
            ram_gb=v["ram_gb"],
            color=(v.get("color") or "Black").strip() or "Black",
        )
    _invalidate_brand_cache()
    record(actor, "catalog.model_created", model.pk, brand=brand.name, name=name, actor_ip=actor_ip)
    return _public_model_item(model)


@transaction.atomic
def update_model(actor, model_id, data, actor_ip=None):
    require_admin(actor, "moderate_listings")
    model = PhoneModel.objects.select_for_update().select_related("brand").filter(pk=model_id).first()
    require(model is not None, "NOT_FOUND", 404)
    if "name" in data and data["name"].strip():
        model.name = data["name"].strip()
    specs = dict(model.specifications or {})
    if "release_year" in data:
        specs["release_year"] = int(data["release_year"])
    if "display_size" in data or "display_type" in data:
        disp = dict(specs.get("display") or {})
        if "display_size" in data:
            disp["size_inches"] = float(data["display_size"])
        if "display_type" in data:
            disp["type"] = data["display_type"].strip()
        specs["display"] = disp
    if "chipset" in data:
        perf = dict(specs.get("performance") or {})
        perf["chipset"] = data["chipset"].strip()
        specs["performance"] = perf
    if "camera_mp" in data:
        cam = dict(specs.get("camera") or {})
        cam["rear_main_mp"] = int(data["camera_mp"])
        specs["camera"] = cam
    if "battery_mah" in data:
        bat = dict(specs.get("battery") or {})
        bat["capacity_mah"] = int(data["battery_mah"])
        specs["battery"] = bat
    model.specifications = specs
    model.save()
    _invalidate_brand_cache()
    record(actor, "catalog.model_updated", model.pk, name=model.name, actor_ip=actor_ip)
    return _public_model_item(model)


@transaction.atomic
def delete_model(actor, model_id, actor_ip=None):
    from core.listings.models import Listing

    require_admin(actor, "moderate_listings")
    model = PhoneModel.objects.select_for_update().filter(pk=model_id).first()
    require(model is not None, "NOT_FOUND", 404)
    require(
        not Listing.objects.filter(variant__model=model).exists(),
        "MODEL_IN_USE",
        409,
    )
    Variant.objects.filter(model=model).delete()
    model.delete()
    _invalidate_brand_cache()
    record(actor, "catalog.model_deleted", model_id, actor_ip=actor_ip)
    return {"deleted": True}
