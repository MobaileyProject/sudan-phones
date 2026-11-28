from datetime import date, timedelta
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from core.common.domain import require
from core.listings.models import Listing
from core.stores.models import Store
from core.stores.services import member_store
from .audit import record
from .authorization import require_admin
from .models import SponsoredAd, SponsoredAdDailyStat


def _ad_data(ad):
    ctr = round((ad.clicks / ad.impressions) * 100, 2) if ad.impressions > 0 else 0.0
    avg_ttc = (
        round(ad.total_time_to_click_ms / ad.timed_clicks)
        if ad.timed_clicks > 0
        else None
    )
    daily = [
        {"date": d.day.isoformat(), "impressions": d.impressions, "clicks": d.clicks}
        for d in ad.daily_stats.order_by("day")
    ]
    return {
        "id": ad.pk,
        "store_id": ad.store_id,
        "store_name": ad.store.name,
        "store_name_ar": ad.store.name,
        "store_name_en": ad.store.name,
        "listing_id": ad.listing_id,
        "title_ar": ad.title_ar,
        "title_en": ad.title_en,
        "subtitle_ar": ad.subtitle_ar,
        "subtitle_en": ad.subtitle_en,
        "cta_label_ar": ad.cta_label_ar,
        "cta_label_en": ad.cta_label_en,
        "badge_ar": ad.badge_ar,
        "badge_en": ad.badge_en,
        "image_url": ad.image_url,
        "target_city": ad.target_city,
        "status": ad.status,
        "priority": ad.priority,
        "skip_delay_sec": ad.skip_delay_sec,
        "paid_amount_sdg": float(ad.paid_amount_sdg),
        "payment_status": ad.payment_status,
        "payment_ref": ad.payment_ref,
        "requested_by_merchant": ad.requested_by_merchant,
        "starts_at": ad.starts_at.isoformat(),
        "ends_at": ad.ends_at.isoformat(),
        "impressions": ad.impressions,
        "clicks": ad.clicks,
        "ctr_pct": ctr,
        "last_clicked_at": ad.last_clicked_at,
        "avg_time_to_click_ms": avg_ttc,
        "daily_stats": daily,
        "created_at": ad.created_at,
    }


def list_active_ads(city="all"):
    today = timezone.localdate()
    qs = (
        SponsoredAd.objects.select_related("store")
        .prefetch_related("daily_stats")
        .filter(status="active", starts_at__lte=today, ends_at__gte=today)
    )
    clean_city = (city or "all").strip()
    if clean_city and clean_city != "all":
        ads = [a for a in qs if a.target_city in ("all", clean_city)]
        ads.sort(
            key=lambda a: (
                -(a.priority + (20 if a.target_city == clean_city else 0)),
                -a.pk,
            )
        )
    else:
        ads = list(qs.order_by("-priority", "-pk"))
    return [_ad_data(a) for a in ads]


@transaction.atomic
def record_ad_impression(ad_id):
    ad = SponsoredAd.objects.select_for_update().filter(pk=ad_id).first()
    require(ad is not None, "NOT_FOUND", 404)
    ad.impressions += 1
    ad.save(update_fields=["impressions"])
    today = timezone.localdate()
    stat, _ = SponsoredAdDailyStat.objects.get_or_create(ad=ad, day=today)
    SponsoredAdDailyStat.objects.filter(pk=stat.pk).update(
        impressions=F("impressions") + 1
    )
    ad.refresh_from_db()
    return _ad_data(ad)


@transaction.atomic
def record_ad_click(ad_id, data):
    ad = SponsoredAd.objects.select_for_update().filter(pk=ad_id).first()
    require(ad is not None, "NOT_FOUND", 404)
    ad.clicks += 1
    ad.last_clicked_at = timezone.now()
    ttc = data.get("time_to_click_ms")
    if ttc is not None and 0 < ttc < 120000:
        ad.total_time_to_click_ms += int(ttc)
        ad.timed_clicks += 1
    ad.save(
        update_fields=[
            "clicks",
            "last_clicked_at",
            "total_time_to_click_ms",
            "timed_clicks",
        ]
    )
    today = timezone.localdate()
    stat, _ = SponsoredAdDailyStat.objects.get_or_create(ad=ad, day=today)
    SponsoredAdDailyStat.objects.filter(pk=stat.pk).update(clicks=F("clicks") + 1)
    ad.refresh_from_db()
    return _ad_data(ad)


def list_merchant_ads(actor):
    store = member_store(actor, allow_inactive=True)
    ads = list(
        SponsoredAd.objects.select_related("store")
        .prefetch_related("daily_stats")
        .filter(store=store)
        .order_by("-priority", "-pk")
    )
    today = timezone.localdate()
    active_count = sum(
        1 for a in ads if a.status == "active" and a.starts_at <= today <= a.ends_at
    )
    total_impressions = sum(a.impressions for a in ads)
    total_clicks = sum(a.clicks for a in ads)
    ctr = (
        round((total_clicks / total_impressions) * 100, 2)
        if total_impressions > 0
        else 0.0
    )
    return {
        "campaigns": [_ad_data(a) for a in ads],
        "summary": {
            "total_campaigns": len(ads),
            "active_campaigns": active_count,
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "overall_ctr_pct": ctr,
        },
    }


@transaction.atomic
def request_merchant_ad(actor, data, actor_ip=None):
    store = member_store(actor, verified=True, lock=True)
    title_ar = (data.get("title_ar") or "").strip()
    title_en = (data.get("title_en") or title_ar).strip()
    require(bool(title_ar or title_en), "VALIDATION_ERROR", 400)
    listing_obj = None
    if data.get("listing_id"):
        listing_obj = Listing.objects.filter(pk=data["listing_id"], store=store).first()
    duration_days = max(1, min(60, int(data.get("duration_days") or 7)))
    today = timezone.localdate()
    paid_amount = data.get("paid_amount_sdg")
    if paid_amount is None:
        paid_amount = duration_days * 25000
    ad = SponsoredAd.objects.create(
        store=store,
        listing=listing_obj,
        title_ar=title_ar or title_en,
        title_en=title_en or title_ar,
        subtitle_ar=(data.get("subtitle_ar") or "").strip(),
        subtitle_en=(data.get("subtitle_en") or data.get("subtitle_ar") or "").strip(),
        cta_label_ar="شاهد العرض",
        cta_label_en="View Offer",
        badge_ar="طلب إعلان متجر",
        badge_en="Merchant Request",
        image_url=(data.get("image_url") or store.banner_url or "").strip(),
        target_city=(data.get("target_city") or store.city or "all").strip(),
        status="scheduled",
        priority=50,
        skip_delay_sec=3,
        paid_amount_sdg=paid_amount,
        payment_status="pending",
        payment_ref=(data.get("payment_ref") or "").strip(),
        requested_by_merchant=True,
        starts_at=today,
        ends_at=today + timedelta(days=duration_days),
    )
    record(
        actor,
        "ad.requested_by_merchant",
        ad.pk,
        store_id=store.pk,
        payment_ref=ad.payment_ref,
        actor_ip=actor_ip,
    )
    return _ad_data(ad)


def list_admin_ads(actor):
    require_admin(actor, "moderate_listings")
    qs = (
        SponsoredAd.objects.select_related("store")
        .prefetch_related("daily_stats")
        .order_by("-priority", "-pk")
    )
    return [_ad_data(a) for a in qs]


def _parse_date(val, default):
    if isinstance(val, date):
        return val
    if isinstance(val, str) and val.strip():
        return date.fromisoformat(val.strip()[:10])
    return default


@transaction.atomic
def create_admin_ad(actor, data, actor_ip=None):
    require_admin(actor, "moderate_listings")
    store = Store.objects.filter(pk=data["store_id"]).first()
    require(store is not None, "INVALID_STORE", 400)
    title_ar = (data.get("title_ar") or "").strip()
    title_en = (data.get("title_en") or title_ar).strip()
    require(bool(title_ar or title_en), "VALIDATION_ERROR", 400)
    listing_obj = None
    if data.get("listing_id"):
        listing_obj = Listing.objects.filter(pk=data["listing_id"]).first()
    today = timezone.localdate()
    ad = SponsoredAd.objects.create(
        store=store,
        listing=listing_obj,
        title_ar=title_ar or title_en,
        title_en=title_en or title_ar,
        subtitle_ar=(data.get("subtitle_ar") or "").strip(),
        subtitle_en=(data.get("subtitle_en") or data.get("subtitle_ar") or "").strip(),
        cta_label_ar=(data.get("cta_label_ar") or "زيارة المتجر").strip(),
        cta_label_en=(data.get("cta_label_en") or "Visit Store").strip(),
        badge_ar=(data.get("badge_ar") or "إعلان مموّل").strip(),
        badge_en=(data.get("badge_en") or "Sponsored").strip(),
        image_url=(data.get("image_url") or store.banner_url or "").strip(),
        target_city=(data.get("target_city") or "all").strip(),
        status=data.get("status") or "active",
        priority=max(1, min(100, int(data.get("priority") or 50))),
        skip_delay_sec=max(0, min(10, int(data.get("skip_delay_sec") or 3))),
        paid_amount_sdg=data.get("paid_amount_sdg") or 0,
        payment_status=data.get("payment_status") or "paid",
        payment_ref=(data.get("payment_ref") or "").strip(),
        requested_by_merchant=False,
        starts_at=_parse_date(data.get("starts_at"), today),
        ends_at=_parse_date(data.get("ends_at"), today + timedelta(days=14)),
    )
    record(actor, "ad.created", ad.pk, store_id=store.pk, status=ad.status, actor_ip=actor_ip)
    return _ad_data(ad)


@transaction.atomic
def update_admin_ad(actor, ad_id, data, actor_ip=None):
    require_admin(actor, "moderate_listings")
    ad = SponsoredAd.objects.select_for_update().select_related("store").filter(pk=ad_id).first()
    require(ad is not None, "NOT_FOUND", 404)
    if "store_id" in data:
        store = Store.objects.filter(pk=data["store_id"]).first()
        require(store is not None, "INVALID_STORE", 400)
        ad.store = store
    if "listing_id" in data:
        ad.listing_id = data["listing_id"]
    for field in (
        "title_ar",
        "title_en",
        "subtitle_ar",
        "subtitle_en",
        "cta_label_ar",
        "cta_label_en",
        "badge_ar",
        "badge_en",
        "image_url",
        "target_city",
        "status",
        "priority",
        "skip_delay_sec",
        "paid_amount_sdg",
        "payment_status",
        "payment_ref",
    ):
        if field in data:
            val = data[field]
            setattr(ad, field, val.strip() if isinstance(val, str) else val)
    if "starts_at" in data:
        ad.starts_at = _parse_date(data["starts_at"], ad.starts_at)
    if "ends_at" in data:
        ad.ends_at = _parse_date(data["ends_at"], ad.ends_at)
    ad.save()
    record(actor, "ad.updated", ad.pk, status=ad.status, actor_ip=actor_ip)
    return _ad_data(ad)


@transaction.atomic
def delete_admin_ad(actor, ad_id, actor_ip=None):
    require_admin(actor, "moderate_listings")
    ad = SponsoredAd.objects.select_for_update().filter(pk=ad_id).first()
    require(ad is not None, "NOT_FOUND", 404)
    ad.delete()
    record(actor, "ad.deleted", ad_id, actor_ip=actor_ip)
    return {"deleted": True}


def ads_overview_metrics():
    active_count = SponsoredAd.objects.filter(status="active").count()
    revenue = (
        SponsoredAd.objects.filter(payment_status="paid").aggregate(
            total=Sum("paid_amount_sdg")
        )["total"]
        or 0
    )
    return {"active_sponsored_ads": active_count, "ad_revenue_sdg": float(revenue)}
