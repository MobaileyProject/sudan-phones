from django.db import transaction
from django.db.models import Q, F
from core.common.domain import require
from core.listings.services import listing_data
from core.media.storage import storage
from core.catalog.models import Brand
from .queries import visible_listings, visible_stores


def public_listing(listing):
    provider = storage()
    variant = listing.variant
    return {
        **listing_data(listing),
        "brand": variant.model.brand.name,
        "model": variant.model.name,
        "storage_gb": variant.storage_gb,
        "ram_gb": variant.ram_gb,
        "color": variant.color,
        "specifications": variant.model.specifications,
        "store_name": listing.store.name,
        "city": listing.store.city,
        "media": [
            {
                "id": link.asset_id,
                "kind": link.asset.kind,
                "url": provider.public_url(link.asset.processed_key),
                "thumbnail_url": provider.public_url(link.asset.thumbnail_key),
            }
            for link in sorted(
                listing.media_links.all(), key=lambda link: link.position
            )
        ],
    }


def store_data(store):
    return {
        key: getattr(store, key)
        for key in ["id", "name", "city", "address", "opening_hours"]
    } | {"verified": True}


def search(query, store_id=None, variant_id=None, related_id=None, count_search=False):
    listings = visible_listings()
    if store_id is not None:
        public_store(store_id)
        listings = listings.filter(store_id=store_id)
    if variant_id is not None:
        listings = listings.filter(variant_id=variant_id)
    if related_id is not None:
        target = listings.filter(pk=related_id).first()
        require(target is not None, "NOT_FOUND", 404)
        listings = listings.filter(
            store__city=target.store.city, variant__model_id=target.variant.model_id
        ).exclude(pk=related_id)
    filters = {
        "brand_id": "variant__model__brand_id",
        "model_id": "variant__model_id",
        "condition": "condition",
        "city": "store__city",
        "min_price": "price__gte",
        "max_price": "price__lte",
        "storage_gb": "variant__storage_gb",
    }
    for key, field in filters.items():
        if key in query:
            listings = listings.filter(**{field: query[key]})
    if "q" in query:
        listings = listings.filter(
            Q(variant__model__name__icontains=query["q"])
            | Q(variant__model__brand__name__icontains=query["q"])
        )
    ordering = {"latest": "-created_at", "price_asc": "price", "price_desc": "-price"}[
        query.get("sort", "latest")
    ]
    if count_search:
        from core.operations.models import DailyMetrics
        from django.utils import timezone

        with transaction.atomic():
            metric, _ = DailyMetrics.objects.get_or_create(day=timezone.localdate())
            DailyMetrics.objects.filter(pk=metric.pk).update(searches=F("searches") + 1)
    count = listings.count()
    rows = listings.order_by(ordering, "pk")[
        query["offset"] : query["offset"] + query["limit"]
    ]
    return {
        "data": [public_listing(l) for l in rows],
        "meta": {"count": count, "limit": query["limit"], "offset": query["offset"]},
    }


def detail(listing_id, count_view=True):
    listing = visible_listings().filter(pk=listing_id).first()
    require(listing is not None, "NOT_FOUND", 404)
    result = public_listing(listing)
    if count_view:
        # Aggregate requests only; no guest identifiers, IPs, cookies or personal data.
        visible_listings().filter(pk=listing.pk).update(views=F("views") + 1)
    return result


def public_store(store_id):
    store = visible_stores().filter(pk=store_id).first()
    require(store is not None, "NOT_FOUND", 404)
    return store_data(store)


def featured(query):
    # Deterministic organic order; there is no ratings/paid-promotion subsystem.
    return [
        store_data(s)
        for s in visible_stores().order_by("pk")[
            query["offset"] : query["offset"] + query["limit"]
        ]
    ]


def home():
    latest = visible_listings().order_by("-created_at", "pk")[:8]
    deals = visible_listings().order_by("price", "pk")[:8]
    return {
        "brands": list(Brand.objects.order_by("name").values("id", "name")[:20]),
        "latest": [public_listing(l) for l in latest],
        "top_deals": [public_listing(l) for l in deals],
        "stores": featured({"limit": 8, "offset": 0}),
    }
