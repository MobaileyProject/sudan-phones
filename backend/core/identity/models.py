from django.conf import settings
from django.db import models


class Account(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    phone = models.CharField(max_length=16, blank=True, db_index=True)
    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    is_merchant = models.BooleanField(default=False)
    google_sub = models.CharField(max_length=128, unique=True, null=True, blank=True)
    preferred_city = models.CharField(max_length=32, blank=True)
    preferred_locale = models.CharField(max_length=8, default="ar")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["phone"],
                condition=models.Q(phone_verified=True) & ~models.Q(phone=""),
                name="unique_verified_phone",
            )
        ]


class OTPChallenge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    purpose = models.CharField(max_length=16)
    channel = models.CharField(max_length=16)
    digest = models.CharField(max_length=256)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "purpose", "-created_at"])]
