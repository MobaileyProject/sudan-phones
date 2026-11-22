"""Official TechSpecs API v5 client and catalog normalizer.

API docs: https://developer.techspecs.io/
Required environment variables (keep private, never commit):
  - TECHSPECS_API_ID
  - TECHSPECS_API_KEY
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from .sudan_brands import (
    canonical_brand,
    parse_colors,
    parse_first_float,
    parse_first_int,
    parse_mah,
    parse_memory_configs,
    parse_mp,
    parse_refresh_rate,
    parse_watts,
)

TECHSPECS_BASE_URL = "https://api.techspecs.io/v5"


class TechSpecsError(RuntimeError):
    """Raised when TechSpecs API requests fail or credentials are missing."""


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")


def _extract_attr(spec_block: dict, *candidate_keys: str, default: str = "") -> str:
    if not isinstance(spec_block, dict):
        return default
    attrs = spec_block.get("attributes") if isinstance(spec_block.get("attributes"), dict) else spec_block
    lower_map = {str(k).strip().lower(): v for k, v in attrs.items()}
    for key in candidate_keys:
        val = lower_map.get(key.lower())
        if val is not None and str(val).strip():
            return str(val).strip()
    return default


def _get_section(specs: dict, *candidate_names: str) -> dict:
    if not isinstance(specs, dict):
        return {}
    lower_map = {str(k).strip().lower(): v for k, v in specs.items()}
    for name in candidate_names:
        val = lower_map.get(name.lower())
        if isinstance(val, dict):
            return val
    return {}


class TechSpecsClient:
    """Thin stdlib HTTP client for TechSpecs API v5."""

    def __init__(
        self,
        api_id: str | None = None,
        api_key: str | None = None,
        base_url: str = TECHSPECS_BASE_URL,
        timeout: int = 20,
    ):
        self.api_id = (api_id or os.environ.get("TECHSPECS_API_ID", "")).strip()
        self.api_key = (api_key or os.environ.get("TECHSPECS_API_KEY", "")).strip()
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        if not self.api_id or not self.api_key:
            raise TechSpecsError(
                "Missing TechSpecs API credentials. Set TECHSPECS_API_ID and TECHSPECS_API_KEY in the environment."
            )

    def _request_json(self, path: str, params: dict | None = None) -> dict:
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        url = f"{self.base_url}{path}{query}"
        req = urllib.request.Request(
            url,
            headers={
                "accept": "application/json",
                "x-api-id": self.api_id,
                "x-api-key": self.api_key,
            },
            method="GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise TechSpecsError(f"TechSpecs API HTTP {exc.code} on {path}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise TechSpecsError(f"TechSpecs API request failed on {path}: {exc}") from exc

    def search_products(self, query: str, page: int = 0, size: int = 25) -> list[dict]:
        payload = self._request_json(
            "/products/search",
            params={
                "query": query,
                "keepCasing": "true",
                "page": str(page),
                "size": str(size),
            },
        )
        data = payload.get("data")
        if isinstance(data, dict) and isinstance(data.get("items"), list):
            return data["items"]
        if isinstance(data, list):
            return data
        return []

    def get_product_detail(self, product_id: str, lang: str = "en") -> dict:
        payload = self._request_json(
            f"/products/{urllib.parse.quote(product_id, safe='')}",
            params={"lang": lang, "keepCasing": "true"},
        )
        data = payload.get("data")
        if not isinstance(data, dict):
            raise TechSpecsError(f"Unexpected TechSpecs detail payload for {product_id}")
        return data


def normalize_techspecs_product(
    detail: dict,
    brand_fallback: str | None = None,
    fetched_at: str | None = None,
) -> tuple[str, dict] | None:
    """Convert a TechSpecs v5 product detail dict into (brand_name, normalized_model_entry).

    Returns None if the product is not a smartphone or lacks parseable memory configs.
    """
    category = str(detail.get("category") or "").strip().lower()
    if category and "smartphone" not in category and "phone" not in category:
        return None

    product_id = str(detail.get("product_id") or detail.get("id") or "").strip()
    raw_brand = str(detail.get("brand_name") or detail.get("brand") or brand_fallback or "").strip()
    brand_name = canonical_brand(raw_brand) or raw_brand
    model_name = str(detail.get("model_name") or detail.get("model") or detail.get("name") or "").strip()
    if not product_id or not brand_name or not model_name:
        return None

    specs = detail.get("specifications") if isinstance(detail.get("specifications"), dict) else detail

    display_sec = _get_section(specs, "display", "screen")
    memory_sec = _get_section(specs, "memory", "storage", "inside")
    camera_sec = _get_section(specs, "camera", "cameras")
    battery_sec = _get_section(specs, "battery", "power")
    platform_sec = _get_section(specs, "platform", "performance", "processor", "inside", "software")
    conn_sec = _get_section(specs, "connectivity", "network", "comms", "communications")
    design_sec = _get_section(specs, "design", "body", "build", "misc", "features")

    # Release year
    raw_year = detail.get("release_year") or _extract_attr(
        _get_section(specs, "launch", "date", "product"),
        "release_year",
        "released",
        "announced",
    )
    year_match = re.search(r"(20[12]\d)", str(raw_year or ""))
    release_year = int(year_match.group(1)) if year_match else 2024

    # Memory / RAM / Storage variants
    raw_internal = _extract_attr(memory_sec, "internal", "storage", "internal_storage", "memory")
    raw_ram = _extract_attr(memory_sec, "ram", "memory_ram")
    fallback_ram = parse_first_int(raw_ram, 0) if raw_ram else None
    configs = parse_memory_configs(raw_internal, fallback_ram_gb=fallback_ram)
    if not configs:
        return None

    # Colors
    raw_colors = (
        detail.get("colors")
        or _extract_attr(design_sec, "colors", "color")
        or _extract_attr(_get_section(specs, "misc"), "colors", "color")
    )
    colors = parse_colors(raw_colors)

    # Display
    display_type = _extract_attr(display_sec, "type", "technology", default="LCD")
    display_size = parse_first_float(_extract_attr(display_sec, "size", "diagonal", default="6.5"), 6.5)
    display_size = min(max(display_size, 3.5), 8.5)
    display_res = _extract_attr(display_sec, "resolution", default="1080x2400")
    refresh_hz = parse_refresh_rate(
        f"{display_type} {_extract_attr(display_sec, 'refresh_rate')}", default=60
    )

    # Performance
    chipset = _extract_attr(platform_sec, "chipset", "cpu", "processor", "soc", default="Unknown")
    os_name = _extract_attr(platform_sec, "os", "operating_system", default="Android")

    # Camera
    rear_cam = _extract_attr(
        camera_sec,
        "main_camera_sensors",
        "main_camera",
        "rear_camera",
        "back_camera",
        default="50MP",
    )
    front_cam = _extract_attr(
        camera_sec,
        "selfie_camera_sensors",
        "selfie_camera",
        "front_camera",
        default="8MP",
    )
    video_spec = _extract_attr(
        camera_sec, "main_camera_video", "video", "rear_video", default="1080p@30fps"
    )
    rear_ois = "ois" in f"{rear_cam} {_extract_attr(camera_sec, 'main_camera_features')}".lower()

    # Battery
    raw_bat = _extract_attr(battery_sec, "capacity", "type", "battery", default="5000 mAh")
    raw_charging = _extract_attr(battery_sec, "charging", "fast_charging", "wired_charging", default="")
    raw_wireless = _extract_attr(battery_sec, "wireless_charging", default="")
    wired_w = parse_watts(raw_charging, default=0)
    wireless_w = parse_watts(raw_wireless, default=0)
    if wireless_w == 0 and "wireless" in raw_charging.lower():
        wireless_match = re.search(r"(\d+)\s*W\s*wireless", raw_charging, re.IGNORECASE)
        if wireless_match:
            wireless_w = int(wireless_match.group(1))

    # Connectivity
    raw_net = _extract_attr(conn_sec, "technology", "network", "cellular", default="4G LTE")
    network = "5G" if "5g" in raw_net.lower() else "4G LTE"
    sim = _extract_attr(conn_sec, "sim", "sim_type", default="Dual SIM (Nano-SIM)")
    nfc_raw = _extract_attr(conn_sec, "nfc", default="no").lower()
    nfc = nfc_raw.startswith("yes") or nfc_raw == "true"
    usb = _extract_attr(conn_sec, "usb", "usb_port", default="USB-C")
    jack_raw = _extract_attr(conn_sec, "3.5mm_jack", "headphone_jack", "audio_jack", default="no").lower()
    headphone_jack = jack_raw.startswith("yes") or jack_raw == "true"
    card_slot = _extract_attr(memory_sec, "card_slot", "microsd", default="no").lower()
    microsd = bool(card_slot) and not card_slot.startswith("no")

    # Build
    sensors_raw = _extract_attr(design_sec, "sensors", "fingerprint", "biometrics", default="Side-mounted")
    fingerprint = sensors_raw[:80] if sensors_raw else "None"
    ip_raw = _extract_attr(design_sec, "ip_rating", "protection", "water_resistance", default="None")
    ip_match = re.search(r"(IP\d{2}[A-Z]?)", ip_raw, re.IGNORECASE)
    ip_rating = ip_match.group(1).upper() if ip_match else "None"

    series = str(detail.get("series") or model_name.split()[0]).strip() or brand_name
    timestamp = fetched_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    model_entry = {
        "name": model_name[:120],
        "specifications": {
            "release_year": release_year,
            "series": series[:80],
            "source": {
                "provider": "techspecs_v5",
                "external_id": product_id,
                "fetched_at": timestamp,
                "source_url": f"{TECHSPECS_BASE_URL}/products/{product_id}",
            },
            "display": {
                "size_inches": round(display_size, 2),
                "type": display_type[:120],
                "resolution": display_res[:80],
                "refresh_rate_hz": refresh_hz,
            },
            "performance": {
                "chipset": chipset[:120],
                "os": os_name[:120],
            },
            "camera": {
                "rear": rear_cam[:240],
                "rear_main_mp": parse_mp(rear_cam, default=12),
                "rear_ois": rear_ois,
                "front": front_cam[:160],
                "front_mp": parse_mp(front_cam, default=8),
                "video": video_spec[:120],
            },
            "battery": {
                "capacity_mah": parse_mah(raw_bat, default=5000),
                "charging_wired_w": wired_w,
                "charging_wireless_w": wireless_w,
            },
            "connectivity": {
                "network": network,
                "sim": sim[:120],
                "nfc": nfc,
                "usb": usb[:80],
                "headphone_jack": headphone_jack,
                "microsd": microsd,
            },
            "build": {
                "fingerprint": fingerprint,
                "ip_rating": ip_rating,
            },
        },
        "configs": configs,
        "colors": colors,
    }
    return brand_name, model_entry


def sync_from_techspecs(
    client: TechSpecsClient,
    brands: list[str],
    output_dir: Path,
    min_year: int = 2019,
    limit_per_brand: int = 50,
) -> dict[str, int]:
    """Fetch official smartphone specs from TechSpecs API v5 and write per-brand JSON files."""
    output_dir.mkdir(parents=True, exist_ok=True)
    summary: dict[str, int] = {}

    for brand in brands:
        brand_canonical = canonical_brand(brand) or brand.strip()
        collected: dict[str, dict] = {}
        page = 0
        while len(collected) < limit_per_brand:
            items = client.search_products(brand_canonical, page=page, size=25)
            if not items:
                break
            for item in items:
                if len(collected) >= limit_per_brand:
                    break
                pid = str(item.get("product_id") or item.get("id") or "").strip()
                if not pid:
                    continue
                detail = client.get_product_detail(pid)
                normalized = normalize_techspecs_product(detail, brand_fallback=brand_canonical)
                if normalized is None:
                    continue
                resolved_brand, model_entry = normalized
                if resolved_brand.lower() != brand_canonical.lower():
                    continue
                if model_entry["specifications"]["release_year"] < min_year:
                    continue
                key = model_entry["name"].lower()
                if key not in collected:
                    collected[key] = model_entry
            page += 1
            if len(items) < 25:
                break

        if collected:
            out_path = output_dir / f"{_slugify(brand_canonical)}.json"
            payload = {
                "brand": brand_canonical,
                "models": sorted(
                    collected.values(),
                    key=lambda m: (m["specifications"]["release_year"], m["name"]),
                ),
            }
            out_path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
        summary[brand_canonical] = len(collected)

    return summary
