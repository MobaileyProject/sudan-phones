from datetime import timedelta
from io import BytesIO
import hashlib
import uuid
import warnings
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageOps
from core.common.domain import DomainError, require
from core.stores.services import member_store
from .models import MediaAsset
from .storage import storage


@transaction.atomic
def initiate(actor, data, purpose="listing"):
    store = member_store(
        actor, owner=purpose == "verification", verified=purpose == "listing", lock=True
    )
    require(
        purpose != "verification" or store.status in ["draft", "changes_requested"],
        "INVALID_STATE",
        409,
    )
    limit = (
        settings.MEDIA_DOCUMENT_MAX_BYTES
        if purpose == "verification"
        else settings.MEDIA_PHOTO_MAX_BYTES
    )
    require(data["size"] <= limit, "MEDIA_TOO_LARGE")
    require(
        MediaAsset.objects.filter(
            store=store, created_at__gt=timezone.now() - timedelta(days=1)
        ).count()
        < 100,
        "UPLOAD_QUOTA",
        429,
    )
    asset_id = uuid.uuid4()
    key = f"quarantine/{store.pk}/{asset_id}"
    signed = storage().upload_url(key, data["content_type"], data["size"])
    MediaAsset.objects.create(
        id=asset_id,
        store=store,
        purpose=purpose,
        upload_key=key,
        expires_at=timezone.now() + timedelta(minutes=15),
        **data,
    )
    return {"id": asset_id, **signed, "expires_in": 600}


@transaction.atomic
def complete(actor, asset_id):
    store = member_store(actor, lock=True)
    asset = (
        MediaAsset.objects.select_for_update().filter(pk=asset_id, store=store).first()
    )
    require(asset is not None, "NOT_FOUND", 404)
    require(asset.status in ["awaiting", "queued", "ready"], "INVALID_MEDIA")
    if asset.status == "awaiting":
        require(asset.expires_at > timezone.now(), "UPLOAD_EXPIRED")
        asset.status = "queued"
        asset.save(update_fields=["status"])
    return {"accepted": True}


def decoded_image(data, content_type):
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        image = Image.open(BytesIO(data))
        require(image.format in ["JPEG", "PNG", "WEBP"], "INVALID_MEDIA")
        require(Image.MIME[image.format] == content_type, "INVALID_MEDIA")
        require(
            image.width * image.height <= settings.MEDIA_MAX_PIXELS
            and getattr(image, "n_frames", 1) == 1,
            "INVALID_MEDIA",
        )
        image.verify()
        image = Image.open(BytesIO(data))
        image.load()
        return ImageOps.exif_transpose(image).convert("RGB")


def process_asset(asset_id):
    asset = MediaAsset.objects.filter(pk=asset_id).first()
    if not asset or asset.status != "queued":
        return
    provider = storage()
    try:
        data = provider.read(asset.upload_key, asset.size)
        require(
            len(data) == asset.size
            and hashlib.sha256(data).hexdigest() == asset.sha256,
            "INVALID_MEDIA",
        )
        image = decoded_image(data, asset.content_type)
        image.thumbnail((1600, 1600))
        output = BytesIO()
        image.save(output, "JPEG", quality=85)
        prefix = "public" if asset.purpose == "listing" else "evidence"
        key = f"{prefix}/{asset.store_id}/{asset.pk}.jpg"
        provider.write(key, output.getvalue(), "image/jpeg")
        thumb_key = ""
        if asset.purpose == "listing":
            image.thumbnail((320, 320))
            thumbnail = BytesIO()
            image.save(thumbnail, "JPEG", quality=80)
            thumb_key = f"public/{asset.store_id}/{asset.pk}-thumb.jpg"
            provider.write(thumb_key, thumbnail.getvalue(), "image/jpeg")
    except (
        DomainError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        MediaAsset.objects.filter(pk=asset.pk, status="queued").update(status="failed")
        return
    # Store then asset lock order matches listing mutations/publication. Repeat delivery is harmless.
    from core.stores.models import Store

    with transaction.atomic():
        store = Store.objects.select_for_update().get(pk=asset.store_id)
        locked = MediaAsset.objects.select_for_update().get(pk=asset.pk)
        if locked.status != "queued":
            return
        locked.status, locked.processed_key, locked.thumbnail_key = (
            "ready",
            key,
            thumb_key,
        )
        locked.save(update_fields=["status", "processed_key", "thumbnail_key"])
        if locked.purpose == "listing" and store.status == "verified":
            from core.listings.services import publish_ready

            publish_ready(store)
