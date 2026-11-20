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
