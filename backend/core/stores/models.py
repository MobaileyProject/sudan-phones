from django.conf import settings
from django.db import models


class Store(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    name = models.CharField(max_length=160, blank=True)
    city = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=300, blank=True)
    location_guidance = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    banner_url = models.URLField(max_length=500, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    phone = models.CharField(max_length=16, blank=True)
    whatsapp = models.CharField(max_length=16, blank=True)
    opening_hours = models.CharField(max_length=300, blank=True)
    contact_available = models.BooleanField(default=True)
    accepts_trade_in = models.BooleanField(default=False)
    status = models.CharField(max_length=32, default="draft", db_index=True)
    feedback = models.CharField(max_length=1000, blank=True)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)


class Membership(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )
    display_name = models.CharField(max_length=120, blank=True, default="")
    phone = models.CharField(max_length=16, blank=True, default="")
    invite_code = models.CharField(max_length=24, unique=True, null=True, blank=True)
    role = models.CharField(max_length=16, default="staff")
    created_at = models.DateTimeField(auto_now_add=True, null=True)


class Verification(models.Model):
    profile = models.JSONField(default=dict)
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
    request_type = models.CharField(max_length=20, default="initial", db_index=True)
    note = models.CharField(max_length=1000, blank=True)
    status = models.CharField(
        max_length=32, default="pending_verification", db_index=True
    )
    feedback = models.CharField(max_length=1000, blank=True)
    version = models.PositiveIntegerField(default=1)
    submitted_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT
    )
