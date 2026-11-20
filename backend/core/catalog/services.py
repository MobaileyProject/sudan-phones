from core.stores.services import member_store
from .models import Brand, PhoneModel, Variant


def choices(actor, kind, query, public=False):
    if not public:
        member_store(actor, verified=True)
    if kind == "categories":
        return [{"id": "phones", "name": "Phones"}]
    queryset = {"brands": Brand, "models": PhoneModel, "variants": Variant}[
        kind
    ].objects.order_by("pk")
    if kind == "models" and "brand_id" in query:
        queryset = queryset.filter(brand_id=query["brand_id"])
    if kind == "variants" and "model_id" in query:
        queryset = queryset.filter(model_id=query["model_id"])
    return queryset[query["offset"] : query["offset"] + query["limit"]]
