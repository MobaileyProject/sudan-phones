from rest_framework import serializers
from core.bootstrap.services import CITY_IDS
from core.common.serializers import PageQuery, StrictSerializer


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


class AdminBrandInput(StrictSerializer):
    name = serializers.CharField(max_length=80)
    name_ar = serializers.CharField(max_length=80, allow_blank=True, required=False, default="")


class AdminBrandResponse(serializers.Serializer):
    data = BrandData()


class AdminVariantInput(StrictSerializer):
    storage_gb = serializers.IntegerField(min_value=4, max_value=4096)
    ram_gb = serializers.IntegerField(min_value=1, max_value=64)
    color = serializers.CharField(max_length=80, allow_blank=True, default="Black")


class AdminModelInput(StrictSerializer):
    brand_id = serializers.IntegerField(min_value=1)
    name = serializers.CharField(max_length=120)
    release_year = serializers.IntegerField(min_value=2010, max_value=2035, required=False, default=2025)
    series = serializers.CharField(max_length=80, allow_blank=True, required=False, default="")
    display_size = serializers.FloatField(min_value=3.0, max_value=12.0, required=False, default=6.7)
    display_type = serializers.CharField(max_length=120, allow_blank=True, required=False, default="AMOLED")
    chipset = serializers.CharField(max_length=120, allow_blank=True, required=False, default="Snapdragon 8 Gen 3")
    camera_mp = serializers.IntegerField(min_value=1, max_value=400, required=False, default=50)
    battery_mah = serializers.IntegerField(min_value=500, max_value=20000, required=False, default=5000)
    variants = AdminVariantInput(many=True, required=False)


class AdminModelUpdateInput(StrictSerializer):
    name = serializers.CharField(max_length=120, required=False)
    release_year = serializers.IntegerField(min_value=2010, max_value=2035, required=False)
    display_size = serializers.FloatField(min_value=3.0, max_value=12.0, required=False)
    display_type = serializers.CharField(max_length=120, allow_blank=True, required=False)
    chipset = serializers.CharField(max_length=120, allow_blank=True, required=False)
    camera_mp = serializers.IntegerField(min_value=1, max_value=400, required=False)
    battery_mah = serializers.IntegerField(min_value=500, max_value=20000, required=False)


class AdminModelResponse(serializers.Serializer):
    data = PublicModelData()


class DeleteData(serializers.Serializer):
    deleted = serializers.BooleanField()


class DeleteResponse(serializers.Serializer):
    data = DeleteData()
