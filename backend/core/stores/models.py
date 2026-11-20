from django.conf import settings
from django.db import models


class Store(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    name = models.CharField(max_length=160, blank=True)
    city = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=300, blank=True)
    phone = models.CharField(max_length=16, blank=True)
    whatsapp = models.CharField(max_length=16, blank=True)
    opening_hours = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=32, default="draft", db_index=True)
    feedback = models.CharField(max_length=1000, blank=True)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)


class Membership(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=16, default="staff")


class Verification(models.Model):
    profile = models.JSONField(default=dict)
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
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
