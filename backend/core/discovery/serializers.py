from decimal import Decimal
from rest_framework import serializers
from core.bootstrap.services import CITY_IDS
from core.common.serializers import PageQuery
from core.bootstrap.serializers import StrictQuerySerializer
from core.listings.serializers import ListingData
from core.catalog.serializers import BrandData


class HomeQuery(StrictQuerySerializer):
    city = serializers.ChoiceField(choices=CITY_IDS, required=False)


class SearchQuery(PageQuery, StrictQuerySerializer):
    q = serializers.CharField(max_length=120, required=False)
    brand_id = serializers.IntegerField(min_value=1, required=False)
    brand = serializers.SlugField(max_length=80, required=False)
    model_id = serializers.IntegerField(min_value=1, required=False)
    condition = serializers.ChoiceField(choices=["new", "used"], required=False)
    city = serializers.ChoiceField(choices=CITY_IDS, required=False)
    min_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )
    max_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )
    storage_gb = serializers.IntegerField(min_value=1, max_value=4096, required=False)
    accepts_trade_in = serializers.BooleanField(required=False)
    sort = serializers.ChoiceField(
        choices=["latest", "newest", "price_asc", "price_desc"], default="latest"
    )

    def validate(self, attrs):
        if attrs.get("sort") == "newest":
            attrs["sort"] = "latest"
        if attrs.get("min_price", 0) > attrs.get(
            "max_price", Decimal("999999999999.99")
        ):
            raise serializers.ValidationError("Invalid price range.")
        return attrs


class PublicMedia(serializers.Serializer):
    id = serializers.UUIDField()
    kind = serializers.CharField()
    url = serializers.URLField()
    thumbnail_url = serializers.URLField()


class PublicListing(ListingData):
    brand = serializers.CharField()
    brand_slug = serializers.CharField(default="")
    brand_name_ar = serializers.CharField(default="")
    model = serializers.CharField()
    storage_gb = serializers.IntegerField()
    ram_gb = serializers.IntegerField()
    color = serializers.CharField()
    specifications = serializers.JSONField()
    store_name = serializers.CharField()
    city = serializers.CharField()
    media = PublicMedia(many=True)


class MetaData(serializers.Serializer):
    count = serializers.IntegerField()
    limit = serializers.IntegerField()
    offset = serializers.IntegerField()


class SearchResponse(serializers.Serializer):
    data = PublicListing(many=True)
    meta = MetaData()


class DetailResponse(serializers.Serializer):
    data = PublicListing()


class PublicStore(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    city = serializers.CharField()
    address = serializers.CharField()
    location_guidance = serializers.CharField(default="")
    description = serializers.CharField(default="")
    banner_url = serializers.CharField(default="")
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, allow_null=True, required=False, default=None
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, allow_null=True, required=False, default=None
    )
    opening_hours = serializers.CharField()
    contact_available = serializers.BooleanField(default=True)
    accepts_trade_in = serializers.BooleanField(default=False)
    verified = serializers.BooleanField()
    rating_average = serializers.FloatField(allow_null=True, default=None)
    rating_count = serializers.IntegerField(default=0)


class StoreDetailResponse(serializers.Serializer):
    data = PublicStore()


class FeaturedResponse(serializers.Serializer):
    data = PublicStore(many=True)


class HomeData(serializers.Serializer):
    brands = BrandData(many=True)
    latest = PublicListing(many=True)
    top_deals = PublicListing(many=True)
    stores = PublicStore(many=True)


class HomeResponse(serializers.Serializer):
    data = HomeData()
