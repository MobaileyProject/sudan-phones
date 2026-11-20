from decimal import Decimal
from rest_framework import serializers
from core.common.serializers import PageQuery
from core.bootstrap.serializers import StrictQuerySerializer
from core.listings.serializers import ListingData
from core.catalog.serializers import BrandData


class SearchQuery(PageQuery, StrictQuerySerializer):
    q = serializers.CharField(max_length=120, required=False)
    brand_id = serializers.IntegerField(min_value=1, required=False)
    model_id = serializers.IntegerField(min_value=1, required=False)
    condition = serializers.ChoiceField(choices=["new", "used"], required=False)
    city = serializers.ChoiceField(
        choices=["port_sudan", "khartoum", "omdurman"], required=False
    )
    min_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )
    max_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )
    storage_gb = serializers.IntegerField(min_value=1, max_value=4096, required=False)
    sort = serializers.ChoiceField(
        choices=["latest", "price_asc", "price_desc"], default="latest"
    )

    def validate(self, attrs):
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
    opening_hours = serializers.CharField()
    verified = serializers.BooleanField()


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
