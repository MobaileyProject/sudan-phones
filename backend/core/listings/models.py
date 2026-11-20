from django.conf import settings
from django.db import models
from django.db.models import Q
from core.stores.models import Store
from core.catalog.models import Variant
from core.media.models import MediaAsset


class Listing(models.Model):
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
    variant = models.ForeignKey(Variant, on_delete=models.PROTECT)
    condition = models.CharField(max_length=8)
    price = models.DecimalField(max_digits=14, decimal_places=2)
    quantity = models.PositiveIntegerField()
    grade = models.CharField(max_length=16, default="new")
    battery_health = models.PositiveSmallIntegerField(null=True)
    defects = models.CharField(max_length=2000, blank=True)
    warranty_months = models.PositiveSmallIntegerField(null=True)
    warranty_days = models.PositiveSmallIntegerField(null=True)
    is_sealed = models.BooleanField(default=False)
    has_original_box = models.BooleanField(default=False)
    status = models.CharField(max_length=16, default="processing")
    moderation = models.CharField(max_length=16, default="pending")
    feedback = models.CharField(max_length=1000, blank=True)
    version = models.PositiveIntegerField(default=1)
    views = models.PositiveBigIntegerField(default=0)
    contact_leads = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(price__gt=0), name="positive_listing_price"
            ),
            models.CheckConstraint(
                condition=Q(quantity__lte=1000000), name="bounded_listing_quantity"
            ),
            models.CheckConstraint(
                condition=Q(condition="new") | Q(condition="used", quantity__lte=1),
                name="used_single_unit",
            ),
            models.CheckConstraint(
                condition=Q(battery_health__isnull=True)
                | Q(battery_health__gte=50, battery_health__lte=100),
                name="valid_battery_health",
            ),
            models.CheckConstraint(
                condition=Q(
                    condition="new",
                    grade="new",
                    is_sealed=True,
                    battery_health=100,
                    defects="",
                    warranty_months__isnull=False,
                    warranty_days__isnull=True,
                )
                | (
                    Q(
                        condition="used",
                        grade__in=["like_new", "excellent", "good", "fair"],
                        is_sealed=False,
                        warranty_days__isnull=False,
                        warranty_months__isnull=True,
                    )
                ),
                name="listing_condition_fields",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "condition", "price"]),
            models.Index(fields=["store", "status"]),
            models.Index(fields=["variant", "status"]),
            models.Index(fields=["status", "-created_at"]),
        ]


class ListingMedia(models.Model):
    listing = models.ForeignKey(
        Listing, related_name="media_links", on_delete=models.PROTECT
    )
    asset = models.OneToOneField(MediaAsset, on_delete=models.PROTECT)
    position = models.PositiveSmallIntegerField()


class PriceHistory(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    price = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)


class Mutation(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
    operation = models.CharField(max_length=100)
    key = models.CharField(max_length=128)
    fingerprint = models.CharField(max_length=64)
    result = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["actor", "store", "operation", "key"],
                name="unique_mutation_key",
            )
        ]
