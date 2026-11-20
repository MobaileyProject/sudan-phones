"""One authoritative public eligibility predicate across all public surfaces."""

from django.db.models import Exists, OuterRef
from core.listings.models import Listing, ListingMedia
from core.stores.models import Store


def visible_listings():
    media = ListingMedia.objects.filter(listing_id=OuterRef("pk"))
    invalid = media.exclude(asset__status="ready")
    return (
        Listing.objects.filter(
            store__status="verified",
            store__owner__is_active=True,
            status="published",
            quantity__gt=0,
        )
        .annotate(_has_media=Exists(media), _invalid_media=Exists(invalid))
        .filter(_has_media=True, _invalid_media=False)
        .select_related("store", "variant__model__brand")
        .prefetch_related("media_links__asset")
    )


def visible_stores():
    return Store.objects.filter(status="verified", owner__is_active=True)


def filter_terms(listings, text):
    from django.db.models import Q
    from core.catalog.models import Brand, PhoneModel

    for term in dict.fromkeys(text.split()):
        models = PhoneModel.objects.filter(name__icontains=term).values("pk")
        brands = Brand.objects.filter(name__icontains=term).values("pk")
        listings = listings.filter(
            Q(variant__model_id__in=models) | Q(variant__model__brand_id__in=brands)
        )
    return listings
