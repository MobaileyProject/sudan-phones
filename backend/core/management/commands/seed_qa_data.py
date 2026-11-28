"""Idempotent management command to seed rich Sudanese marketplace QA data (50 stores, 300 listings)."""

from datetime import timedelta
from decimal import Decimal
import hashlib
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
from core.operations.models import (
    AdminRole,
    CustomerNotification,
    CustomerReport,
    Favorite,
    PriceAlert,
    Rating,
    RoleAssignment,
    SponsoredAd,
    SponsoredAdDailyStat,
    StoreChatMessage,
    StoreChatThread,
    StoreDailyMetrics,
)
from core.stores.models import Membership, Store, Verification

SAMPLE_PDF = (
    b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    b"trailer\n<< /Root 1 0 R >>\n%%EOF\n"
)

BRAND_DEFS = [
    ("Apple", "apple", "آبل", "#0F172A", "#334155"),
    ("Samsung", "samsung", "سامسونج", "#1E293B", "#1D4ED8"),
    ("Xiaomi", "xiaomi", "شاومي", "#1F2937", "#EA580C"),
    ("Tecno", "tecno", "تكنو", "#064E3B", "#059669"),
    ("Infinix", "infinix", "إنفنكس", "#134E4A", "#0D9488"),
    ("Oppo", "oppo", "أوبو", "#14532D", "#16A34A"),
    ("Realme", "realme", "ريلمي", "#422006", "#CA8A04"),
    ("Huawei", "huawei", "هواوي", "#450A0A", "#DC2626"),
]


def _make_specs(year, series, size, dtype, res, hz, chip, os_name, rmp, rear, ois, front, mah, wired, wless, fp, ip):
    return {
        "release_year": year,
        "series": series,
        "display": {"size_inches": size, "type": dtype, "resolution": res, "refresh_rate_hz": hz},
        "performance": {"chipset": chip, "os": os_name},
        "camera": {
            "rear_main_mp": rmp,
            "rear": rear,
            "rear_ois": ois,
            "front": front,
            "front_mp": int("".join(ch for ch in front.split()[0] if ch.isdigit()) or 12),
            "video": "4K@60fps" if rmp >= 48 else "1080p@30fps",
        },
        "battery": {"capacity_mah": mah, "charging_wired_w": wired, "charging_wireless_w": wless},
        "connectivity": {
            "network": "5G / 4G LTE" if year >= 2023 and rmp >= 48 else "4G LTE",
            "sim": "Dual Nano-SIM",
            "nfc": rmp >= 48,
            "usb": "USB Type-C",
            "headphone_jack": series in ("Budget", "Midrange") and year <= 2024,
            "microsd": series in ("Budget", "Midrange"),
        },
        "build": {"fingerprint": fp, "ip_rating": ip},
    }


MODEL_CATALOG = [
    # (brand, model, price_new_sdg, specs, variants=[(storage, ram, color), ...])
    (
        "Apple",
        "iPhone 15 Pro Max",
        2950000,
        _make_specs(2023, "Pro Max", 6.7, "LTPO Super Retina XDR OLED", "1290 x 2796", 120, "Apple A17 Pro", "iOS 17", 48, "48 MP + 12 MP + 12 MP", True, "12 MP", 4441, 27, 15, "Face ID", "IP68"),
        [(256, 8, "Natural Titanium"), (512, 8, "Black Titanium")],
    ),
    (
        "Apple",
        "iPhone 14 Pro",
        2150000,
        _make_specs(2022, "Pro", 6.1, "LTPO Super Retina XDR OLED", "1179 x 2556", 120, "Apple A16 Bionic", "iOS 17", 48, "48 MP + 12 MP + 12 MP", True, "12 MP", 3200, 20, 15, "Face ID", "IP68"),
        [(128, 6, "Deep Purple"), (256, 6, "Space Black")],
    ),
    (
        "Apple",
        "iPhone 13",
        1420000,
        _make_specs(2021, "Mainline", 6.1, "Super Retina XDR OLED", "1170 x 2532", 60, "Apple A15 Bionic", "iOS 17", 12, "12 MP + 12 MP", True, "12 MP", 3240, 20, 15, "Face ID", "IP68"),
        [(128, 4, "Midnight"), (256, 4, "Starlight")],
    ),
    (
        "Samsung",
        "Galaxy S24 Ultra",
        2750000,
        _make_specs(2024, "S Ultra", 6.8, "Dynamic LTPO AMOLED 2X", "1440 x 3120", 120, "Snapdragon 8 Gen 3", "Android 14", 200, "200 MP + 50 MP + 12 MP + 10 MP", True, "12 MP", 5000, 45, 15, "Ultrasonic", "IP68"),
        [(256, 12, "Titanium Gray"), (512, 12, "Titanium Violet")],
    ),
    (
        "Samsung",
        "Galaxy A55 5G",
        960000,
        _make_specs(2024, "Midrange", 6.6, "Super AMOLED", "1080 x 2340", 120, "Exynos 1480", "Android 14", 50, "50 MP + 12 MP + 5 MP", True, "32 MP", 5000, 25, 0, "Under-display", "IP67"),
        [(128, 8, "Awesome Navy"), (256, 8, "Awesome Iceblue")],
    ),
    (
        "Samsung",
        "Galaxy A15",
        490000,
        _make_specs(2024, "Budget", 6.5, "Super AMOLED", "1080 x 2340", 90, "Helio G99", "Android 14", 50, "50 MP + 5 MP + 2 MP", False, "13 MP", 5000, 25, 0, "Side-mounted", "Splash Resistant"),
        [(128, 6, "Brave Black"), (256, 8, "Optimistic Blue")],
    ),
    (
        "Xiaomi",
        "Redmi Note 13 Pro",
        790000,
        _make_specs(2024, "Midrange", 6.67, "AMOLED", "1220 x 2712", 120, "Snapdragon 7s Gen 2", "Android 14", 200, "200 MP + 8 MP + 2 MP", True, "16 MP", 5100, 67, 0, "Under-display", "IP54"),
        [(256, 8, "Midnight Black"), (512, 12, "Aurora Purple")],
    ),
    (
        "Xiaomi",
        "Redmi 13C",
        430000,
        _make_specs(2023, "Budget", 6.74, "IPS LCD", "720 x 1600", 90, "Helio G85", "Android 13", 50, "50 MP + 2 MP", False, "8 MP", 5000, 18, 0, "Side-mounted", "Splash Resistant"),
        [(128, 6, "Clover Green"), (256, 8, "Starlight Black")],
    ),
    (
        "Xiaomi",
        "Poco X6 Pro",
        1120000,
        _make_specs(2024, "Performance", 6.67, "AMOLED", "1220 x 2712", 120, "Dimensity 8300 Ultra", "Android 14", 64, "64 MP + 8 MP + 2 MP", True, "16 MP", 5000, 67, 0, "Under-display", "IP54"),
        [(256, 8, "Black"), (512, 12, "Yellow")],
    ),
    (
        "Tecno",
        "Camon 30 Pro 5G",
        890000,
        _make_specs(2024, "Midrange", 6.78, "AMOLED", "1080 x 2436", 144, "Dimensity 8200 Ultimate", "Android 14", 50, "50 MP + 50 MP + 2 MP", True, "50 MP", 5000, 70, 0, "Under-display", "IP53"),
        [(256, 12, "Iceland Basaltic Dark"), (512, 12, "Alps Snowy Silver")],
    ),
    (
        "Tecno",
        "Spark 20 Pro",
        560000,
        _make_specs(2024, "Budget", 6.78, "IPS LCD", "1080 x 2460", 120, "Helio G99", "Android 13", 108, "108 MP + 2 MP", False, "32 MP", 5000, 33, 0, "Side-mounted", "IP53"),
        [(256, 8, "Moonlit Black"), (256, 8, "Frosty Ivory")],
    ),
    (
        "Infinix",
        "Note 40 Pro",
        860000,
        _make_specs(2024, "Midrange", 6.78, "Curved AMOLED", "1080 x 2436", 120, "Helio G99 Ultimate", "Android 14", 108, "108 MP + 2 MP + 2 MP", True, "32 MP", 5000, 70, 20, "Under-display", "IP54"),
        [(256, 8, "Vintage Green"), (256, 12, "Titan Gold")],
    ),
    (
        "Infinix",
        "Hot 40 Pro",
        520000,
        _make_specs(2024, "Budget", 6.78, "IPS LCD", "1080 x 2460", 120, "Helio G99", "Android 13", 108, "108 MP + 2 MP", False, "32 MP", 5000, 33, 0, "Side-mounted", "Splash Resistant"),
        [(128, 8, "Palm Blue"), (256, 8, "Starfall Green")],
    ),
    (
        "Oppo",
        "Reno 11 5G",
        1180000,
        _make_specs(2024, "Midrange", 6.7, "Curved AMOLED", "1080 x 2412", 120, "Dimensity 7050", "Android 14", 50, "50 MP + 32 MP + 8 MP", True, "32 MP", 5000, 67, 0, "Under-display", "IP54"),
        [(256, 12, "Wave Green"), (256, 12, "Rock Grey")],
    ),
    (
        "Oppo",
        "A79 5G",
        690000,
        _make_specs(2023, "Budget", 6.72, "IPS LCD", "1080 x 2400", 90, "Dimensity 6020", "Android 13", 50, "50 MP + 2 MP", False, "8 MP", 5000, 33, 0, "Side-mounted", "IP54"),
        [(128, 8, "Mystery Black"), (256, 8, "Glowing Green")],
    ),
    (
        "Realme",
        "12 Pro+",
        1090000,
        _make_specs(2024, "Midrange", 6.7, "Curved AMOLED", "1080 x 2412", 120, "Snapdragon 7s Gen 2", "Android 14", 50, "50 MP + 64 MP Periscope + 8 MP", True, "32 MP", 5000, 67, 0, "Under-display", "IP65"),
        [(256, 12, "Submarine Blue"), (512, 12, "Navigator Beige")],
    ),
    (
        "Realme",
        "C67",
        540000,
        _make_specs(2024, "Budget", 6.72, "IPS LCD", "1080 x 2400", 90, "Snapdragon 685", "Android 14", 108, "108 MP + 2 MP", False, "8 MP", 5000, 33, 0, "Side-mounted", "IP54"),
        [(128, 6, "Sunny Oasis"), (256, 8, "Black Rock")],
    ),
    (
        "Huawei",
        "Pura 70 Pro",
        2480000,
        _make_specs(2024, "Flagship", 6.8, "LTPO OLED", "1260 x 2844", 120, "Kirin 9010", "EMUI 14.2", 50, "50 MP + 48 MP + 12.5 MP", True, "13 MP", 5050, 100, 80, "Under-display", "IP68"),
        [(512, 12, "White"), (512, 12, "Black")],
    ),
    (
        "Huawei",
        "nova 12 SE",
        880000,
        _make_specs(2024, "Midrange", 6.67, "OLED", "1080 x 2400", 90, "Snapdragon 680", "EMUI 14", 108, "108 MP + 8 MP + 2 MP", False, "32 MP", 4500, 66, 0, "Side-mounted", "Splash Resistant"),
        [(256, 8, "Green"), (256, 8, "Black")],
    ),
]

SUDAN_STORE_SEEDS = [
    # 50 stores across Sudan states/cities with lat/lng & bilingual names
    ("khartoum", "النيل للهواتف · Nile Mobile Hub", "شارع القصر، عمارة الذهب — الخرطوم", 15.5960, 32.5320),
    ("khartoum", "بحري تيك · Bahri Tech Center", "شارع المعونة، بحري المؤسسة — الخرطوم بحري", 15.6350, 32.5510),
    ("khartoum", "الرياض فونز · Al-Riyadh Phones", "شارع المشتل، حي الرياض — الخرطوم", 15.5680, 32.5670),
    ("khartoum", "السوق العربي ستور · Arab Market Store", "السوق العربي، بلوك 4 — الخرطوم", 15.5985, 32.5230),
    ("khartoum", "عفراء موبايل · Afra Mobile Gallery", "أركويت، قرب عفراء مول — الخرطوم", 15.5530, 32.5620),
    ("khartoum", "المقرن إكسبرس · Mogran Express Phones", "المقرن، شارع الغابة — الخرطوم", 15.6030, 32.5120),
    ("khartoum", "شمبات سمارت · Shambat Smart Phones", "شارع الزعيم الأزهري، شمبات — الخرطوم بحري", 15.6540, 32.5380),
    ("khartoum", "العمارات ديجيتال · Amarat Digital", "العمارات شارع 15 — الخرطوم", 15.5810, 32.5480),
    ("omdurman", "أم درمان الكبرى · Grand Omdurman Mobile", "سوق أم درمان الكبير، شارع الصاغة", 15.6460, 32.4820),
    ("omdurman", "الثورة للهواتف · Al-Thawra Phones", "الثورة الحارة السابعة — أم درمان", 15.6890, 32.4730),
    ("omdurman", "المهندسين تيليكوم · Mohandessin Telecom", "حي المهندسين، شارع الأربعين — أم درمان", 15.6390, 32.4640),
    ("omdurman", "بانت موبايل · Banat Mobile Plaza", "حي بانت، قرب سوق ليبيا — أم درمان", 15.6510, 32.4480),
    ("omdurman", "الشهداء فونز · Shuhada Phones Hub", "ميدان الشهداء — أم درمان", 15.6410, 32.4860),
    ("port_sudan", "البحر الأحمر فونز · Red Sea Phones", "السوق الرئيسي، شارع الميناء — بورتسودان", 19.6165, 37.2165),
    ("port_sudan", "مرسى تيك · Marsa Tech Port Sudan", "حي المطار، سوق ديم جابر — بورتسودان", 19.6090, 37.2240),
    ("port_sudan", "سواكن موبايل · Suakin Mobile Outlet", "حي الخليج، تقاطع البريد — بورتسودان", 19.6220, 37.2090),
    ("port_sudan", "سللاب ستور · Salalab Smart Store", "سوق سلالاب التجاري — بورتسودان", 19.6310, 37.1980),
    ("port_sudan", "ترانزيت فونز · Transit Port Phones", "حي ترانزيت — بورتسودان", 19.6130, 37.2110),
    ("al_jazirah", "الجزيرة موبايل · Al-Jazirah Mobile", "السوق الكبير، شارع النيل — ود مدني", 14.4020, 33.5190),
    ("al_jazirah", "ود مدني تيك · Wad Madani Tech", "شارع الدكاترة، السوق المركزي — ود مدني", 14.3980, 33.5240),
    ("al_jazirah", "المناقل سمارت · Al-Manaqil Smart Hub", "سوق المناقل التجاري — ولاية الجزيرة", 14.2460, 32.9890),
    ("al_jazirah", "الحصاحيصا فونز · Hasaheisa Phones", "السوق الشعبي — الحصاحيصا، الجزيرة", 14.7490, 33.2980),
    ("kassala", "توتيل للهواتف · Totil Phones Kassala", "السوق الكبير، قرب جبل توتيل — كسلا", 15.4520, 36.4010),
    ("kassala", "القاش موبايل · Al-Gash Mobile Hub", "حي الميرغنية، شارع الجمهورية — كسلا", 15.4480, 36.3950),
    ("kassala", "الشرق تيك · Al-Sharq Tech Store", "السوق الشعبي — كسلا", 15.4560, 36.4060),
    ("north_kordofan", "الأبيض موبايل · El-Obeid Mobile", "سوق الأبيض الكبير، شارع الجمهورية", 13.1840, 30.2170),
    ("north_kordofan", "كردفان تيك · Kordofan Tech Plaza", "شارع السينما — الأبيض، شمال كردفان", 13.1890, 30.2210),
    ("north_kordofan", "عروس الرمال فونز · Sand Bride Phones", "حي القبة — الأبيض، شمال كردفان", 13.1780, 30.2110),
    ("river_nile", "عطبرة للهواتف · Atbara Phones Center", "السوق الكبير، شارع السكة حديد — عطبرة", 17.7025, 33.9870),
    ("river_nile", "نهر النيل تيك · River Nile Tech", "سوق الدامر العمومي — الدامر", 17.5920, 33.9590),
    ("river_nile", "شندي موبايل · Shendi Mobile Store", "السوق الكبير — شندي، نهر النيل", 16.6915, 33.4340),
    ("gedaref", "القضارف سمارت · Gedaref Smart Hub", "السوق العمومي، بلوك 2 — القضارف", 14.0355, 35.3840),
    ("gedaref", "سمسم تيليكوم · Simsim Telecom", "حي الديم — القضارف", 14.0390, 35.3790),
    ("gedaref", "الفاو فونز · Al-Faw Phones", "سوق القضارف الجديد — القضارف", 14.0310, 35.3880),
    ("south_darfur", "نيالا موبايل · Nyala Mobile Market", "سوق نيالا الكبير — جنوب دارفور", 12.0495, 24.8810),
    ("south_darfur", "جبل مرة فونز · Marra Phones Nyala", "حي المطار، السوق الشعبي — نيالا", 12.0540, 24.8860),
    ("white_nile", "كوستي للهواتف · Kosti Phones Hub", "السوق الكبير، شارع النيل — كوستي", 13.1635, 32.6640),
    ("white_nile", "ربك تيك · Rabak Tech Center", "سوق ربك العمومي — النيل الأبيض", 13.1810, 32.7400),
    ("sennar", "سنار موبايل · Sennar Mobile Plaza", "سوق سنجة الكبير — ولاية سنار", 13.1500, 33.9340),
    ("sennar", "النيل الأزرق سنار · Sennar Bridge Phones", "سوق سنار التقاطع — ولاية سنار", 13.5690, 33.5675),
    ("northern", "دنقلا سمارت · Dongola Smart Store", "سوق دنقلا الكبير — الولاية الشمالية", 19.1700, 30.4750),
    ("northern", "كريمة فونز · Karima Phones Hub", "السوق العمومي — كريمة، الشمالية", 18.5500, 31.8500),
    # 5 Pending verification stores (#43..47)
    ("khartoum", "أركويت سمارت · Arkawit Smart Store (Pending)", "أركويت مربع 45 — الخرطوم", 15.5580, 32.5710),
    ("omdurman", "الفتيحاب تيك · Al-Fitihab Tech (Pending)", "سوق الفتيحاب — أم درمان", 15.6120, 32.4890),
    ("port_sudan", "ديم العرب موبايل · Deim Al-Arab Mobile (Pending)", "حي ديم العرب — بورتسودان", 19.6190, 37.2130),
    ("kassala", "حلفا الجديدة فونز · New Halfa Phones (Pending)", "السوق الرئيسي — حلفا الجديدة", 15.3280, 35.6010),
    ("blue_nile", "الدمازين تيليكوم · Damazin Telecom (Pending)", "سوق الدمازين الكبير — النيل الأزرق", 11.7895, 34.3595),
    # 2 Changes requested stores (#48..49)
    ("north_darfur", "الفاشر موبايل · El-Fasher Mobile", "سوق الفاشر العمومي — شمال دارفور", 13.6285, 25.3498),
    ("al_jazirah", "رفاعة فونز · Rufaa Phones Corner", "سوق رفاعة الكبير — الجزيرة", 14.7760, 33.3620),
    # 1 Suspended store (#50)
    ("omdurman", "ليبيا تيليكوم · Libya Market Telecom", "سوق ليبيا — أم درمان", 15.6580, 32.4190),
]

USED_GRADES = ["like_new", "excellent", "good", "fair"]
DEFECT_NOTES = [
    ("like_new", 96, "بحالة الوكالة تماماً مع العلبة الأصلية والشاحن، بدون أي خدوش."),
    ("excellent", 91, "نظيف جداً بدون صيانة، خدش طفيف لا يُذكر على الإطار الجانبي."),
    ("good", 85, "شاشة أصلية وبصمة سريعة، أثر استخدام بسيط في الغطاء الخلفي."),
    ("fair", 79, "استخدام متوسط، البطارية بحالة جيدة وكل القطع أصلية مفحوصة."),
]


def _make_phone_jpeg(bg_hex: str, accent_hex: str, title: str) -> bytes:
    img = Image.new("RGB", (800, 600), bg_hex)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([260, 65, 540, 535], radius=38, fill=accent_hex, outline="#FFFFFF", width=4)
    draw.rounded_rectangle([278, 100, 522, 495], radius=24, fill="#0F172A")
    draw.ellipse([382, 80, 418, 92], fill="#475569")
    draw.text((298, 285), title[:26], fill="#F8FAFC")
    buf = BytesIO()
    img.save(buf, "JPEG", quality=84)
    return buf.getvalue()


def _create_ready_asset(store, purpose: str, kind: str, data: bytes, thumb_data: bytes = b"", content_type="image/jpeg"):
    asset_id = uuid.uuid4()
    provider = storage()
    ext = "pdf" if content_type == "application/pdf" else "jpg"
    prefix = "public" if purpose == "listing" else "evidence"
    key = f"{prefix}/{store.pk}/{asset_id}.{ext}"
    provider.write(key, data, content_type)
    thumb_key = ""
    if purpose == "listing" and thumb_data:
        thumb_key = f"public/{store.pk}/{asset_id}-thumb.jpg"
        provider.write(thumb_key, thumb_data, "image/jpeg")
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
        expires_at=timezone.now() + timedelta(days=2),
    )


class Command(BaseCommand):
    help = "Idempotently seed 50 Sudanese stores, 300 phone listings, users, reviews, alerts, chats, ads, and notifications."

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        # 1. Admin founder + delegated moderator
        founder, f_created = User.objects.get_or_create(
            username="+249910000001",
            defaults={
                "email": "founder@sudanphones.sd",
                "first_name": "Tariq Al-Fatih (Founder)",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if f_created:
            founder.set_password("SudanAdmin@2026")
            founder.save()
        Account.objects.get_or_create(
            user=founder,
            defaults={"phone": "+249910000001", "phone_verified": True, "email_verified": True},
        )

        mod_user, m_created = User.objects.get_or_create(
            username="+249910000002",
            defaults={"email": "moderator@sudanphones.sd", "first_name": "Salma Hashim (Moderator)", "is_staff": True},
        )
        if m_created:
            mod_user.set_password("SudanMod@2026")
            mod_user.save()
        Account.objects.get_or_create(
            user=mod_user,
            defaults={"phone": "+249910000002", "phone_verified": True, "email_verified": True},
        )
        mod_role, _ = AdminRole.objects.get_or_create(
            name="Operations Moderator",
            defaults={
                "description": "Review store documents, moderate listings, and resolve reports",
                "permissions": ["review_stores", "moderate_listings", "view_metrics", "view_audit_logs"],
            },
        )
        RoleAssignment.objects.get_or_create(user=mod_user, defaults={"role": mod_role})

        # 2. Buyer accounts
        buyers = []
        buyer_specs = [
            ("+249911110001", "buyer1@sudanphones.sd", "Ahmed Al-Tayeb", "khartoum"),
            ("+249911110002", "buyer2@sudanphones.sd", "Mona Abdelrahman", "omdurman"),
            ("+249911110003", "buyer3@sudanphones.sd", "Osama Babiker", "port_sudan"),
            ("+249911110004", "buyer4@sudanphones.sd", "Rania Mohamed", "al_jazirah"),
        ]
        for bphone, bemail, bname, bcity in buyer_specs:
            bu, bc = User.objects.get_or_create(
                username=bphone, defaults={"email": bemail, "first_name": bname}
            )
            if bc:
                bu.set_password("Buyer@2026")
                bu.save()
            Account.objects.get_or_create(
                user=bu,
                defaults={
                    "phone": bphone,
                    "phone_verified": True,
                    "email_verified": True,
                    "preferred_city": bcity,
                },
            )
            buyers.append(bu)

        # 3. 8 Brands + 19 PhoneModels + 38 Variants + pre-rendered JPEG templates
        brands_map = {}
        image_cache = {}
        for name, slug, name_ar, bg_hex, acc_hex in BRAND_DEFS:
            brand, _ = Brand.objects.get_or_create(
                name=name, defaults={"slug": slug, "name_ar": name_ar}
            )
            if brand.slug != slug or brand.name_ar != name_ar:
                brand.slug = slug
                brand.name_ar = name_ar
                brand.save(update_fields=["slug", "name_ar"])
            brands_map[name] = (brand, bg_hex, acc_hex)

        catalog_variants = []
        for bname, mname, base_price, specs, vlist in MODEL_CATALOG:
            brand, bg_hex, acc_hex = brands_map[bname]
            pm, created_pm = PhoneModel.objects.get_or_create(
                brand=brand, name=mname, defaults={"specifications": specs}
            )
            if not created_pm and not pm.specifications:
                pm.specifications = specs
                pm.save(update_fields=["specifications"])
            full_bytes = _make_phone_jpeg(bg_hex, acc_hex, f"{bname} {mname}")
            im = Image.open(BytesIO(full_bytes))
            im.thumbnail((320, 320))
            tb = BytesIO()
            im.save(tb, "JPEG", quality=78)
            image_cache[mname] = (full_bytes, tb.getvalue())
            for storage_gb, ram_gb, color in vlist:
                var, _ = Variant.objects.get_or_create(
                    model=pm, storage_gb=storage_gb, ram_gb=ram_gb, color=color
                )
                catalog_variants.append((bname, mname, base_price, pm, var))

        # 4. Create 50 Sudanese stores
        stores = []
        id_sample = _make_phone_jpeg("#1E293B", "#0F6B5D", "Sudan National ID")
        for idx, (city, sname, addr, lat, lng) in enumerate(SUDAN_STORE_SEEDS, start=1):
            phone = f"+24992000{idx:04d}"
            email = f"merchant{idx}@sudanphones.sd"
            owner_name = f"Merchant {idx} Owner"
            u, uc = User.objects.get_or_create(
                username=phone, defaults={"email": email, "first_name": owner_name}
            )
            if uc:
                u.set_password("Merchant@2026")
                u.save()
            Account.objects.get_or_create(
                user=u,
                defaults={
                    "phone": phone,
                    "phone_verified": True,
                    "email_verified": True,
                    "is_merchant": True,
                    "preferred_city": city,
                },
            )
            if idx <= 42:
                status = "verified"
            elif idx <= 47:
                status = "pending_verification"
            elif idx <= 49:
                status = "changes_requested"
            else:
                status = "suspended"

            store, _ = Store.objects.get_or_create(
                owner=u,
                defaults={
                    "name": sname,
                    "city": city,
                    "address": addr,
                    "location_guidance": f"قرب السوق الرئيسي · {city}",
                    "description": "متجر متخصص في الهواتف الذكية الجديدة والمستعملة المفحوصة بضمان رسمي.",
                    "latitude": Decimal(str(lat)),
                    "longitude": Decimal(str(lng)),
                    "phone": phone,
                    "whatsapp": phone,
                    "opening_hours": "السبت - الخميس: 9:30 ص - 9:30 م",
                    "accepts_trade_in": (idx % 3 == 0),
                    "status": status,
                    "feedback": "يرجى إرفاق صورة أوضح للسجل التجاري." if status == "changes_requested" else "",
                },
            )
            Membership.objects.get_or_create(store=store, user=u, defaults={"role": "owner"})
            stores.append((idx, u, store))

            if status == "verified":
                today = timezone.localdate()
                for d_off in range(7):
                    StoreDailyMetrics.objects.get_or_create(
                        store=store,
                        day=today - timedelta(days=d_off),
                        defaults={"views": 18 + (idx % 10) + d_off, "contact_leads": 2 + (idx % 4)},
                    )

            if not Verification.objects.filter(store=store).exists():
                v_status = (
                    "approved"
                    if status == "verified"
                    else "pending_verification"
                    if status == "pending_verification"
                    else "changes_requested"
                )
                ver = Verification.objects.create(
                    store=store,
                    request_type="initial",
                    status=v_status,
                    decided_at=timezone.now() if v_status == "approved" else None,
                    reviewed_by=founder if v_status == "approved" else None,
                    profile={
                        "name": store.name,
                        "city": store.city,
                        "address": store.address,
                        "phone": store.phone,
                        "whatsapp": store.whatsapp,
                    },
                )
                a1 = _create_ready_asset(store, "verification", "id_front", id_sample)
                a2 = _create_ready_asset(store, "verification", "commercial", SAMPLE_PDF, content_type="application/pdf")
                VerificationDocument.objects.create(verification=ver, asset=a1)
                VerificationDocument.objects.create(verification=ver, asset=a2)

        # Staff clerk on Store #1
        staff_user, st_c = User.objects.get_or_create(
            username="+249920000101",
            defaults={"email": "staff1@sudanphones.sd", "first_name": "Osman Clerk"},
        )
        if st_c:
            staff_user.set_password("Merchant@2026")
            staff_user.save()
        Account.objects.get_or_create(
            user=staff_user,
            defaults={"phone": "+249920000101", "phone_verified": True, "is_merchant": True},
        )
        Membership.objects.get_or_create(
            store=stores[0][2],
            user=staff_user,
            defaults={"role": "staff", "display_name": "Osman Clerk", "phone": "+249920000101"},
        )

        # 5. Seed 6 listings per store (300 total listings across all 50 stores)
        existing_listings_count = Listing.objects.count()
        published_listings = []
        if existing_listings_count < 250:
            v_len = len(catalog_variants)
            for s_idx, owner_user, store in stores:
                if Listing.objects.filter(store=store).count() >= 6:
                    continue
                target_status = "published" if store.status == "verified" else "draft"
                for slot in range(6):
                    var_idx = ((s_idx - 1) * 3 + slot * 5) % v_len
                    bname, mname, base_price, _pm, var = catalog_variants[var_idx]
                    is_used = slot % 2 == 1
                    price_factor = Decimal("0.72") if is_used else Decimal("1.0")
                    unit_price = (
                        (Decimal(base_price) * price_factor + Decimal(((s_idx % 5) - 2) * 15000))
                        / Decimal("1000")
                    ).quantize(Decimal("1")) * Decimal("1000")
                    if unit_price < Decimal("350000"):
                        unit_price = Decimal("350000")

                    has_discount = (slot in (0, 2))
                    prev_price = unit_price + Decimal("65000") if has_discount else None

                    if is_used:
                        grade, batt, defect_txt = DEFECT_NOTES[(s_idx + slot) % len(DEFECT_NOTES)]
                        lst = Listing.objects.create(
                            store=store,
                            variant=var,
                            condition="used",
                            price=unit_price,
                            previous_price=prev_price,
                            usd_price=(unit_price / Decimal("2400")).quantize(Decimal("0.01")),
                            accepts_trade_in=(slot == 3),
                            quantity=1,
                            grade=grade,
                            battery_health=batt,
                            defects=defect_txt,
                            used_availability="available",
                            used_unit_code=f"SD-{store.pk}{slot + 1}",
                            used_checklist={
                                "biometricsWorking": True,
                                "originalScreen": True,
                                "networkUnlocked": True,
                                "cleanImei": True,
                                "accessoriesIncluded": slot == 1,
                            },
                            warranty_months=None,
                            warranty_days=14 if grade in ("like_new", "excellent") else 7,
                            warranty_type="ضمان فحص المتجر",
                            is_sealed=False,
                            has_original_box=(slot == 1),
                            featured=(s_idx <= 8 and slot == 1),
                            status=target_status,
                            moderation="approved" if target_status == "published" else "pending",
                            published_at=timezone.now() if target_status == "published" else None,
                            views=15 + (s_idx % 20),
                            contact_leads=2 + (slot % 3),
                        )
                        kinds = ["front", "back"]
                    else:
                        lst = Listing.objects.create(
                            store=store,
                            variant=var,
                            condition="new",
                            price=unit_price,
                            previous_price=prev_price,
                            usd_price=(unit_price / Decimal("2400")).quantize(Decimal("0.01")),
                            accepts_trade_in=(slot == 4),
                            quantity=3 + ((s_idx + slot) % 8),
                            grade="new",
                            battery_health=100,
                            defects="",
                            used_availability="",
                            used_unit_code="",
                            warranty_months=12,
                            warranty_days=None,
                            warranty_type="ضمان الوكيل المعتمد",
                            is_sealed=True,
                            has_original_box=True,
                            featured=(s_idx <= 8 and slot == 0),
                            status=target_status,
                            moderation="approved" if target_status == "published" else "pending",
                            published_at=timezone.now() if target_status == "published" else None,
                            views=25 + (s_idx % 30),
                            contact_leads=4 + (slot % 4),
                        )
                        kinds = ["seal", "front"]

                    full_bytes, thumb_bytes = image_cache[mname]
                    for pos, k in enumerate(kinds):
                        asset = _create_ready_asset(store, "listing", k, full_bytes, thumb_bytes)
                        ListingMedia.objects.create(listing=lst, asset=asset, position=pos)
                    if prev_price:
                        PriceHistory.objects.create(listing=lst, actor=owner_user, price=prev_price)
                    PriceHistory.objects.create(listing=lst, actor=owner_user, price=unit_price)
                    if target_status == "published":
                        published_listings.append(lst)

        if not published_listings:
            published_listings = list(
                Listing.objects.filter(status="published", store__status="verified").order_by("pk")[:40]
            )

        # 6. Supporting relational data: Ratings, Favorites, PriceAlerts, Chats, Notifications, Reports, Ads
        b1, b2, b3 = buyers[0], buyers[1], buyers[2]
        for i, lst in enumerate(published_listings[:12]):
            reviewer = buyers[i % len(buyers)]
            Rating.objects.get_or_create(
                author=reviewer,
                listing=lst,
                defaults={
                    "target_type": "listing",
                    "phone_model": lst.variant.model,
                    "author_name": reviewer.first_name,
                    "stars": 5 if i % 3 != 0 else 4,
                    "comment": "جهاز أصلي ومطابق للمواصفات والتعامل ممتاز." if i % 2 == 0 else "Great phone and fast delivery inside Khartoum.",
                },
            )
        for i, (_idx, _u, st) in enumerate(stores[:10]):
            reviewer = buyers[i % len(buyers)]
            Rating.objects.get_or_create(
                author=reviewer,
                store=st,
                defaults={
                    "target_type": "store",
                    "author_name": reviewer.first_name,
                    "stars": 5 if i % 2 == 0 else 4,
                    "comment": "متجر موثوق وضمان حقيقي وأسعار واضحة.",
                },
            )

        for lst in published_listings[:5]:
            Favorite.objects.get_or_create(user=b1, listing=lst)
        for lst in published_listings[5:8]:
            Favorite.objects.get_or_create(user=b2, listing=lst)

        for lst in published_listings[:3]:
            PriceAlert.objects.get_or_create(
                user=b1,
                listing=lst,
                defaults={"initial_price": lst.price, "target_price": lst.price - Decimal("50000")},
            )

        # Active chats: Buyer1 <-> Store 1 (unread by store) and Buyer1 <-> Store 2 (replied + unread by buyer)
        s1_owner, s1 = stores[0][1], stores[0][2]
        s2_owner, s2 = stores[1][1], stores[1][2]
        lst1 = Listing.objects.filter(store=s1, status="published").first() or published_listings[0]
        lst2 = Listing.objects.filter(store=s2, status="published").first() or published_listings[1]

        t1, t1_created = StoreChatThread.objects.get_or_create(
            thread_key=f"store-{s1.pk}-user-{b1.pk}",
            defaults={
                "store": s1,
                "user": b1,
                "customer_name": b1.first_name,
                "customer_phone": "+249911110001",
                "listing": lst1,
                "listing_title": f"{lst1.variant.model.brand.name} {lst1.variant.model.name}",
                "listing_price_sdg": lst1.price,
                "unread_by_store": 1,
                "unread_by_customer": 0,
                "last_message_text": "السلام عليكم، هل الجهاز متوفر الآن في الفرع؟",
                "last_message_at": timezone.now(),
            },
        )
        if t1_created:
            StoreChatMessage.objects.create(
                thread=t1,
                store=s1,
                sender_role="customer",
                sender_name=b1.first_name,
                sender_phone="+249911110001",
                text="السلام عليكم، هل الجهاز متوفر الآن في الفرع؟",
                listing_id=lst1.pk,
                listing_title=t1.listing_title,
                listing_price_sdg=lst1.price,
            )
            CustomerNotification.objects.create(
                user=s1_owner,
                type="new_message",
                title_ar=f"رسالة جديدة من {b1.first_name}",
                title_en=f"New message from {b1.first_name}",
                body_ar=t1.last_message_text,
                body_en=t1.last_message_text,
                listing=lst1,
                store=s1,
                thread_key=t1.thread_key,
                is_read=False,
            )

        t2, t2_created = StoreChatThread.objects.get_or_create(
            thread_key=f"store-{s2.pk}-user-{b1.pk}",
            defaults={
                "store": s2,
                "user": b1,
                "customer_name": b1.first_name,
                "customer_phone": "+249911110001",
                "listing": lst2,
                "listing_title": f"{lst2.variant.model.brand.name} {lst2.variant.model.name}",
                "listing_price_sdg": lst2.price,
                "unread_by_store": 0,
                "unread_by_customer": 1,
                "last_message_text": "وعليكم السلام، نعم متوفر ومختوم بضمان الوكيل.",
                "last_message_at": timezone.now(),
            },
        )
        if t2_created:
            StoreChatMessage.objects.create(
                thread=t2,
                store=s2,
                sender_role="customer",
                sender_name=b1.first_name,
                sender_phone="+249911110001",
                text="Hi, do you have warranty and delivery?",
                listing_id=lst2.pk,
                listing_title=t2.listing_title,
                listing_price_sdg=lst2.price,
            )
            StoreChatMessage.objects.create(
                thread=t2,
                store=s2,
                sender_role="store",
                sender_name=s2.name,
                sender_phone=s2.phone,
                text="وعليكم السلام، نعم متوفر ومختوم بضمان الوكيل.",
                listing_id=lst2.pk,
                listing_title=t2.listing_title,
                listing_price_sdg=lst2.price,
            )
            CustomerNotification.objects.create(
                user=b1,
                type="chat_reply",
                title_ar=f"رد جديد من {s2.name}",
                title_en=f"New reply from {s2.name}",
                body_ar=t2.last_message_text,
                body_en=t2.last_message_text,
                listing=lst2,
                store=s2,
                thread_key=t2.thread_key,
                is_read=False,
            )

        if not CustomerNotification.objects.filter(user=b1, type="price_drop").exists():
            CustomerNotification.objects.create(
                user=b1,
                type="price_drop",
                title_ar=f"انخفاض سعر: {lst1.variant.model.name}",
                title_en=f"Price Drop: {lst1.variant.model.name}",
                body_ar=f"انخفض السعر إلى {int(lst1.price):,} ج.س.",
                body_en=f"Price dropped to {int(lst1.price):,} SDG.",
                listing=lst1,
                store=s1,
                is_read=False,
            )

        # Reports
        if published_listings and not CustomerReport.objects.exists():
            CustomerReport.objects.create(
                target_type="listing",
                listing=published_listings[0],
                reason="misleading_price",
                details="يرجى مراجعة السعر المعلن مع المتجر.",
                reporter_contact="+249911110001",
                reporter=b1,
            )
            CustomerReport.objects.create(
                target_type="listing",
                listing=published_listings[1],
                reason="wrong_condition_specs",
                details="تأكد من تطابق سعة التخزين مع الوصف.",
                reporter_contact="+249911110002",
                reporter=b2,
            )

        # Sponsored Ads
        if not SponsoredAd.objects.exists():
            today = timezone.localdate()
            provider = storage()
            lm1 = ListingMedia.objects.filter(listing=lst1).select_related("asset").first()
            ad1_img = provider.public_url(lm1.asset.processed_key) if lm1 else ""
            lm2 = ListingMedia.objects.filter(listing=lst2).select_related("asset").first()
            ad2_img = provider.public_url(lm2.asset.processed_key) if lm2 else ""
            ad1 = SponsoredAd.objects.create(
                store=s1,
                listing=lst1,
                title_ar="عروض النيل الكبرى على هواتف 2024",
                title_en="Nile Mobile Mega Deals",
                subtitle_ar="أجهزة أصلية مختومة بضمان حقيقي في الخرطوم",
                subtitle_en="Sealed authentic devices with local warranty",
                cta_label_ar="تصفح العرض",
                cta_label_en="View Offer",
                badge_ar="إعلان مموّل",
                badge_en="Sponsored",
                image_url=ad1_img,
                target_city="all",
                status="active",
                priority=90,
                skip_delay_sec=3,
                paid_amount_sdg=Decimal("150000.00"),
                payment_status="paid",
                payment_ref="BK-QA-101",
                starts_at=today - timedelta(days=2),
                ends_at=today + timedelta(days=14),
                impressions=120,
                clicks=18,
            )
            SponsoredAdDailyStat.objects.create(ad=ad1, day=today, impressions=120, clicks=18)

            SponsoredAd.objects.create(
                store=s2,
                listing=lst2,
                title_ar="تخفيضات البحر الأحمر للهواتف",
                title_en="Red Sea Phone Discounts",
                subtitle_ar="شحن سريع داخل بورتسودان وجميع الولايات",
                subtitle_en="Same-day pickup & shipping in Port Sudan",
                image_url=ad2_img,
                target_city="port_sudan",
                status="paused",
                priority=60,
                skip_delay_sec=3,
                paid_amount_sdg=Decimal("80000.00"),
                payment_status="pending",
                payment_ref="BK-QA-102",
                requested_by_merchant=True,
                starts_at=today,
                ends_at=today + timedelta(days=7),
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"QA Seed complete: stores={Store.objects.count()}, listings={Listing.objects.count()}, "
                f"brands={Brand.objects.count()}, models={PhoneModel.objects.count()}"
            )
        )
