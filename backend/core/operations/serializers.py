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
    flagged_listings = serializers.IntegerField(default=0)
    pending_approvals = serializers.IntegerField(default=0)
    open_reports = serializers.IntegerField(default=0)
    active_sponsored_ads = serializers.IntegerField(default=0)
    ad_revenue_sdg = serializers.FloatField(default=0)
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
    author_name = serializers.CharField(
        max_length=120, allow_blank=True, required=False, default=""
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


class ProductRatingData(serializers.Serializer):
    id = serializers.IntegerField()
    listing_id = serializers.IntegerField()
    model_id = serializers.IntegerField()
    brand_slug = serializers.CharField(default="")
    model_name = serializers.CharField(default="")
    store_id = serializers.IntegerField()
    store_name = serializers.CharField(default="")
    stars = serializers.IntegerField()
    author_name = serializers.CharField()
    comment = serializers.CharField(default="")
    created_at = serializers.DateTimeField()


class ProductRatingListResponse(serializers.Serializer):
    data = ProductRatingData(many=True)
    meta = serializers.DictField(required=False)


class ProductRatingCreateResponse(serializers.Serializer):
    data = ProductRatingData()
    meta = serializers.DictField(required=False)


class PriceAlertInput(StrictSerializer):
    listing_id = serializers.IntegerField(min_value=1)
    target_price_sdg = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )


class PriceAlertData(serializers.Serializer):
    id = serializers.IntegerField()
    listing_id = serializers.IntegerField()
    model = serializers.CharField()
    model_title = serializers.CharField()
    initial_price_sdg = serializers.FloatField()
    target_price_sdg = serializers.FloatField(allow_null=True)
    created_at = serializers.DateTimeField()


class PriceAlertResponse(serializers.Serializer):
    data = PriceAlertData()


class PriceAlertListResponse(serializers.Serializer):
    data = PriceAlertData(many=True)


class DeleteFlagResponse(serializers.Serializer):
    data = serializers.DictField()


class NotificationData(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.CharField()
    title_ar = serializers.CharField()
    title_en = serializers.CharField()
    body_ar = serializers.CharField()
    body_en = serializers.CharField()
    listing_id = serializers.IntegerField(allow_null=True)
    store_id = serializers.IntegerField(allow_null=True)
    thread_key = serializers.CharField(allow_null=True, required=False)
    read = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class NotificationListResponse(serializers.Serializer):
    data = NotificationData(many=True)


class ReadFlagResponse(serializers.Serializer):
    data = serializers.DictField()


class StoreMessageInput(StrictSerializer):
    text = serializers.CharField(max_length=2000)
    sender_name = serializers.CharField(
        max_length=160, allow_blank=True, required=False, default=""
    )
    sender_phone = serializers.CharField(
        max_length=32, allow_blank=True, required=False, default=""
    )
    listing_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    listing_title = serializers.CharField(
        max_length=240, allow_blank=True, required=False, default=""
    )
    listing_price_sdg = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )


class ChatMessageData(serializers.Serializer):
    id = serializers.CharField()
    store_id = serializers.IntegerField()
    sender_role = serializers.CharField()
    sender_name = serializers.CharField(default="")
    sender_phone = serializers.CharField(default="")
    text = serializers.CharField()
    listing_id = serializers.IntegerField(allow_null=True, required=False)
    listing_title = serializers.CharField(default="")
    listing_price_sdg = serializers.FloatField(allow_null=True, required=False)
    is_auto_reply = serializers.BooleanField(default=False)
    created_at = serializers.DateTimeField()


class StoreMessageListResponse(serializers.Serializer):
    data = ChatMessageData(many=True)


class StoreMessageSendResponse(serializers.Serializer):
    data = serializers.DictField()


class ChatThreadData(serializers.Serializer):
    thread_key = serializers.CharField()
    store_id = serializers.IntegerField()
    store_name = serializers.CharField(default="")
    store_phone = serializers.CharField(default="")
    customer_name = serializers.CharField(default="")
    customer_phone = serializers.CharField(default="")
    listing_id = serializers.IntegerField(allow_null=True, required=False)
    listing_title = serializers.CharField(default="")
    listing_price_sdg = serializers.FloatField(allow_null=True, required=False)
    unread_count = serializers.IntegerField()
    last_message_at = serializers.DateTimeField()
    last_message_text = serializers.CharField()
    messages = ChatMessageData(many=True)


class ChatThreadListResponse(serializers.Serializer):
    data = ChatThreadData(many=True)


class MerchantChatReplyInput(StrictSerializer):
    text = serializers.CharField(max_length=2000)


class SponsoredAdDailyStatData(serializers.Serializer):
    date = serializers.CharField()
    impressions = serializers.IntegerField()
    clicks = serializers.IntegerField()


class SponsoredAdData(serializers.Serializer):
    id = serializers.IntegerField()
    store_id = serializers.IntegerField()
    store_name = serializers.CharField()
    store_name_ar = serializers.CharField()
    store_name_en = serializers.CharField()
    listing_id = serializers.IntegerField(allow_null=True)
    title_ar = serializers.CharField()
    title_en = serializers.CharField()
    subtitle_ar = serializers.CharField(default="")
    subtitle_en = serializers.CharField(default="")
    cta_label_ar = serializers.CharField(default="زيارة المتجر")
    cta_label_en = serializers.CharField(default="Visit Store")
    badge_ar = serializers.CharField(default="")
    badge_en = serializers.CharField(default="")
    image_url = serializers.CharField(default="")
    target_city = serializers.CharField()
    status = serializers.CharField()
    priority = serializers.IntegerField()
    skip_delay_sec = serializers.IntegerField()
    paid_amount_sdg = serializers.FloatField()
    payment_status = serializers.CharField()
    payment_ref = serializers.CharField(default="")
    requested_by_merchant = serializers.BooleanField(default=False)
    starts_at = serializers.CharField()
    ends_at = serializers.CharField()
    impressions = serializers.IntegerField()
    clicks = serializers.IntegerField()
    ctr_pct = serializers.FloatField()
    last_clicked_at = serializers.DateTimeField(allow_null=True)
    avg_time_to_click_ms = serializers.IntegerField(allow_null=True)
    daily_stats = SponsoredAdDailyStatData(many=True)
    created_at = serializers.DateTimeField()


class SponsoredAdResponse(serializers.Serializer):
    data = SponsoredAdData()


class SponsoredAdListResponse(serializers.Serializer):
    data = SponsoredAdData(many=True)


class MerchantAdsSummaryResponse(serializers.Serializer):
    data = serializers.DictField()


class AdQuery(StrictSerializer):
    city = serializers.CharField(max_length=32, required=False, default="all")


class AdImpressionInput(StrictSerializer):
    city = serializers.CharField(max_length=32, allow_blank=True, required=False)
    locale = serializers.CharField(max_length=10, allow_blank=True, required=False)
    source = serializers.CharField(max_length=40, allow_blank=True, required=False)


class AdClickInput(StrictSerializer):
    city = serializers.CharField(max_length=32, allow_blank=True, required=False)
    locale = serializers.CharField(max_length=10, allow_blank=True, required=False)
    listing_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    time_to_click_ms = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    source = serializers.CharField(max_length=40, allow_blank=True, required=False)


class MerchantAdRequestInput(StrictSerializer):
    listing_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    title_ar = serializers.CharField(max_length=240, allow_blank=True, required=False, default="")
    title_en = serializers.CharField(max_length=240, allow_blank=True, required=False, default="")
    subtitle_ar = serializers.CharField(max_length=400, allow_blank=True, required=False, default="")
    subtitle_en = serializers.CharField(max_length=400, allow_blank=True, required=False, default="")
    target_city = serializers.CharField(max_length=32, required=False, default="all")
    duration_days = serializers.IntegerField(min_value=1, max_value=60, default=7)
    paid_amount_sdg = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )
    payment_ref = serializers.CharField(max_length=100, allow_blank=True, required=False, default="")
    image_url = serializers.CharField(max_length=500, allow_blank=True, required=False, default="")


class AdminAdInput(StrictSerializer):
    store_id = serializers.IntegerField(min_value=1)
    listing_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    title_ar = serializers.CharField(max_length=240, allow_blank=True, required=False, default="")
    title_en = serializers.CharField(max_length=240, allow_blank=True, required=False, default="")
    subtitle_ar = serializers.CharField(max_length=400, allow_blank=True, required=False, default="")
    subtitle_en = serializers.CharField(max_length=400, allow_blank=True, required=False, default="")
    cta_label_ar = serializers.CharField(max_length=80, allow_blank=True, required=False, default="زيارة المتجر")
    cta_label_en = serializers.CharField(max_length=80, allow_blank=True, required=False, default="Visit Store")
    badge_ar = serializers.CharField(max_length=80, allow_blank=True, required=False, default="")
    badge_en = serializers.CharField(max_length=80, allow_blank=True, required=False, default="")
    image_url = serializers.CharField(max_length=500, allow_blank=True, required=False, default="")
    target_city = serializers.CharField(max_length=32, required=False, default="all")
    status = serializers.ChoiceField(
        choices=["active", "paused", "scheduled", "ended"], default="active"
    )
    priority = serializers.IntegerField(min_value=1, max_value=100, default=50)
    skip_delay_sec = serializers.IntegerField(min_value=0, max_value=10, default=3)
    paid_amount_sdg = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, default=0
    )
    payment_status = serializers.ChoiceField(
        choices=["paid", "pending", "invoiced"], default="paid"
    )
    payment_ref = serializers.CharField(max_length=100, allow_blank=True, required=False, default="")
    starts_at = serializers.CharField(max_length=32, required=False, allow_blank=True)
    ends_at = serializers.CharField(max_length=32, required=False, allow_blank=True)


class AdminAdPatchInput(StrictSerializer):
    store_id = serializers.IntegerField(min_value=1, required=False)
    listing_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    title_ar = serializers.CharField(max_length=240, allow_blank=True, required=False)
    title_en = serializers.CharField(max_length=240, allow_blank=True, required=False)
    subtitle_ar = serializers.CharField(max_length=400, allow_blank=True, required=False)
    subtitle_en = serializers.CharField(max_length=400, allow_blank=True, required=False)
    cta_label_ar = serializers.CharField(max_length=80, allow_blank=True, required=False)
    cta_label_en = serializers.CharField(max_length=80, allow_blank=True, required=False)
    badge_ar = serializers.CharField(max_length=80, allow_blank=True, required=False)
    badge_en = serializers.CharField(max_length=80, allow_blank=True, required=False)
    image_url = serializers.CharField(max_length=500, allow_blank=True, required=False)
    target_city = serializers.CharField(max_length=32, required=False)
    status = serializers.ChoiceField(
        choices=["active", "paused", "scheduled", "ended"], required=False
    )
    priority = serializers.IntegerField(min_value=1, max_value=100, required=False)
    skip_delay_sec = serializers.IntegerField(min_value=0, max_value=10, required=False)
    paid_amount_sdg = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False
    )
    payment_status = serializers.ChoiceField(
        choices=["paid", "pending", "invoiced"], required=False
    )
    payment_ref = serializers.CharField(max_length=100, allow_blank=True, required=False)
    starts_at = serializers.CharField(max_length=32, required=False, allow_blank=True)
    ends_at = serializers.CharField(max_length=32, required=False, allow_blank=True)
