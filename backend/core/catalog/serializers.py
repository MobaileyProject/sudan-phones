from rest_framework import serializers
from core.common.serializers import PageQuery


class CatalogQuery(PageQuery):
    brand_id = serializers.IntegerField(min_value=1, required=False)
    model_id = serializers.IntegerField(min_value=1, required=False)


class BrandData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class BrandResponse(serializers.Serializer):
    data = BrandData(many=True)


class ModelData(BrandData):
    brand_id = serializers.IntegerField()
    specifications = serializers.JSONField()


class ModelResponse(serializers.Serializer):
    data = ModelData(many=True)


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
