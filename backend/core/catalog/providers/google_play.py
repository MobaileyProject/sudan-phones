"""Official Google Play Certified Devices CSV parser.

Source: https://storage.googleapis.com/play_public/supported_devices.csv
Provides authoritative Android retail brand and marketing model names.
"""

from __future__ import annotations

import csv
import io
import urllib.request

from .sudan_brands import canonical_brand

GOOGLE_PLAY_DEVICES_CSV_URL = (
    "https://storage.googleapis.com/play_public/supported_devices.csv"
)


def parse_google_play_csv(raw_bytes: bytes, brands: list[str] | None = None) -> dict[str, list[str]]:
    """Decode Google Play supported_devices.csv (UTF-16 or UTF-8) and return {brand: [marketing_names]}."""
    if raw_bytes.startswith((b"\xff\xfe", b"\xfe\xff")):
        text = raw_bytes.decode("utf-16")
    else:
        text = raw_bytes.decode("utf-8-sig")

    brand_filter = {b.strip().lower() for b in brands if b.strip()} if brands else None
    result: dict[str, set[str]] = {}

    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        retail_brand = (row.get("Retail Branding") or "").strip()
        marketing_name = (row.get("Marketing Name") or "").strip()
        if not retail_brand or not marketing_name:
            continue
        brand = canonical_brand(retail_brand)
        if not brand:
            continue
        if brand_filter is not None and brand.lower() not in brand_filter:
            continue
        result.setdefault(brand, set()).add(marketing_name)

    return {brand: sorted(names) for brand, names in sorted(result.items())}


def fetch_google_play_models(
    brands: list[str] | None = None,
    url: str = GOOGLE_PLAY_DEVICES_CSV_URL,
    timeout: int = 30,
) -> dict[str, list[str]]:
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return parse_google_play_csv(resp.read(), brands=brands)
