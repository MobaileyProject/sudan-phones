from decimal import Decimal
from rest_framework import serializers
from core.common.serializers import StrictSerializer


class CreateInput(StrictSerializer):
    variant_id = serializers.IntegerField(min_value=1, required=False)
    model_id = serializers.IntegerField(min_value=1, required=False)
    storage_gb = serializers.IntegerField(min_value=4, max_value=4096, required=False)
    ram_gb = serializers.IntegerField(min_value=1, max_value=64, required=False)
    color = serializers.CharField(max_length=80, allow_blank=True, required=False)
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
    replaced_parts = serializers.CharField(
        max_length=500, allow_blank=True, required=False
    )
    used_unit_code = serializers.CharField(
        max_length=40, allow_blank=True, required=False
    )
    used_availability = serializers.ChoiceField(
        choices=["available", "reserved", "sold"], required=False
    )
    warranty_months = serializers.IntegerField(
        min_value=0, max_value=120, required=False
    )
    warranty_days = serializers.IntegerField(min_value=0, max_value=365, required=False)
    warranty_type = serializers.CharField(
        max_length=120, allow_blank=True, required=False
    )
    is_sealed = serializers.BooleanField(required=False)
    has_original_box = serializers.BooleanField(required=False)
    used_checklist = serializers.DictField(
        child=serializers.BooleanField(), required=False, allow_null=True
    )
    featured = serializers.BooleanField(required=False)
    accepts_trade_in = serializers.BooleanField(required=False)
    usd_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
        allow_null=True,
        required=False,
    )

    def validate(self, attrs):
        if not attrs.get("variant_id"):
            if not (attrs.get("model_id") and attrs.get("storage_gb") and attrs.get("ram_gb")):
                raise serializers.ValidationError(
                    "Provide either variant_id or (model_id, storage_gb, ram_gb)."
                )
        return attrs


class PriceInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01")
    )


class StockInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=0, max_value=1000000)
    used_availability = serializers.ChoiceField(
        choices=["available", "reserved", "sold"], required=False
    )


class StatusInput(StrictSerializer):
    status = serializers.ChoiceField(choices=["paused", "published"])
    version = serializers.IntegerField(min_value=1, required=False)


class EditInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1, required=False)
    price = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
    )
    storage_gb = serializers.IntegerField(min_value=4, max_value=4096, required=False)
    ram_gb = serializers.IntegerField(min_value=1, max_value=64, required=False)
    color = serializers.CharField(max_length=80, allow_blank=True, required=False)
    quantity = serializers.IntegerField(min_value=0, max_value=1000000, required=False)
    used_availability = serializers.ChoiceField(
        choices=["available", "reserved", "sold"], required=False
    )
    is_sealed = serializers.BooleanField(required=False)
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
    replaced_parts = serializers.CharField(
        max_length=500, allow_blank=True, required=False
    )
    used_unit_code = serializers.CharField(
        max_length=40, allow_blank=True, required=False
    )
    warranty_months = serializers.IntegerField(
        min_value=0, max_value=120, required=False
    )
    warranty_days = serializers.IntegerField(min_value=0, max_value=365, required=False)
    warranty_type = serializers.CharField(
        max_length=120, allow_blank=True, required=False
    )
    has_original_box = serializers.BooleanField(required=False)
    used_checklist = serializers.DictField(
        child=serializers.BooleanField(), required=False, allow_null=True
    )
    featured = serializers.BooleanField(required=False)
    accepts_trade_in = serializers.BooleanField(required=False)
    usd_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
        allow_null=True,
        required=False,
    )


class ModerateInput(StrictSerializer):
    version = serializers.IntegerField(min_value=1)
    action = serializers.ChoiceField(
        choices=["approve", "clear", "flag", "remove", "restore", "suspend_store"]
    )
    reason = serializers.CharField(max_length=1000, allow_blank=True)

    def validate(self, attrs):
        if attrs["action"] == "clear":
            attrs["action"] = "approve"
        if attrs["action"] != "approve" and not attrs["reason"].strip():
            raise serializers.ValidationError("Reason required.")
        return attrs


class MediaStatus(serializers.Serializer):
    id = serializers.UUIDField()
    kind = serializers.CharField()
    status = serializers.CharField()
    url = serializers.URLField(required=False, allow_blank=True)
    thumbnail_url = serializers.URLField(required=False, allow_blank=True)


class PriceHistoryItem(serializers.Serializer):
    id = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=14, decimal_places=2)
    changed_by = serializers.CharField()
    created_at = serializers.DateTimeField()


class ListingData(serializers.Serializer):
    id = serializers.IntegerField()
    store_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    condition = serializers.CharField()
    currency = serializers.CharField()
    media_status = MediaStatus(many=True)
    price = serializers.DecimalField(max_digits=14, decimal_places=2)
    previous_price = serializers.DecimalField(
        max_digits=14, decimal_places=2, allow_null=True, required=False, default=None
    )
    price_dropped = serializers.BooleanField(default=False)
    usd_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True, required=False, default=None
    )
    accepts_trade_in = serializers.BooleanField(default=False)
    quantity = serializers.IntegerField()
    grade = serializers.CharField()
    battery_health = serializers.IntegerField(allow_null=True)
    defects = serializers.CharField()
    replaced_parts = serializers.CharField(default="")
    used_unit_code = serializers.CharField(default="")
    used_availability = serializers.CharField(default="")
    warranty_months = serializers.IntegerField(allow_null=True)
    warranty_days = serializers.IntegerField(allow_null=True)
    warranty_type = serializers.CharField(default="")
    is_sealed = serializers.BooleanField()
    has_original_box = serializers.BooleanField()
    used_checklist = serializers.JSONField(allow_null=True, required=False, default=None)
    featured = serializers.BooleanField(default=False)
    status = serializers.CharField()
    moderation = serializers.CharField()
    version = serializers.IntegerField()
    views = serializers.IntegerField(default=0)
    contact_leads = serializers.IntegerField(default=0)
    created_at = serializers.DateTimeField(required=False, allow_null=True)
    published_at = serializers.DateTimeField(required=False, allow_null=True)


class MerchantListingData(ListingData):
    feedback = serializers.CharField(default="")
    brand = serializers.CharField(default="")
    model = serializers.CharField(default="")
    storage_gb = serializers.IntegerField(default=0)
    ram_gb = serializers.IntegerField(default=0)
    color = serializers.CharField(default="")
    price_history = PriceHistoryItem(many=True, default=list)


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


class BulkPriceInput(StrictSerializer):
    mode = serializers.ChoiceField(choices=["percent", "usd_rate"])
    percent = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        min_value=Decimal("-90"),
        max_value=Decimal("500"),
        required=False,
    )
    usd_rate = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("1"),
        required=False,
    )
    condition_scope = serializers.ChoiceField(
        choices=["all", "new", "used"], default="all"
    )
    condition = serializers.ChoiceField(
        choices=["all", "new", "used"], required=False
    )
    round_to = serializers.IntegerField(min_value=1, max_value=100000, default=1000)

    def validate(self, attrs):
        if "condition" in attrs:
            attrs["condition_scope"] = attrs.pop("condition")
        if attrs["mode"] == "percent" and attrs.get("percent") is None:
            raise serializers.ValidationError("percent is required when mode=percent.")
        if attrs["mode"] == "usd_rate" and attrs.get("usd_rate") is None:
            raise serializers.ValidationError("usd_rate is required when mode=usd_rate.")
        return attrs


class BulkPriceData(serializers.Serializer):
    updated_count = serializers.IntegerField()


class BulkPriceResponse(serializers.Serializer):
    data = BulkPriceData()


class BulkImportRowInput(StrictSerializer):
    listing_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    brand = serializers.CharField(max_length=80, required=False, allow_blank=True)
    model = serializers.CharField(max_length=120, required=False, allow_blank=True)
    storage_gb = serializers.IntegerField(min_value=4, max_value=4096, required=False)
    ram_gb = serializers.IntegerField(min_value=1, max_value=64, default=8, required=False)
    color = serializers.CharField(max_length=80, allow_blank=True, default="Standard", required=False)
    condition = serializers.ChoiceField(choices=["new", "used"], default="new", required=False)
    price = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01"), required=False
    )
    usd_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
        allow_null=True,
        required=False,
    )
    quantity = serializers.IntegerField(min_value=0, max_value=1000000, required=False)
    accepts_trade_in = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if attrs.get("listing_id") is not None:
            return attrs
        missing = [k for k in ("brand", "model", "storage_gb", "price") if attrs.get(k) in (None, "")]
        if missing:
            raise serializers.ValidationError(
                f"Provide listing_id or all of {', '.join(missing)}."
            )
        attrs.setdefault("quantity", 1)
        return attrs


class BulkImportInput(StrictSerializer):
    rows = BulkImportRowInput(many=True, min_length=1, max_length=200)


class BulkImportData(serializers.Serializer):
    updated = serializers.IntegerField()
    skipped = serializers.IntegerField()
    updated_count = serializers.IntegerField()
    skipped_count = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField())


class BulkImportResponse(serializers.Serializer):
    data = BulkImportData()


class ArchiveData(serializers.Serializer):
    archived = serializers.BooleanField()
    id = serializers.IntegerField()


class ArchiveResponse(serializers.Serializer):
    data = ArchiveData()
