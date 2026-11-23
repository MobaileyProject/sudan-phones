from django.conf import settings
from django.db import models


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
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ratings"
    )
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
                    models.Q(target_type="store", store__isnull=False, phone_model__isnull=True)
                    | models.Q(target_type="phone_model", phone_model__isnull=False, store__isnull=True)
                ),
                name="rating_exactly_one_target",
            ),
            models.UniqueConstraint(
                fields=["author", "store"],
                condition=models.Q(store__isnull=False),
                name="unique_author_store_rating",
            ),
            models.UniqueConstraint(
                fields=["author", "phone_model"],
                condition=models.Q(phone_model__isnull=False),
                name="unique_author_model_rating",
            ),
        ]
        indexes = [
            models.Index(fields=["store", "-created_at"]),
            models.Index(fields=["phone_model", "-created_at"]),
        ]
