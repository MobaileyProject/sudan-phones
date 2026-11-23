from django.contrib import admin
from core.catalog.models import Brand, PhoneModel, Variant
from core.operations.models import Rating, CustomerReport

for model in [Brand, PhoneModel, Variant, Rating, CustomerReport]:
    admin.site.register(model)
