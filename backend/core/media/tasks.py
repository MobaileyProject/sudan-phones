"""DB polling is the durable queue; broker failures cannot discard committed work."""

import logging
from celery import shared_task
from django.utils import timezone
from .models import MediaAsset
from .services import process_asset


@shared_task(ignore_result=True, acks_late=True, soft_time_limit=240, time_limit=300)
def process_pending():
    processed = 0
    for asset_id in (
        MediaAsset.objects.filter(status="queued", next_attempt_at__lte=timezone.now())
        .order_by("created_at")
        .values_list("pk", flat=True)[:50]
    ):
        try:
            process_asset(str(asset_id))
            processed += 1
        except Exception as error:
            # Provider diagnostics may contain presigned URLs: emit type only.
            logging.getLogger(__name__).warning(
                "Media job deferred: %s", type(error).__name__
            )
    return processed
