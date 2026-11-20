import uuid
from django.db import models
from core.stores.models import Store


class MediaAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
    purpose = models.CharField(max_length=16)
    kind = models.CharField(max_length=16)
    content_type = models.CharField(max_length=32)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    upload_key = models.CharField(max_length=200, unique=True)
    processed_key = models.CharField(max_length=200, blank=True)
    thumbnail_key = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=16, default="awaiting", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()


class VerificationDocument(models.Model):
    verification = models.ForeignKey(
        "core.Verification", on_delete=models.PROTECT, related_name="documents"
    )
    asset = models.ForeignKey(MediaAsset, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["verification", "asset"], name="unique_verification_document"
            )
        ]
