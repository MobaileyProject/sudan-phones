from django.db.models import Avg, Count, Min, Q
from django.utils.text import slugify
from core.stores.services import member_store
from core.common.public_cache import cached
from .models import Brand, PhoneModel, Variant


def choices(actor, kind, query, public=False):
    if not public:
        member_store(actor, verified=True)
    if kind == "categories":
        return [{"id": "phones", "name": "Phones"}]
    if public and kind == "brands":
        term = (query.get("q") or "").strip()
        def _brands():
            qs = Brand.objects.order_by("name", "pk")
            if term:
                qs = qs.filter(Q(name__icontains=term) | Q(name_ar__icontains=term))
            rows = list(qs.values("id", "name", "slug", "name_ar")[
                query["offset"]:query["offset"] + query["limit"]
            ])
            for row in rows:
                if not row["slug"]:
                    row["slug"] = slugify(row["name"])
            return rows
        return _brands() if term else cached(f"brands:{query['offset']}:{query['limit']}", _brands)
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
