from django.db import transaction
from django.db.models import F
from core.common.domain import require
from core.listings.services import listing_data
from core.media.storage import storage
from core.catalog.models import Brand
from core.common.public_cache import cached
from .queries import visible_listings, visible_stores, filter_terms


def public_listing(listing):
    provider = storage()
    variant = listing.variant
    public_data = listing_data(listing)
    public_data.pop("feedback", None)
    return {
        **public_data,
        "brand": variant.model.brand.name,
        "brand_slug": variant.model.brand.slug or variant.model.brand.name.lower(),
        "brand_name_ar": variant.model.brand.name_ar or variant.model.brand.name,
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
    from django.db.models import Avg, Count
    from core.operations.models import Rating

    stats = Rating.objects.filter(target_type="store", store_id=store.pk).aggregate(
        avg=Avg("stars"), count=Count("id")
    )
    return {
        key: getattr(store, key)
        for key in [
            "id",
            "name",
            "city",
            "address",
            "location_guidance",
            "description",
            "banner_url",
            "latitude",
            "longitude",
            "opening_hours",
            "contact_available",
            "accepts_trade_in",
        ]
    } | {
        "verified": True,
        "rating_average": round(stats["avg"], 2) if stats["avg"] is not None else None,
        "rating_count": stats["count"] or 0,
    }


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
        "ram_gb": "variant__ram_gb",
        "accepts_trade_in": "accepts_trade_in",
    }
    for key, field in filters.items():
        if key in query:
            listings = listings.filter(**{field: query[key]})
    if query.get("has_discount"):
        from django.db.models import F as DbF

        listings = listings.filter(previous_price__isnull=False, previous_price__gt=DbF("price"))
    if "brand" in query:
        from django.db.models import Q

        slug = query["brand"].lower()
        listings = listings.filter(
            Q(variant__model__brand__slug__iexact=slug)
            | Q(variant__model__brand__name__iexact=slug)
        )
    if "q" in query:
        listings = filter_terms(listings, query["q"])
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
        from core.operations.models import StoreDailyMetrics
        from django.utils import timezone

        visible_listings().filter(pk=listing.pk).update(views=F("views") + 1)
        metric, _ = StoreDailyMetrics.objects.get_or_create(
            store_id=listing.store_id, day=timezone.localdate()
        )
        StoreDailyMetrics.objects.filter(pk=metric.pk).update(views=F("views") + 1)
    return result


def public_store(store_id):
    store = visible_stores().filter(pk=store_id).first()
    require(store is not None, "NOT_FOUND", 404)
    return store_data(store)


def featured(query, city=None):
    # Deterministic organic order; there is no paid-promotion subsystem.
    stores = visible_stores()
    if city:
        stores = stores.filter(city=city)
    return [
        store_data(s)
        for s in stores.order_by("pk")[
            query["offset"] : query["offset"] + query["limit"]
        ]
    ]


def home_section(name, ordering, city=None):
    def candidates():
        qs = visible_listings()
        if city:
            qs = qs.filter(store__city=city)
        return list(qs.order_by(ordering, "pk").values_list("pk", flat=True)[:8])

    cache_key = f"home:{name}:{city or 'all'}"
    ids = cached(cache_key, candidates)
    # Cached IDs are ranking hints only. Never serve cached eligibility or fields.
    base = visible_listings()
    if city:
        base = base.filter(store__city=city)
    rows = list(base.filter(pk__in=ids).order_by(ordering, "pk"))
    if len(rows) < len(ids):
        # Refill immediately when an item disappears, without waiting for the TTL.
        rows = list(base.order_by(ordering, "pk")[:8])
    return [public_listing(listing) for listing in rows]


def home(city=None):
    from django.utils.text import slugify

    def _brands():
        rows = list(Brand.objects.order_by("name").values("id", "name", "slug", "name_ar")[:20])
        for row in rows:
            if not row["slug"]:
                row["slug"] = slugify(row["name"])
        return rows

    return {
        "brands": cached("home:brands", _brands),
        "latest": home_section("latest", "-created_at", city=city),
        "top_deals": home_section("deals", "price", city=city),
        "stores": featured({"limit": 8, "offset": 0}, city=city),
    }
