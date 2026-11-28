from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditEvent(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    actor_ip = models.GenericIPAddressField(null=True)
    action = models.CharField(max_length=80, db_index=True)
    resource = models.CharField(max_length=100, db_index=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("Audit events are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Audit events are immutable.")


class AdminRole(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=300, blank=True)
    permissions = models.JSONField(default=list)
    version = models.PositiveIntegerField(default=1)


class RoleAssignment(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.ForeignKey(AdminRole, on_delete=models.PROTECT)


class DualApproval(models.Model):
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requested_approvals",
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        related_name="decided_approvals",
    )
    operation = models.CharField(max_length=32)
    target_id = models.PositiveBigIntegerField()
    target_version = models.PositiveIntegerField()
    reason = models.CharField(max_length=1000)
    status = models.CharField(max_length=16, default="pending", db_index=True)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(decided_by__isnull=True)
                | ~models.Q(decided_by=models.F("requested_by")),
                name="distinct_dual_approver",
            )
        ]


class ContactEvent(models.Model):
    event_id = models.UUIDField(unique=True)
    listing = models.ForeignKey("core.Listing", on_delete=models.PROTECT)
    method = models.CharField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True)


class DailyMetrics(models.Model):
    day = models.DateField(unique=True)
    searches = models.PositiveBigIntegerField(default=0)


class StoreDailyMetrics(models.Model):
    store = models.ForeignKey("core.Store", on_delete=models.CASCADE)
    day = models.DateField()
    views = models.PositiveBigIntegerField(default=0)
    contact_leads = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["store", "day"], name="unique_store_daily_metrics"
            )
        ]


class CustomerReport(models.Model):
    target_type = models.CharField(max_length=16, db_index=True)
    listing = models.ForeignKey(
        "core.Listing", null=True, blank=True, on_delete=models.PROTECT
    )
    store = models.ForeignKey(
        "core.Store", null=True, blank=True, on_delete=models.PROTECT
    )
    reason = models.CharField(max_length=32, db_index=True)
    details = models.CharField(max_length=2000)
    reporter_contact = models.CharField(max_length=120, blank=True)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="submitted_reports",
    )
    status = models.CharField(max_length=16, default="open", db_index=True)
    resolution_note = models.CharField(max_length=1000, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="resolved_reports",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(target_type="listing", listing__isnull=False, store__isnull=True)
                    | models.Q(target_type="store", store__isnull=False, listing__isnull=True)
                ),
                name="report_exactly_one_target",
            )
        ]


class Rating(models.Model):
    target_type = models.CharField(max_length=16, db_index=True)
    store = models.ForeignKey(
        "core.Store", null=True, blank=True, on_delete=models.CASCADE
    )
    phone_model = models.ForeignKey(
        "core.PhoneModel", null=True, blank=True, on_delete=models.CASCADE
    )
    listing = models.ForeignKey(
        "core.Listing", null=True, blank=True, on_delete=models.CASCADE
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="ratings",
    )
    author_name = models.CharField(max_length=120, blank=True, default="")
    stars = models.PositiveSmallIntegerField()
    comment = models.CharField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(stars__gte=1, stars__lte=5),
                name="rating_valid_stars",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        target_type="store",
                        store__isnull=False,
                        phone_model__isnull=True,
                        listing__isnull=True,
                    )
                    | models.Q(
                        target_type="phone_model",
                        phone_model__isnull=False,
                        store__isnull=True,
                        listing__isnull=True,
                    )
                    | models.Q(
                        target_type="listing",
                        listing__isnull=False,
                        store__isnull=True,
                    )
                ),
                name="rating_exactly_one_target",
            ),
            models.UniqueConstraint(
                fields=["author", "store"],
                condition=models.Q(author__isnull=False, store__isnull=False),
                name="unique_author_store_rating",
            ),
            models.UniqueConstraint(
                fields=["author", "phone_model"],
                condition=models.Q(
                    author__isnull=False, target_type="phone_model", phone_model__isnull=False
                ),
                name="unique_author_model_rating",
            ),
            models.UniqueConstraint(
                fields=["author", "listing"],
                condition=models.Q(author__isnull=False, listing__isnull=False),
                name="unique_author_listing_rating",
            ),
        ]
        indexes = [
            models.Index(fields=["store", "-created_at"]),
            models.Index(fields=["phone_model", "-created_at"]),
            models.Index(fields=["listing", "-created_at"]),
        ]


class Favorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites"
    )
    listing = models.ForeignKey(
        "core.Listing", on_delete=models.CASCADE, related_name="favorited_by"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "listing"], name="unique_user_listing_favorite"
            )
        ]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]


class PriceAlert(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="price_alerts",
    )
    visitor_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    listing = models.ForeignKey(
        "core.Listing", on_delete=models.CASCADE, related_name="price_alerts"
    )
    initial_price = models.DecimalField(max_digits=14, decimal_places=2)
    target_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "listing"],
                condition=models.Q(user__isnull=False),
                name="unique_user_price_alert",
            ),
            models.UniqueConstraint(
                fields=["visitor_id", "listing"],
                condition=models.Q(user__isnull=True) & ~models.Q(visitor_id=""),
                name="unique_visitor_price_alert",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["visitor_id", "-created_at"]),
        ]


class CustomerNotification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    visitor_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    type = models.CharField(max_length=32, db_index=True)
    title_ar = models.CharField(max_length=300)
    title_en = models.CharField(max_length=300)
    body_ar = models.TextField(blank=True, default="")
    body_en = models.TextField(blank=True, default="")
    listing = models.ForeignKey(
        "core.Listing", null=True, blank=True, on_delete=models.SET_NULL
    )
    store = models.ForeignKey(
        "core.Store", null=True, blank=True, on_delete=models.SET_NULL
    )
    thread_key = models.CharField(max_length=120, blank=True, default="", db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["visitor_id", "-created_at"]),
        ]


class StoreChatThread(models.Model):
    thread_key = models.CharField(max_length=120, unique=True)
    store = models.ForeignKey(
        "core.Store", on_delete=models.CASCADE, related_name="chat_threads"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="chat_threads",
    )
    visitor_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    customer_name = models.CharField(max_length=160, blank=True, default="")
    customer_phone = models.CharField(max_length=32, blank=True, default="")
    listing = models.ForeignKey(
        "core.Listing", null=True, blank=True, on_delete=models.SET_NULL
    )
    listing_title = models.CharField(max_length=240, blank=True, default="")
    listing_price_sdg = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    unread_by_store = models.PositiveIntegerField(default=0)
    unread_by_customer = models.PositiveIntegerField(default=0)
    last_message_text = models.TextField(blank=True, default="")
    last_message_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["store", "-last_message_at"]),
            models.Index(fields=["user", "-last_message_at"]),
            models.Index(fields=["visitor_id", "-last_message_at"]),
        ]


class StoreChatMessage(models.Model):
    thread = models.ForeignKey(
        StoreChatThread, on_delete=models.CASCADE, related_name="messages"
    )
    store = models.ForeignKey("core.Store", on_delete=models.CASCADE)
    sender_role = models.CharField(max_length=16)
    sender_name = models.CharField(max_length=160, blank=True, default="")
    sender_phone = models.CharField(max_length=32, blank=True, default="")
    text = models.TextField()
    listing_id = models.PositiveBigIntegerField(null=True, blank=True)
    listing_title = models.CharField(max_length=240, blank=True, default="")
    listing_price_sdg = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    is_auto_reply = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["thread", "created_at"]),
        ]


class SponsoredAd(models.Model):
    store = models.ForeignKey(
        "core.Store", on_delete=models.CASCADE, related_name="sponsored_ads"
    )
    listing = models.ForeignKey(
        "core.Listing", null=True, blank=True, on_delete=models.SET_NULL
    )
    title_ar = models.CharField(max_length=240)
    title_en = models.CharField(max_length=240)
    subtitle_ar = models.CharField(max_length=400, blank=True, default="")
    subtitle_en = models.CharField(max_length=400, blank=True, default="")
    cta_label_ar = models.CharField(max_length=80, blank=True, default="زيارة المتجر")
    cta_label_en = models.CharField(max_length=80, blank=True, default="Visit Store")
    badge_ar = models.CharField(max_length=80, blank=True, default="إعلان مموّل")
    badge_en = models.CharField(max_length=80, blank=True, default="Sponsored")
    image_url = models.CharField(max_length=500, blank=True, default="")
    target_city = models.CharField(max_length=32, default="all", db_index=True)
    status = models.CharField(max_length=16, default="active", db_index=True)
    priority = models.PositiveIntegerField(default=50)
    skip_delay_sec = models.PositiveSmallIntegerField(default=3)
    paid_amount_sdg = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=16, default="paid")
    payment_ref = models.CharField(max_length=100, blank=True, default="")
    requested_by_merchant = models.BooleanField(default=False)
    starts_at = models.DateField(db_index=True)
    ends_at = models.DateField(db_index=True)
    impressions = models.PositiveBigIntegerField(default=0)
    clicks = models.PositiveBigIntegerField(default=0)
    last_clicked_at = models.DateTimeField(null=True, blank=True)
    total_time_to_click_ms = models.PositiveBigIntegerField(default=0)
    timed_clicks = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)


class SponsoredAdDailyStat(models.Model):
    ad = models.ForeignKey(
        SponsoredAd, on_delete=models.CASCADE, related_name="daily_stats"
    )
    day = models.DateField()
    impressions = models.PositiveBigIntegerField(default=0)
    clicks = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["ad", "day"], name="unique_ad_daily_stat")
        ]
        indexes = [
            models.Index(fields=["ad", "day"]),
        ]
