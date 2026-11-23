"""Seed realistic verified stores, listings, media, ratings, and test accounts for staging."""

import hashlib
from decimal import Decimal
from io import BytesIO
import uuid
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from PIL import Image, ImageDraw
from core.catalog.models import Brand, PhoneModel, Variant
from core.identity.models import Account
from core.listings.models import Listing, ListingMedia, PriceHistory
from core.media.models import MediaAsset, VerificationDocument
from core.media.storage import storage
from core.operations.models import CustomerReport, Rating
from core.stores.models import Membership, Store, Verification

SAMPLE_PDF = (
    b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    b"trailer\n<< /Root 1 0 R >>\n%%EOF\n"
)


def _make_phone_jpeg(bg_hex: str, accent_hex: str, label: str) -> bytes:
    img = Image.new("RGB", (800, 600), bg_hex)
    draw = ImageDraw.Draw(img)
    # Stylized phone silhouette card
    draw.rounded_rectangle([260, 70, 540, 530], radius=36, fill=accent_hex, outline="#FFFFFF", width=4)
    draw.rounded_rectangle([280, 105, 520, 495], radius=22, fill="#0F172A")
    draw.ellipse([385, 84, 415, 96], fill="#334155")
    draw.text((310, 280), label[:24], fill="#F8FAFC")
    buf = BytesIO()
    img.save(buf, "JPEG", quality=88)
    return buf.getvalue()


def _create_ready_asset(store, purpose: str, kind: str, data: bytes, content_type="image/jpeg"):
    asset_id = uuid.uuid4()
    provider = storage()
    ext = "pdf" if content_type == "application/pdf" else "jpg"
    prefix = "public" if purpose == "listing" else "evidence"
    key = f"{prefix}/{store.pk}/{asset_id}.{ext}"
    provider.write(key, data, content_type)
    thumb_key = ""
    if purpose == "listing":
        img = Image.open(BytesIO(data))
        img.thumbnail((320, 320))
        tbuf = BytesIO()
        img.save(tbuf, "JPEG", quality=80)
        thumb_key = f"public/{store.pk}/{asset_id}-thumb.jpg"
        provider.write(thumb_key, tbuf.getvalue(), "image/jpeg")
    return MediaAsset.objects.create(
        id=asset_id,
        store=store,
        purpose=purpose,
        kind=kind,
        content_type=content_type,
        size=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        upload_key=f"quarantine/{store.pk}/{asset_id}",
        processed_key=key,
        thumbnail_key=thumb_key,
        status="ready",
        expires_at=timezone.now() + timezone.timedelta(days=1),
    )


class Command(BaseCommand):
    help = "Seed demo accounts, verified stores, published listings, ratings and reports."

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        # 1. Founder / Admin
        founder, created = User.objects.get_or_create(
            username="+249910000001",
            defaults={
                "email": "founder@sudanphones.sd",
                "first_name": "Tariq Al-Fatih (Founder)",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            founder.set_password("SudanAdmin@2026")
            founder.save()
        Account.objects.get_or_create(
            user=founder,
            defaults={
                "phone": "+249910000001",
                "phone_verified": True,
                "email_verified": True,
                "is_merchant": False,
            },
        )

        # 2. Buyer account
        buyer, created = User.objects.get_or_create(
            username="+249911111111",
            defaults={
                "email": "buyer@sudanphones.sd",
                "first_name": "Ahmed Al-Tayeb",
            },
        )
        if created:
            buyer.set_password("Buyer@2026")
            buyer.save()
        Account.objects.get_or_create(
            user=buyer,
            defaults={
                "phone": "+249911111111",
                "phone_verified": True,
                "email_verified": True,
                "preferred_city": "khartoum",
            },
        )

        # 3. Ensure core brands, models, and variants exist
        brand_defs = [
            ("Apple", "apple", "آبل"),
            ("Samsung", "samsung", "سامسونج"),
            ("Xiaomi", "xiaomi", "شاومي"),
            ("Tecno", "tecno", "تكنو"),
            ("Infinix", "infinix", "إنفنكس"),
        ]
        brands = {}
        for name, slug, name_ar in brand_defs:
            b, _ = Brand.objects.get_or_create(name=name, defaults={"slug": slug, "name_ar": name_ar})
            if not b.slug or not b.name_ar:
                b.slug = b.slug or slugify(name)
                b.name_ar = b.name_ar or name_ar
                b.save(update_fields=["slug", "name_ar"])
            brands[name] = b

        model_defs = [
            ("Apple", "iPhone 15 Pro Max", 256, 8, "Natural Titanium", {
                "display": {"size": "6.7 inch", "type": "LTPO Super Retina XDR OLED, 120Hz", "resolution": "1290 x 2796"},
                "platform": {"os": "iOS 17", "chipset": "Apple A17 Pro (3 nm)"},
                "memory": {"ram": "8 GB", "storage": "256 GB"},
                "camera": {"main": "48 MP + 12 MP + 12 MP", "selfie": "12 MP"},
                "battery": {"capacity": "4441 mAh", "charging": "USB-C PD / 15W MagSafe"},
            }),
            ("Apple", "iPhone 14 Pro", 128, 6, "Deep Purple", {
                "display": {"size": "6.1 inch", "type": "LTPO Super Retina XDR OLED, 120Hz"},
                "platform": {"os": "iOS 16", "chipset": "Apple A16 Bionic"},
                "memory": {"ram": "6 GB", "storage": "128 GB"},
                "camera": {"main": "48 MP Triple", "selfie": "12 MP"},
                "battery": {"capacity": "3200 mAh"},
            }),
            ("Samsung", "Galaxy S24 Ultra", 256, 12, "Titanium Gray", {
                "display": {"size": "6.8 inch", "type": "Dynamic LTPO AMOLED 2X, 120Hz", "resolution": "1440 x 3120"},
                "platform": {"os": "Android 14, One UI 6.1", "chipset": "Snapdragon 8 Gen 3"},
                "memory": {"ram": "12 GB", "storage": "256 GB"},
                "camera": {"main": "200 MP + 50 MP + 12 MP + 10 MP", "selfie": "12 MP"},
                "battery": {"capacity": "5000 mAh", "charging": "45W wired"},
            }),
            ("Samsung", "Galaxy A55 5G", 256, 8, "Awesome Navy", {
                "display": {"size": "6.6 inch", "type": "Super AMOLED, 120Hz"},
                "platform": {"os": "Android 14", "chipset": "Exynos 1480"},
                "memory": {"ram": "8 GB", "storage": "256 GB"},
                "camera": {"main": "50 MP + 12 MP + 5 MP", "selfie": "32 MP"},
                "battery": {"capacity": "5000 mAh", "charging": "25W wired"},
            }),
            ("Xiaomi", "Redmi Note 13 Pro", 256, 8, "Midnight Black", {
                "display": {"size": "6.67 inch", "type": "AMOLED, 120Hz"},
                "platform": {"os": "Android 13, MIUI 14", "chipset": "Snapdragon 7s Gen 2"},
                "memory": {"ram": "8 GB", "storage": "256 GB"},
                "camera": {"main": "200 MP + 8 MP + 2 MP", "selfie": "16 MP"},
                "battery": {"capacity": "5100 mAh", "charging": "67W turbo"},
            }),
            ("Tecno", "Camon 30 Pro 5G", 256, 12, "Iceland Basaltic Dark", {
                "display": {"size": "6.78 inch", "type": "AMOLED, 144Hz"},
                "platform": {"os": "Android 14", "chipset": "Dimensity 8200 Ultimate"},
                "memory": {"ram": "12 GB", "storage": "256 GB"},
                "camera": {"main": "50 MP OIS Triple", "selfie": "50 MP AF"},
                "battery": {"capacity": "5000 mAh", "charging": "70W Ultra Charge"},
            }),
        ]
        variants = {}
        for bname, mname, storage_gb, ram_gb, color, specs in model_defs:
            pm, _ = PhoneModel.objects.get_or_create(
                brand=brands[bname], name=mname, defaults={"specifications": specs}
            )
            if not pm.specifications:
                pm.specifications = specs
                pm.save(update_fields=["specifications"])
            var, _ = Variant.objects.get_or_create(
                model=pm, storage_gb=storage_gb, ram_gb=ram_gb, color=color
            )
            variants[mname] = (pm, var)

        # 4. Verified Stores + Pending Store
        store_defs = [
            {
                "username": "+249912345678",
                "email": "merchant@sudanphones.sd",
                "owner_name": "Omar Al-Siddiq",
                "store_name": "متجر النيل للهواتف — Nile Mobile Hub",
                "city": "khartoum",
                "address": "شارع القصر، عمارة الذهب، الطابق الأرضي — الخرطوم",
                "location_guidance": "بجوار بنك الخرطوم فرع شارع القصر",
                "description": "أجهزة أصلية مختومة ومستعملة مفحوصة بضمان فعلي في الخرطوم.",
                "phone": "+249912345678",
                "whatsapp": "+249912345678",
                "opening_hours": "السبت - الخميس: 9:00 ص - 9:00 م",
                "status": "verified",
            },
            {
                "username": "+249912345679",
                "email": "redsea@sudanphones.sd",
                "owner_name": "Yassin Osman",
                "store_name": "البحر الأحمر فونز — Red Sea Phones",
                "city": "port_sudan",
                "address": "السوق الرئيسي، تقاطع شارع الميناء — بورتسودان",
                "location_guidance": "مقابل مسجد السوق الكبير",
                "description": "تشكيلة واسعة من هواتف آبل وسامسونج وشاومي في بورتسودان.",
                "phone": "+249912345679",
                "whatsapp": "+249912345679",
                "opening_hours": "يومياً: 10:00 ص - 10:00 م",
                "status": "verified",
            },
            {
                "username": "+249912345681",
                "email": "jazirah@sudanphones.sd",
                "owner_name": "Khalid Ibrahim",
                "store_name": "الجزيرة موبايل — Al Jazirah Mobile",
                "city": "al_jazirah",
                "address": "السوق الكبير، شارع النيل — ود مدني",
                "location_guidance": "قرب موقف ود مدني الرئيسي",
                "description": "هواتف جديدة ومستعملة بأسعار منافسة وضمان استبدال في ولاية الجزيرة.",
                "phone": "+249912345681",
                "whatsapp": "+249912345681",
                "opening_hours": "السبت - الخميس: 9:30 ص - 8:30 م",
                "status": "verified",
            },
            {
                "username": "+249912345680",
                "email": "pending@sudanphones.sd",
                "owner_name": "Mustafa Hassan",
                "store_name": "أم درمان تيك — Omdurman Tech",
                "city": "omdurman",
                "address": "سوق أم درمان الشعبي، شارع الأربعين",
                "location_guidance": "بجوار عمارة البركة",
                "description": "متجر متخصص في الهواتف الذكية بانتظار اعتماد التوثيق.",
                "phone": "+249912345680",
                "whatsapp": "+249912349900",
                "opening_hours": "السبت - الخميس: 10:00 ص - 9:00 م",
                "status": "pending_verification",
            },
        ]

        created_stores = {}
        for sd in store_defs:
            u, u_created = User.objects.get_or_create(
                username=sd["username"],
                defaults={"email": sd["email"], "first_name": sd["owner_name"]},
            )
            if u_created:
                u.set_password("Merchant@2026")
                u.save()
            Account.objects.get_or_create(
                user=u,
                defaults={
                    "phone": sd["username"],
                    "phone_verified": True,
                    "email_verified": True,
                    "is_merchant": True,
                },
            )
            store, _ = Store.objects.get_or_create(
                owner=u,
                defaults={
                    "name": sd["store_name"],
                    "city": sd["city"],
                    "address": sd["address"],
                    "location_guidance": sd["location_guidance"],
                    "description": sd["description"],
                    "phone": sd["phone"],
                    "whatsapp": sd["whatsapp"],
                    "opening_hours": sd["opening_hours"],
                    "status": sd["status"],
                },
            )
            Membership.objects.get_or_create(store=store, user=u, defaults={"role": "owner"})
            created_stores[sd["city"]] = (u, store)

            if sd["status"] == "pending_verification" and not Verification.objects.filter(store=store).exists():
                v = Verification.objects.create(
                    store=store,
                    request_type="initial",
                    status="pending_verification",
                    profile={
                        "name": store.name,
                        "city": store.city,
                        "address": store.address,
                        "phone": store.phone,
                        "whatsapp": store.whatsapp,
                    },
                )
                id_asset = _create_ready_asset(store, "verification", "id_front", _make_phone_jpeg("#1E293B", "#0F6B5D", "National ID"))
                pdf_asset = _create_ready_asset(store, "verification", "commercial", SAMPLE_PDF, "application/pdf")
                VerificationDocument.objects.create(verification=v, asset=id_asset)
                VerificationDocument.objects.create(verification=v, asset=pdf_asset)

        # 5. Seed published listings if none exist yet
        if Listing.objects.count() == 0:
            listing_specs = [
                ("khartoum", "iPhone 15 Pro Max", "new", Decimal("2850000.00"), 5, "new", 100, "", 12, None, True, True, True, "#0F172A", "#334155"),
                ("khartoum", "Galaxy S24 Ultra", "new", Decimal("2620000.00"), 4, "new", 100, "", 12, None, True, True, True, "#1E293B", "#475569"),
                ("khartoum", "iPhone 14 Pro", "used", Decimal("1580000.00"), 1, "excellent", 91, "خدش طفيف جداً في الإطار الجانبي، الشاشة نظيفة 100%", None, 30, False, True, False, "#312E81", "#4338CA"),
                ("khartoum", "Redmi Note 13 Pro", "new", Decimal("790000.00"), 12, "new", 100, "", 12, None, True, True, False, "#134E4A", "#0F766E"),
                ("port_sudan", "iPhone 15 Pro Max", "new", Decimal("2790000.00"), 3, "new", 100, "", 12, None, True, True, True, "#0F172A", "#0F6B5D"),
                ("port_sudan", "Galaxy A55 5G", "new", Decimal("960000.00"), 8, "new", 100, "", 12, None, True, True, False, "#1E3A5F", "#2563EB"),
                ("port_sudan", "Galaxy S24 Ultra", "used", Decimal("2150000.00"), 1, "like_new", 96, "بحالة الوكالة مع القلم والكرتونة الأصلية", None, 45, False, True, False, "#1F2937", "#374151"),
                ("al_jazirah", "Camon 30 Pro 5G", "new", Decimal("740000.00"), 10, "new", 100, "", 12, None, True, True, True, "#064E3B", "#047857"),
                ("al_jazirah", "Redmi Note 13 Pro", "new", Decimal("775000.00"), 7, "new", 100, "", 12, None, True, True, False, "#0F172A", "#0D9488"),
            ]
            first_listing = None
            for city, mname, cond, price, qty, grade, batt, defects, w_mo, w_days, sealed, box, feat, bg, acc in listing_specs:
                owner_user, store = created_stores[city]
                _, var = variants[mname]
                lst = Listing.objects.create(
                    store=store,
                    variant=var,
                    condition=cond,
                    price=price,
                    quantity=qty,
                    grade=grade,
                    battery_health=batt,
                    defects=defects,
                    used_availability="available" if cond == "used" else "",
                    used_unit_code=f"SD-{store.pk}01" if cond == "used" else "",
                    warranty_months=w_mo,
                    warranty_days=w_days,
                    warranty_type="ضمان الوكيل المعتمد" if cond == "new" else "ضمان فحص المتجر",
                    is_sealed=sealed,
                    has_original_box=box,
                    featured=feat,
                    status="published",
                    moderation="approved",
                    published_at=timezone.now(),
                    views=24,
                    contact_leads=5,
                )
                if first_listing is None:
                    first_listing = lst
                kinds = ["front", "back", "screen"] if cond == "used" else ["seal", "front"]
                for idx, kind in enumerate(kinds):
                    asset = _create_ready_asset(
                        store, "listing", kind, _make_phone_jpeg(bg, acc, f"{mname} ({kind})")
                    )
                    ListingMedia.objects.create(listing=lst, asset=asset, position=idx)
                PriceHistory.objects.create(listing=lst, actor=owner_user, price=price)

            # Sample ratings (authenticated buyer)
            Rating.objects.get_or_create(
                author=buyer,
                store=created_stores["khartoum"][1],
                defaults={"target_type": "store", "stars": 5, "comment": "متجر ممتاز وتعامل راقٍ وأسعار مطابقة للإعلان."},
            )
            Rating.objects.get_or_create(
                author=buyer,
                phone_model=variants["iPhone 15 Pro Max"][0],
                defaults={"target_type": "phone_model", "stars": 5, "comment": "أداء ممتاز وكاميرا احترافية وبطارية تصمد طوال اليوم."},
            )
            if first_listing:
                CustomerReport.objects.get_or_create(
                    listing=first_listing,
                    defaults={
                        "target_type": "listing",
                        "reason": "misleading_price",
                        "details": "بلاغ تجريبي لمراجعة لوحة الإشراف في بوابة الإدارة.",
                        "reporter_contact": "+249911111111",
                        "reporter": buyer,
                    },
                )

        self.stdout.write(self.style.SUCCESS("Seeded demo marketplace successfully."))
