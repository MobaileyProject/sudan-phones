from django.contrib import admin
from core.catalog.models import Brand, PhoneModel, Variant

for model in [Brand, PhoneModel, Variant]:
    admin.site.register(model)
