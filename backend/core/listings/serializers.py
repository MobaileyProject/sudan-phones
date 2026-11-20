from decimal import Decimal
from rest_framework import serializers
from core.common.serializers import StrictSerializer


class CreateInput(StrictSerializer):
    variant_id = serializers.IntegerField(min_value=1)
    condition = serializers.ChoiceField(choices=["new", "used"])
    price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01")
    )
    quantity = serializers.IntegerField(min_value=1, max_value=1000000)
    media = serializers.ListField(
        child=serializers.UUIDField(), min_length=1, max_length=8
    )
    grade = serializers.ChoiceField(
        choices=["like_new", "excellent", "good", "fair"], required=False
    )
    battery_health = serializers.IntegerField(
        min_value=50, max_value=100, allow_null=True, required=False
    )
    defects = serializers.CharField(max_length=2000, allow_blank=True, required=False)
    warranty_months = serializers.IntegerField(
        min_value=0, max_value=120, required=False
    )
    warranty_days = serializers.IntegerField(min_value=0, max_value=365, required=False)
    is_sealed = serializers.BooleanField(required=False)
    has_original_box = serializers.BooleanField(required=False)


class PriceInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01")
    )


class StockInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=0, max_value=1000000)


class EditInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1)
    media = serializers.ListField(
        child=serializers.UUIDField(), min_length=1, max_length=8, required=False
    )
    grade = serializers.ChoiceField(
        choices=["like_new", "excellent", "good", "fair"], required=False
    )
    battery_health = serializers.IntegerField(
        min_value=50, max_value=100, allow_null=True, required=False
    )
    defects = serializers.CharField(max_length=2000, allow_blank=True, required=False)
    warranty_months = serializers.IntegerField(
        min_value=0, max_value=120, required=False
    )
    warranty_days = serializers.IntegerField(min_value=0, max_value=365, required=False)
    has_original_box = serializers.BooleanField(required=False)


class ModerateInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1)
    action = serializers.ChoiceField(
        choices=["approve", "flag", "remove", "restore", "suspend_store"]
    )
    reason = serializers.CharField(max_length=1000, allow_blank=True)

    def validate(self, attrs):
        if attrs["action"] != "approve" and not attrs["reason"].strip():
            raise serializers.ValidationError("Reason required.")
        return attrs


class MediaStatus(serializers.Serializer):
    id = serializers.UUIDField()
    kind = serializers.CharField()
    status = serializers.CharField()


class ListingData(serializers.Serializer):
    id = serializers.IntegerField()
    store_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    condition = serializers.CharField()
    currency = serializers.CharField()
    media_status = MediaStatus(many=True)
    price = serializers.DecimalField(max_digits=14, decimal_places=2)
    quantity = serializers.IntegerField()
    grade = serializers.CharField()
    battery_health = serializers.IntegerField(allow_null=True)
    defects = serializers.CharField()
    warranty_months = serializers.IntegerField(allow_null=True)
    warranty_days = serializers.IntegerField(allow_null=True)
    is_sealed = serializers.BooleanField()
    has_original_box = serializers.BooleanField()
    status = serializers.CharField()
    moderation = serializers.CharField()
    version = serializers.IntegerField()


class MerchantListingData(ListingData):
    feedback = serializers.CharField(default="")


class ListingResponse(serializers.Serializer):
    data = MerchantListingData()


class ListingListResponse(serializers.Serializer):
    data = MerchantListingData(many=True)


from core.operations.serializers import ApprovalData


class ModerationData(serializers.Serializer):
    listing = MerchantListingData()
    approval = ApprovalData(allow_null=True)


class ModerationResponse(serializers.Serializer):
    data = ModerationData()
