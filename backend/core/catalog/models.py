from django.db import models
from django.db.models.functions import Upper
from django.contrib.postgres.indexes import GinIndex, OpClass


class Brand(models.Model):
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        indexes = [
            GinIndex(
                OpClass(Upper("name"), name="gin_trgm_ops"), name="brand_name_trgm"
            )
        ]


class PhoneModel(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT)
    name = models.CharField(max_length=120)
    specifications = models.JSONField(default=dict)

    class Meta:
        indexes = [
            GinIndex(
                OpClass(Upper("name"), name="gin_trgm_ops"), name="model_name_trgm"
            )
        ]
        constraints = [
            models.UniqueConstraint(fields=["brand", "name"], name="unique_brand_model")
        ]


class Variant(models.Model):
    model = models.ForeignKey(PhoneModel, on_delete=models.PROTECT)
    storage_gb = models.PositiveIntegerField()
    ram_gb = models.PositiveIntegerField()
    color = models.CharField(max_length=80)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["model", "storage_gb", "ram_gb", "color"],
                name="unique_phone_variant",
            )
        ]
