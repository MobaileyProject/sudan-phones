from django.db import transaction
from django.utils import timezone
from core.common.domain import require
from core.stores.services import member_store
from core.stores.models import Store, Verification
from core.media.models import MediaAsset, VerificationDocument
from core.media.storage import storage
from core.operations.audit import record
from core.operations.authorization import require_admin


@transaction.atomic
def submit(actor, data):
    store = member_store(actor, owner=True, lock=True)
    require(store.status in ["draft", "changes_requested"], "INVALID_STATE", 409)
    require(
        all([store.name, store.address, store.city, store.phone, store.whatsapp]),
        "INCOMPLETE_PROFILE",
    )
    require(actor.account.phone_verified, "PHONE_NOT_VERIFIED", 403)
    ids = data["documents"]
    assets = list(
        MediaAsset.objects.filter(
            pk__in=ids, store=store, purpose="verification", status="ready"
        )
    )
    kinds = {a.kind for a in assets}
    require(len(assets) == len(ids) and len(kinds) == len(ids), "INVALID_DOCUMENTS")
    require(
        "id_front" in kinds and bool({"commercial", "signboard"} & kinds),
        "MISSING_DOCUMENTS",
    )
    verification = Verification.objects.create(
        store=store,
        request_type="initial",
        profile={
            key: getattr(store, key)
            for key in ["name", "city", "address", "phone", "whatsapp"]
        },
    )
    VerificationDocument.objects.bulk_create(
        [VerificationDocument(verification=verification, asset=a) for a in assets]
    )
    store.status, store.feedback = "pending_verification", ""
    store.save(update_fields=["status", "feedback"])
    record(actor, "verification.submitted", verification.pk)
    return verification


@transaction.atomic
def request_reverification(actor, data):
    store = member_store(actor, owner=True, verified=True, lock=True)
    require(
        not Verification.objects.filter(
            store=store,
            request_type="reverification",
            status="pending_verification",
        ).exists(),
        "REVERIFICATION_PENDING",
        409,
    )
    ids = data.get("documents", [])
    assets = []
    if ids:
        assets = list(
            MediaAsset.objects.filter(
                pk__in=ids, store=store, purpose="verification", status="ready"
            )
        )
        require(
            len(assets) == len(ids) and len({a.kind for a in assets}) == len(ids),
            "INVALID_DOCUMENTS",
        )
    proposed_profile = {
        "name": data.get("name", store.name),
        "city": data.get("city", store.city),
        "address": store.address,
        "phone": store.phone,
        "whatsapp": store.whatsapp,
    }
    verification = Verification.objects.create(
        store=store,
        request_type="reverification",
        note=data["note"],
        profile=proposed_profile,
    )
    if assets:
        VerificationDocument.objects.bulk_create(
            [VerificationDocument(verification=verification, asset=a) for a in assets]
        )
    record(actor, "verification.reverification_requested", verification.pk)
    return verification


def status(actor):
    store = member_store(actor, allow_inactive=True)
    return Verification.objects.filter(store=store).order_by("-pk").first()


def queue(actor, query):
    require_admin(actor, "verify_stores")
    return Verification.objects.filter(status="pending_verification").order_by("pk")[
        query["offset"] : query["offset"] + query["limit"]
    ]


def detail(actor, verification_id):
    require_admin(actor, "verify_stores")
    verification = Verification.objects.filter(pk=verification_id).first()
    require(verification is not None, "NOT_FOUND", 404)
    return verification


def documents(actor, verification_id):
    from core.operations.services import require_founder

    require_founder(actor)
    verification = detail(actor, verification_id)
    provider = storage()
    record(actor, "verification.documents_accessed", verification.pk)
    return [
        {
            "id": doc.asset_id,
            "kind": doc.asset.kind,
            "url": provider.private_url(doc.asset.processed_key, 900),
            "expires_in": 900,
        }
        for doc in verification.documents.select_related("asset").all()
    ]


@transaction.atomic
def decide(actor, verification_id, data, actor_ip=None):
    require_admin(actor, "verify_stores")
    target = detail(actor, verification_id)
    store = Store.objects.select_for_update().get(pk=target.store_id)
    require_admin(actor, "verify_stores", lock=True)
    verification = Verification.objects.select_for_update().get(pk=verification_id)
    require(store.owner_id != actor.pk, "SELF_REVIEW_FORBIDDEN", 403)
    if verification.request_type == "reverification":
        require(
            verification.status == "pending_verification"
            and store.status == "verified"
            and verification.version == data["version"],
            "STALE_VERSION",
            409,
        )
        verification.status, verification.feedback = data["decision"], data["reason"]
        verification.version += 1
        verification.decided_at, verification.reviewed_by = timezone.now(), actor
        verification.save()
        if data["decision"] == "verified":
            profile = verification.profile or {}
            if profile.get("name"):
                store.name = profile["name"]
            if profile.get("city"):
                store.city = profile["city"]
            store.version += 1
            store.save(update_fields=["name", "city", "version"])
    else:
        require(
            verification.status == "pending_verification"
            and store.status == "pending_verification"
            and verification.version == data["version"],
            "STALE_VERSION",
            409,
        )
        verification.status, verification.feedback = data["decision"], data["reason"]
        verification.version += 1
        verification.decided_at, verification.reviewed_by = timezone.now(), actor
        verification.save()
        store.status, store.feedback = data["decision"], data["reason"]
        store.version += 1
        store.save()
    record(
        actor,
        "verification.decided",
        verification.pk,
        decision=data["decision"],
        actor_ip=actor_ip,
    )
    return verification
