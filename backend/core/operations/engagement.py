from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Avg, Count, F, Q
from django.utils import timezone
from core.catalog.models import PhoneModel
from core.common.domain import DomainError, require
from core.discovery.queries import visible_listings, visible_stores
from core.listings.models import Listing
from core.stores.models import Membership, Store
from core.stores.services import member_store
from .models import (
    CustomerNotification,
    PriceAlert,
    Rating,
    StoreChatMessage,
    StoreChatThread,
)


def _caller_identity(actor, visitor_id=""):
    if actor and actor.is_authenticated:
        return actor, ""
    return None, (visitor_id or "").strip()[:64]


def _alert_data(alert):
    listing = alert.listing
    brand_name = listing.variant.model.brand.name
    model_name = listing.variant.model.name
    return {
        "id": alert.pk,
        "listing_id": alert.listing_id,
        "model": model_name,
        "model_title": f"{brand_name} {model_name}",
        "initial_price_sdg": float(alert.initial_price),
        "target_price_sdg": float(alert.target_price) if alert.target_price is not None else None,
        "created_at": alert.created_at,
    }


def list_alerts(actor, visitor_id=""):
    user, vid = _caller_identity(actor, visitor_id)
    if user is not None:
        qs = PriceAlert.objects.select_related("listing__variant__model__brand").filter(user=user)
    elif vid:
        qs = PriceAlert.objects.select_related("listing__variant__model__brand").filter(
            user__isnull=True, visitor_id=vid
        )
    else:
        return []
    return [_alert_data(a) for a in qs.order_by("-created_at", "-pk")]


@transaction.atomic
def create_alert(actor, data, visitor_id=""):
    user, vid = _caller_identity(actor, visitor_id)
    require(user is not None or bool(vid), "VISITOR_REQUIRED", 400)
    listing = visible_listings().filter(pk=data["listing_id"]).first()
    require(listing is not None, "NOT_FOUND", 404)
    if user is not None:
        existing = PriceAlert.objects.filter(user=user, listing=listing).first()
    else:
        existing = PriceAlert.objects.filter(
            user__isnull=True, visitor_id=vid, listing=listing
        ).first()
    if existing:
        return _alert_data(existing), False
    target = data.get("target_price_sdg")
    if target is None:
        step = Decimal("1000")
        raw_target = listing.price * Decimal("0.95")
        target = (raw_target / step).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * step
        if target <= 0:
            target = listing.price
    alert = PriceAlert.objects.create(
        user=user,
        visitor_id="" if user is not None else vid,
        listing=listing,
        initial_price=listing.price,
        target_price=target,
    )
    return _alert_data(alert), True


@transaction.atomic
def delete_alert(actor, alert_id, visitor_id=""):
    user, vid = _caller_identity(actor, visitor_id)
    if user is not None:
        qs = PriceAlert.objects.filter(user=user).filter(
            Q(pk=alert_id) | Q(listing_id=alert_id)
        )
    elif vid:
        qs = PriceAlert.objects.filter(user__isnull=True, visitor_id=vid).filter(
            Q(pk=alert_id) | Q(listing_id=alert_id)
        )
    else:
        return {"deleted": True}
    qs.delete()
    return {"deleted": True}


def notify_price_drop(listing, old_price, new_price):
    if new_price >= old_price:
        return
    alerts = PriceAlert.objects.filter(listing=listing)
    if not alerts.exists():
        return
    model_name = listing.variant.model.name
    store_name = listing.store.name
    price_int = f"{int(round(float(new_price))):,}"
    notifications = []
    seen = set()
    for alert in alerts:
        key = ("u", alert.user_id) if alert.user_id else ("v", alert.visitor_id)
        if key in seen:
            continue
        seen.add(key)
        notifications.append(
            CustomerNotification(
                user_id=alert.user_id,
                visitor_id="" if alert.user_id else alert.visitor_id,
                type="price_drop",
                title_ar=f"انخفاض سعر {model_name}",
                title_en=f"Price Drop: {model_name}",
                body_ar=f"خفض {store_name} السعر إلى {price_int} ج.س.",
                body_en=f"{store_name} lowered the price to {price_int} SDG.",
                listing=listing,
                store=listing.store,
                is_read=False,
            )
        )
    if notifications:
        CustomerNotification.objects.bulk_create(notifications)


def _notification_data(n):
    return {
        "id": f"notif-{n.pk}",
        "type": n.type,
        "title_ar": n.title_ar,
        "title_en": n.title_en,
        "body_ar": n.body_ar,
        "body_en": n.body_en,
        "listing_id": n.listing_id,
        "store_id": n.store_id,
        "thread_key": n.thread_key or None,
        "read": n.is_read,
        "created_at": n.created_at,
    }


def list_notifications(actor, visitor_id=""):
    user, vid = _caller_identity(actor, visitor_id)
    if user is not None:
        qs = CustomerNotification.objects.filter(user=user)
    elif vid:
        qs = CustomerNotification.objects.filter(user__isnull=True, visitor_id=vid)
    else:
        return []
    return [_notification_data(n) for n in qs.order_by("-created_at", "-pk")[:50]]


@transaction.atomic
def mark_notifications_read(actor, visitor_id=""):
    user, vid = _caller_identity(actor, visitor_id)
    if user is not None:
        CustomerNotification.objects.filter(user=user, is_read=False).update(is_read=True)
    elif vid:
        CustomerNotification.objects.filter(
            user__isnull=True, visitor_id=vid, is_read=False
        ).update(is_read=True)
    return {"read": True}


def _thread_key_for(store_id, user, visitor_id):
    suffix = f"u_{user.pk}" if user is not None else f"v_{visitor_id or 'guest'}"
    return f"{store_id}:{suffix}"


def _msg_data(m):
    return {
        "id": f"msg-{m.pk}",
        "store_id": m.store_id,
        "sender_role": m.sender_role,
        "sender_name": m.sender_name or "",
        "sender_phone": m.sender_phone or "",
        "text": m.text,
        "listing_id": m.listing_id,
        "listing_title": m.listing_title or "",
        "listing_price_sdg": float(m.listing_price_sdg)
        if m.listing_price_sdg is not None
        else None,
        "is_auto_reply": m.is_auto_reply,
        "created_at": m.created_at,
    }


def _thread_data(thread, for_merchant=True):
    msgs = [_msg_data(m) for m in thread.messages.order_by("created_at", "pk")]
    return {
        "thread_key": thread.thread_key,
        "store_id": thread.store_id,
        "store_name": thread.store.name,
        "store_phone": thread.store.phone or "",
        "customer_name": (
            thread.customer_name or "عميل سودان فونز"
            if for_merchant
            else thread.store.name
        ),
        "customer_phone": (
            thread.customer_phone or "" if for_merchant else (thread.store.phone or "")
        ),
        "listing_id": thread.listing_id,
        "listing_title": thread.listing_title or "",
        "listing_price_sdg": float(thread.listing_price_sdg)
        if thread.listing_price_sdg is not None
        else None,
        "unread_count": thread.unread_by_store if for_merchant else thread.unread_by_customer,
        "last_message_at": thread.last_message_at,
        "last_message_text": thread.last_message_text,
        "messages": msgs,
    }


def list_store_messages(actor, store_id, visitor_id=""):
    store = visible_stores().filter(pk=store_id).first()
    require(store is not None, "NOT_FOUND", 404)
    user, vid = _caller_identity(actor, visitor_id)
    key = _thread_key_for(store.pk, user, vid)
    thread = StoreChatThread.objects.filter(thread_key=key).first()
    if not thread:
        return []
    return [_msg_data(m) for m in thread.messages.order_by("created_at", "pk")]


@transaction.atomic
def send_store_message(actor, store_id, data, visitor_id="", locale="ar"):
    # Lock Store first (consistent Store -> Listing lock order with contact_event)
    Store.objects.select_for_update().filter(pk=store_id).first()
    store = visible_stores().filter(pk=store_id).first()
    require(store is not None, "NOT_FOUND", 404)
    text = (data.get("text") or "").strip()
    require(bool(text), "EMPTY_MESSAGE", 400)
    user, vid = _caller_identity(actor, visitor_id)
    key = _thread_key_for(store.pk, user, vid)

    sender_name = (data.get("sender_name") or "").strip()
    sender_phone = (data.get("sender_phone") or "").strip()
    if user is not None:
        if not sender_name:
            sender_name = user.first_name or user.username
        if not sender_phone and hasattr(user, "account"):
            sender_phone = user.account.phone or ""

    listing_id = data.get("listing_id")
    listing_obj = None
    if listing_id:
        listing_obj = Listing.objects.filter(pk=listing_id, store=store).first()
        if listing_obj:
            Listing.objects.filter(pk=listing_obj.pk).update(
                contact_leads=F("contact_leads") + 1
            )

    listing_title = (data.get("listing_title") or "").strip()
    listing_price_sdg = data.get("listing_price_sdg")
    if listing_obj and not listing_title:
        listing_title = f"{listing_obj.variant.model.name} · {listing_obj.variant.storage_gb} GB"
    if listing_obj and listing_price_sdg is None:
        listing_price_sdg = listing_obj.price

    thread, created = StoreChatThread.objects.select_for_update().get_or_create(
        thread_key=key,
        defaults={
            "store": store,
            "user": user,
            "visitor_id": "" if user is not None else (vid or "guest"),
            "customer_name": sender_name or "عميل سودان فونز",
            "customer_phone": sender_phone,
            "listing": listing_obj,
            "listing_title": listing_title,
            "listing_price_sdg": listing_price_sdg,
            "last_message_text": text,
            "last_message_at": timezone.now(),
        },
    )
    had_customer_msg = thread.messages.filter(sender_role="customer").exists()

    cust_msg = StoreChatMessage.objects.create(
        thread=thread,
        store=store,
        sender_role="customer",
        sender_name=sender_name,
        sender_phone=sender_phone,
        text=text,
        listing_id=listing_obj.pk if listing_obj else listing_id,
        listing_title=listing_title,
        listing_price_sdg=listing_price_sdg,
        is_auto_reply=False,
    )

    auto_reply = None
    if not had_customer_msg:
        is_en = str(locale).lower().startswith("en")
        reply_text = (
            f"Thank you for messaging {store.name}. We received your inquiry and our team will reply here shortly. Opening hours: {store.opening_hours}."
            if is_en
            else f"شكراً لتواصلك مع {store.name} عبر التطبيق. تم استلام رسالتك وسيرد عليك فريق المتجر في أقرب وقت. ساعات العمل: {store.opening_hours}."
        )
        auto_reply = StoreChatMessage.objects.create(
            thread=thread,
            store=store,
            sender_role="store",
            sender_name=store.name,
            text=reply_text,
            is_auto_reply=True,
        )

    if sender_name:
        thread.customer_name = sender_name
    if sender_phone:
        thread.customer_phone = sender_phone
    if listing_obj:
        thread.listing = listing_obj
    if listing_title:
        thread.listing_title = listing_title
    if listing_price_sdg is not None:
        thread.listing_price_sdg = listing_price_sdg
    thread.unread_by_store += 1
    thread.last_message_text = text
    thread.last_message_at = timezone.now()
    thread.save()

    # Instant notification to store owner + staff members
    member_user_ids = list(
        Membership.objects.filter(store=store, user__isnull=False).values_list(
            "user_id", flat=True
        )
    )
    if store.owner_id and store.owner_id not in member_user_ids:
        member_user_ids.append(store.owner_id)
    label_ar = sender_name or "عميل جديد"
    label_en = sender_name or "New Customer"
    CustomerNotification.objects.bulk_create(
        [
            CustomerNotification(
                user_id=uid,
                type="new_message",
                title_ar=f"رسالة جديدة من {label_ar}",
                title_en=f"New message from {label_en}",
                body_ar=text[:100],
                body_en=text[:100],
                listing=listing_obj,
                store=store,
                thread_key=thread.thread_key,
                is_read=False,
            )
            for uid in member_user_ids
        ]
    )

    all_msgs = [_msg_data(m) for m in thread.messages.order_by("created_at", "pk")]
    return {
        "message": _msg_data(cust_msg),
        "reply": _msg_data(auto_reply) if auto_reply else None,
        "messages": all_msgs,
    }


def list_buyer_chats(actor, visitor_id=""):
    user, vid = _caller_identity(actor, visitor_id)
    qs = StoreChatThread.objects.select_related("store").prefetch_related("messages")
    if user is not None:
        qs = qs.filter(user=user)
    elif vid:
        qs = qs.filter(user__isnull=True, visitor_id=vid)
    else:
        return []
    return [_thread_data(t, for_merchant=False) for t in qs.order_by("-last_message_at", "-pk")]


def list_merchant_chats(actor):
    store = member_store(actor)
    qs = (
        StoreChatThread.objects.select_related("store")
        .prefetch_related("messages")
        .filter(store=store)
        .order_by("-last_message_at", "-pk")
    )
    return [_thread_data(t, for_merchant=True) for t in qs]


@transaction.atomic
def mark_merchant_chat_read(actor, thread_key):
    store = member_store(actor)
    thread = StoreChatThread.objects.select_for_update().filter(thread_key=thread_key).first()
    require(thread is not None, "NOT_FOUND", 404)
    require(thread.store_id == store.pk, "FORBIDDEN", 403)
    if thread.unread_by_store != 0:
        thread.unread_by_store = 0
        thread.save(update_fields=["unread_by_store"])
    CustomerNotification.objects.filter(
        user=actor, thread_key=thread_key, type="new_message", is_read=False
    ).update(is_read=True)
    return {"read": True}


@transaction.atomic
def reply_merchant_chat(actor, thread_key, text):
    store = member_store(actor)
    clean_text = (text or "").strip()
    require(bool(clean_text), "EMPTY_MESSAGE", 400)
    thread = StoreChatThread.objects.select_for_update().filter(thread_key=thread_key).first()
    require(thread is not None, "NOT_FOUND", 404)
    require(thread.store_id == store.pk, "FORBIDDEN", 403)

    reply_msg = StoreChatMessage.objects.create(
        thread=thread,
        store=store,
        sender_role="store",
        sender_name=store.name or actor.first_name or actor.username,
        text=clean_text,
        is_auto_reply=False,
    )
    thread.unread_by_store = 0
    thread.unread_by_customer += 1
    thread.last_message_text = clean_text
    thread.last_message_at = timezone.now()
    thread.save(
        update_fields=[
            "unread_by_store",
            "unread_by_customer",
            "last_message_text",
            "last_message_at",
        ]
    )

    CustomerNotification.objects.filter(
        user=actor, thread_key=thread_key, type="new_message", is_read=False
    ).update(is_read=True)

    if thread.user_id or thread.visitor_id:
        CustomerNotification.objects.create(
            user_id=thread.user_id,
            visitor_id="" if thread.user_id else thread.visitor_id,
            type="chat_reply",
            title_ar=f"رد جديد من {store.name}",
            title_en=f"New reply from {store.name}",
            body_ar=clean_text[:90],
            body_en=clean_text[:90],
            store=store,
            listing=thread.listing,
            thread_key=thread.thread_key,
            is_read=False,
        )

    all_msgs = [_msg_data(m) for m in thread.messages.order_by("created_at", "pk")]
    return {"message": _msg_data(reply_msg), "messages": all_msgs}


def _product_rating_data(r):
    listing = r.listing
    model = listing.variant.model if listing else r.phone_model
    brand = model.brand if model else None
    store = listing.store if listing else r.store
    return {
        "id": r.pk,
        "listing_id": r.listing_id or 0,
        "model_id": model.pk if model else 0,
        "brand_slug": (brand.slug or brand.name.lower()) if brand else "",
        "model_name": model.name if model else "",
        "store_id": store.pk if store else 0,
        "store_name": store.name if store else "",
        "stars": r.stars,
        "author_name": r.author_name or (
            (r.author.first_name or r.author.username) if r.author else "Customer"
        ),
        "comment": r.comment,
        "created_at": r.created_at,
    }


def list_all_product_ratings():
    qs = (
        Rating.objects.select_related(
            "author",
            "listing__store",
            "listing__variant__model__brand",
            "phone_model__brand",
        )
        .filter(target_type="listing", listing__isnull=False)
        .order_by("-created_at", "-pk")[:200]
    )
    return [_product_rating_data(r) for r in qs]


def list_listing_ratings(listing_id):
    listing = Listing.objects.filter(pk=listing_id).first()
    require(listing is not None, "NOT_FOUND", 404)
    qs = (
        Rating.objects.select_related(
            "author", "listing__store", "listing__variant__model__brand"
        )
        .filter(target_type="listing", listing_id=listing_id)
        .order_by("-created_at", "-pk")
    )
    agg = qs.aggregate(avg=Avg("stars"), count=Count("id"))
    return {
        "data": [_product_rating_data(r) for r in qs],
        "meta": {
            "rating_average": round(agg["avg"], 1) if agg["avg"] is not None else 0,
            "rating_count": agg["count"] or 0,
        },
    }


@transaction.atomic
def submit_listing_rating(actor, listing_id, data):
    listing = (
        Listing.objects.select_related("store", "variant__model__brand")
        .filter(pk=listing_id)
        .first()
    )
    require(listing is not None, "NOT_FOUND", 404)
    user = actor if (actor and actor.is_authenticated) else None
    raw_name = (data.get("author_name") or "").strip()[:120]
    if user is not None:
        resolved_name = raw_name or user.first_name or user.username
        rating, _ = Rating.objects.update_or_create(
            author=user,
            listing=listing,
            defaults={
                "target_type": "listing",
                "phone_model": listing.variant.model,
                "store": None,
                "author_name": resolved_name,
                "stars": data["stars"],
                "comment": (data.get("comment") or "").strip(),
            },
        )
    else:
        rating = Rating.objects.create(
            target_type="listing",
            listing=listing,
            phone_model=listing.variant.model,
            author=None,
            author_name=raw_name or "Customer",
            stars=data["stars"],
            comment=(data.get("comment") or "").strip(),
        )
    model = listing.variant.model
    model_qs = Rating.objects.filter(
        Q(target_type="phone_model", phone_model=model)
        | Q(target_type="listing", listing__variant__model=model)
    )
    m_agg = model_qs.aggregate(avg=Avg("stars"), count=Count("id"))
    rated_listings = (
        model_qs.filter(listing__isnull=False).values("listing_id").distinct().count()
    )
    return {
        "data": _product_rating_data(rating),
        "meta": {
            "model_rating": {
                "rating_average": round(m_agg["avg"], 1) if m_agg["avg"] is not None else 0,
                "rating_count": m_agg["count"] or 0,
                "rated_listings_count": rated_listings,
            }
        },
    }
