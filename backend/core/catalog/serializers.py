from rest_framework import serializers
from core.bootstrap.services import CITY_IDS
from core.common.serializers import PageQuery


class CatalogQuery(PageQuery):
    brand_id = serializers.IntegerField(min_value=1, required=False)
    model_id = serializers.IntegerField(min_value=1, required=False)
    q = serializers.CharField(max_length=120, required=False)


class PublicModelQuery(PageQuery):
    brand_id = serializers.IntegerField(min_value=1, required=False)
    brand = serializers.SlugField(max_length=80, required=False)
    city = serializers.ChoiceField(choices=CITY_IDS, required=False)
    q = serializers.CharField(max_length=120, required=False)


class BrandData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField(required=False, default="")
    name_ar = serializers.CharField(required=False, default="")
    model_count = serializers.IntegerField(required=False, default=0)


class BrandResponse(serializers.Serializer):
    data = BrandData(many=True)


class ModelData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    brand_id = serializers.IntegerField()
    specifications = serializers.JSONField()


class PublicModelData(ModelData):
    brand = serializers.CharField()
    listing_count = serializers.IntegerField()
    min_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, allow_null=True
    )
    rating_average = serializers.FloatField(allow_null=True)
    rating_count = serializers.IntegerField()


class ModelResponse(serializers.Serializer):
    data = ModelData(many=True)


class PublicModelResponse(serializers.Serializer):
    data = PublicModelData(many=True)


class VariantData(serializers.Serializer):
    id = serializers.IntegerField()
    model_id = serializers.IntegerField()
    storage_gb = serializers.IntegerField()
    ram_gb = serializers.IntegerField()
    color = serializers.CharField()


class VariantResponse(serializers.Serializer):
    data = VariantData(many=True)


class CategoryData(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()


class CategoryResponse(serializers.Serializer):
    data = CategoryData(many=True)
