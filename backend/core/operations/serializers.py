from rest_framework import serializers
from core.common.serializers import StrictSerializer, PageQuery

from .policy import PERMISSIONS


class RoleInput(StrictSerializer):
    id = serializers.IntegerField(min_value=1, required=False)
    version = serializers.IntegerField(min_value=1, required=False)
    name = serializers.CharField(max_length=80)
    description = serializers.CharField(
        max_length=300, allow_blank=True, required=False, default=""
    )
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=PERMISSIONS), max_length=len(PERMISSIONS)
    )
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), max_length=100, required=False
    )

    def validate(self, attrs):
        if "id" in attrs and "version" not in attrs:
            raise serializers.ValidationError("Version required for updates.")
        return attrs


class RoleData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField(default="")
    permissions = serializers.ListField(child=serializers.CharField())
    version = serializers.IntegerField()
    user_ids = serializers.ListField(child=serializers.IntegerField())


class RoleResponse(serializers.Serializer):
    data = RoleData()


class RoleListResponse(serializers.Serializer):
    data = RoleData(many=True)
    available_permissions = serializers.ListField(child=serializers.CharField())


class ApprovalQuery(PageQuery):
    status = serializers.ChoiceField(
        choices=["pending", "approved", "rejected", "all"], default="pending"
    )


class ApprovalDecision(StrictSerializer):
    decision = serializers.ChoiceField(
        choices=["approve", "approved", "reject", "rejected"]
    )
    version = serializers.IntegerField(min_value=1)

    def validate_decision(self, value):
        return {"approved": "approve", "rejected": "reject"}.get(value, value)


class ApprovalData(serializers.Serializer):
    id = serializers.IntegerField()
    requested_by_id = serializers.IntegerField()
    requested_by_name = serializers.CharField(default="")
    decided_by_id = serializers.IntegerField(allow_null=True)
    decided_by_name = serializers.CharField(default="")
    operation = serializers.CharField()
    target_id = serializers.IntegerField()
    target_version = serializers.IntegerField()
    reason = serializers.CharField()
    status = serializers.CharField()
    version = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    decided_at = serializers.DateTimeField(allow_null=True)


class ApprovalResponse(serializers.Serializer):
    data = ApprovalData()


class ApprovalListResponse(serializers.Serializer):
    data = ApprovalData(many=True)


class AuditQuery(PageQuery):
    action = serializers.CharField(max_length=80, required=False)
    actor_id = serializers.IntegerField(min_value=1, required=False)
    resource = serializers.CharField(max_length=100, required=False)
    q = serializers.CharField(max_length=120, required=False)


class AuditData(serializers.Serializer):
    actor_ip = serializers.IPAddressField(allow_null=True)
    id = serializers.IntegerField()
    actor_id = serializers.IntegerField()
    actor_name = serializers.CharField(default="")
    action = serializers.CharField()
    resource = serializers.CharField()
    metadata = serializers.JSONField()
    created_at = serializers.DateTimeField()


class AuditResponse(serializers.Serializer):
    data = AuditData(many=True)


class DailyPoint(serializers.Serializer):
    day = serializers.DateField()
    count = serializers.IntegerField()


class DashboardData(serializers.Serializer):
    active_listings = serializers.IntegerField()
    out_of_stock = serializers.IntegerField()
    views = serializers.IntegerField()
    contact_leads = serializers.IntegerField()
    daily_views = DailyPoint(many=True, default=list)


class DashboardResponse(serializers.Serializer):
    data = DashboardData()


class OverviewData(DashboardData):
    stores = serializers.IntegerField()
    verified_stores = serializers.IntegerField()
    pending_verifications = serializers.IntegerField()
    open_reports = serializers.IntegerField(default=0)
    daily_searches = serializers.IntegerField()
    daily_searches_trend = DailyPoint(many=True, default=list)


class OverviewResponse(serializers.Serializer):
    data = OverviewData()


class ContactData(serializers.Serializer):
    phone_url = serializers.CharField()
    whatsapp_url = serializers.URLField()


class ContactResponse(serializers.Serializer):
    data = ContactData()


class ContactInput(StrictSerializer):
    event_id = serializers.UUIDField()
    method = serializers.ChoiceField(choices=["whatsapp", "phone"])


REPORT_REASONS = [
    "misleading_price",
    "fake_or_counterfeit",
    "wrong_condition_specs",
    "already_sold",
    "suspicious_photos",
    "fraud_or_scam",
    "wrong_location_hours",
    "unresponsive",
    "refused_warranty",
    "other",
]


class ReportInput(StrictSerializer):
    target_type = serializers.ChoiceField(choices=["listing", "store"])
    target_id = serializers.IntegerField(min_value=1)
    reason = serializers.ChoiceField(choices=REPORT_REASONS)
    details = serializers.CharField(max_length=2000)
    reporter_contact = serializers.CharField(
        max_length=120, allow_blank=True, required=False, default=""
    )

    def validate_details(self, value):
        if not value.strip():
            raise serializers.ValidationError("Details required.")
        return value.strip()


class ReportQuery(PageQuery):
    status = serializers.ChoiceField(
        choices=["open", "reviewed", "dismissed", "all"], default="open"
    )


class ReportResolveInput(StrictSerializer):
    status = serializers.ChoiceField(choices=["reviewed", "dismissed"])
    resolution_note = serializers.CharField(
        max_length=1000, allow_blank=True, required=False, default=""
    )
    flag_listing = serializers.BooleanField(required=False, default=False)


class ReportData(serializers.Serializer):
    id = serializers.IntegerField()
    target_type = serializers.CharField()
    listing_id = serializers.IntegerField(allow_null=True)
    store_id = serializers.IntegerField(allow_null=True)
    reason = serializers.CharField()
    details = serializers.CharField()
    reporter_contact = serializers.CharField()
    status = serializers.CharField()
    resolution_note = serializers.CharField()
    resolved_by_id = serializers.IntegerField(allow_null=True)
    created_at = serializers.DateTimeField()
    resolved_at = serializers.DateTimeField(allow_null=True)


class ReportResponse(serializers.Serializer):
    data = ReportData()


class ReportListResponse(serializers.Serializer):
    data = ReportData(many=True)


class RatingInput(StrictSerializer):
    stars = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(
        max_length=1000, allow_blank=True, required=False, default=""
    )


class RatingData(serializers.Serializer):
    id = serializers.IntegerField()
    target_type = serializers.CharField()
    target_id = serializers.IntegerField()
    author_id = serializers.IntegerField()
    author_name = serializers.CharField()
    stars = serializers.IntegerField()
    comment = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class RatingSummaryData(serializers.Serializer):
    average = serializers.FloatField(allow_null=True)
    count = serializers.IntegerField()
    distribution = serializers.DictField(child=serializers.IntegerField())


class RatingResponse(serializers.Serializer):
    data = RatingData()


class RatingListResponse(serializers.Serializer):
    data = RatingData(many=True)
    summary = RatingSummaryData()


class SuspendStoreInput(StrictSerializer):
    reason = serializers.CharField(max_length=1000)

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError("Reason required.")
        return value.strip()


class AdminUserData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.CharField()
    phone = serializers.CharField()
    is_superuser = serializers.BooleanField()
    role_id = serializers.IntegerField(allow_null=True)
    role_name = serializers.CharField()
    permissions = serializers.ListField(child=serializers.CharField())


class AdminUserListResponse(serializers.Serializer):
    data = AdminUserData(many=True)


class FavoriteListResponse(serializers.Serializer):
    data = serializers.ListField(child=serializers.IntegerField())


class FavoriteActionData(serializers.Serializer):
    listing_id = serializers.IntegerField()
    saved = serializers.BooleanField()


class FavoriteActionResponse(serializers.Serializer):
    data = FavoriteActionData()
