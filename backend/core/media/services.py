from datetime import timedelta
from io import BytesIO
import hashlib
import uuid
import warnings
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageOps
from botocore.exceptions import ClientError, BotoCoreError
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
        purpose != "verification"
        or store.status in ["draft", "changes_requested", "verified"],
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
        if getattr(settings, "MEDIA_PROCESS_INLINE", False):
            aid = str(asset.pk)
            transaction.on_commit(lambda: process_asset(aid))
    return {"accepted": True}


def validate_pdf(data):
    require(
        len(data) >= 16
        and len(data) <= settings.MEDIA_DOCUMENT_MAX_BYTES
        and data.startswith(b"%PDF-")
        and b"%%EOF" in data[-1024:],
        "INVALID_MEDIA",
    )
    return data


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


@transaction.atomic
def claim_asset(asset_id):
    from core.stores.models import Store

    candidate = MediaAsset.objects.filter(pk=asset_id).first()
    if not candidate:
        return None
    Store.objects.select_for_update().get(pk=candidate.store_id)
    asset = MediaAsset.objects.select_for_update().get(pk=asset_id)
    now = timezone.now()
    if asset.status != "queued" or asset.next_attempt_at > now:
        return None
    if asset.attempts >= 5:
        asset.status = "failed"
        asset.save(update_fields=["status"])
        return None
    asset.attempts += 1
    asset.next_attempt_at = now + timedelta(minutes=6)
    asset.save(update_fields=["attempts", "next_attempt_at"])
    return asset


@transaction.atomic
def retry_asset(asset, permanent=False):
    MediaAsset.objects.filter(
        pk=asset.pk, status="queued", attempts=asset.attempts
    ).update(
        status="failed" if permanent or asset.attempts >= 5 else "queued",
        next_attempt_at=timezone.now()
        + timedelta(seconds=30 * 2 ** (asset.attempts - 1)),
    )


def process_asset(asset_id):
    asset = claim_asset(asset_id)
    if not asset:
        return
    try:
        provider = storage()
        data = provider.read(asset.upload_key, asset.size)
        require(
            len(data) == asset.size
            and hashlib.sha256(data).hexdigest() == asset.sha256,
            "INVALID_MEDIA",
        )
        if asset.content_type == "application/pdf":
            require(asset.purpose == "verification", "INVALID_MEDIA")
            validated = validate_pdf(data)
            key = f"evidence/{asset.store_id}/{asset.pk}.pdf"
            provider.write(key, validated, "application/pdf")
            thumb_key = ""
        else:
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
    except ClientError as error:
        missing = error.response.get("Error", {}).get("Code") in [
            "NoSuchKey",
            "404",
            "NotFound",
        ]
        retry_asset(asset, permanent=missing and asset.expires_at <= timezone.now())
        return
    except (BotoCoreError, TimeoutError, ConnectionError):
        retry_asset(asset)
        return
    except DomainError as error:
        retry_asset(asset, permanent=error.status < 500)
        return
    except (
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        retry_asset(asset, permanent=True)
        return
    # Store then asset lock order matches listing mutations/publication. Repeat delivery is harmless.
    from core.stores.models import Store

    with transaction.atomic():
        store = Store.objects.select_for_update().get(pk=asset.store_id)
        locked = MediaAsset.objects.select_for_update().get(pk=asset.pk)
        if locked.status != "queued" or locked.attempts != asset.attempts:
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
