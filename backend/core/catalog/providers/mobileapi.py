"""Official MobileAPI.dev REST API client and catalog normalizer.

API docs: https://mobileapi.dev/
Required environment variable (keep private, never commit):
  - MOBILEAPI_KEY (optional override: MOBILEAPI_BASE_URL)
"""

from __future__ import annotations

import json
import os
import re
import time
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

MOBILEAPI_DEFAULT_BASE_URL = "https://api.mobileapi.dev"


class MobileAPIError(RuntimeError):
    """Raised when MobileAPI.dev requests fail or credentials are missing."""


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")


class MobileAPIClient:
    """Thin stdlib HTTP client for MobileAPI.dev with transient 5xx retry."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int = 25,
        max_retries: int = 2,
    ):
        self.api_key = (api_key or os.environ.get("MOBILEAPI_KEY", "")).strip()
        self.base_url = (
            base_url or os.environ.get("MOBILEAPI_BASE_URL", MOBILEAPI_DEFAULT_BASE_URL)
        ).rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        if not self.api_key:
            raise MobileAPIError(
                "Missing MobileAPI.dev credentials. Set MOBILEAPI_KEY in the environment."
            )

    def _request_json(self, path: str, params: dict | None = None) -> dict | list:
        query = f"?{urllib.parse.urlencode(params)}" if params else ""
        url = f"{self.base_url}{path}{query}"
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "sudan-phones-catalog-sync/1.0",
                "Authorization": f"Token {self.api_key}",
            },
            method="GET",
        )
        last_exc: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as exc:
                if exc.code in (429, 502, 503, 504) and attempt < self.max_retries:
                    time.sleep(1.5 * (attempt + 1))
                    last_exc = exc
                    continue
                detail_msg = ""
                try:
                    body = exc.read().decode("utf-8", errors="replace").strip()
                    if body:
                        detail_msg = f": {body[:300]}"
                except Exception:
                    pass
                raise MobileAPIError(
                    f"MobileAPI HTTP {exc.code} on {path}{detail_msg}"
                ) from exc
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                if attempt < self.max_retries:
                    time.sleep(1.5 * (attempt + 1))
                    last_exc = exc
                    continue
                raise MobileAPIError(f"MobileAPI request failed on {path}: {exc}") from exc
        raise MobileAPIError(f"MobileAPI request failed on {path}: {last_exc}")

    def search_devices(self, name: str) -> list[dict]:
        payload = self._request_json("/devices/search/", params={"name": name})
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("devices", "results", "data", "items"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        return []

    def get_device(self, device_id: str | int) -> dict:
        payload = self._request_json(f"/devices/{device_id}/")
        if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
            return payload["data"]
        if isinstance(payload, dict):
            return payload
        raise MobileAPIError(f"Unexpected MobileAPI detail payload for {device_id}")


def _pick(data: dict, *keys: str, default: str = "") -> str:
    if not isinstance(data, dict):
        return default
    lower_map = {str(k).strip().lower(): v for k, v in data.items()}
    for key in keys:
        val = lower_map.get(key.lower())
        if val is not None and str(val).strip():
            return str(val).strip()
    return default


def normalize_mobileapi_device(
    detail: dict,
    brand_fallback: str | None = None,
    fetched_at: str | None = None,
) -> tuple[str, dict] | None:
    """Convert a MobileAPI.dev device detail payload into (brand_name, normalized_model_entry)."""
    device_type = _pick(detail, "type", "category", "device_type").lower()
    if device_type and "phone" not in device_type and "smartphone" not in device_type:
        return None

    device_id = _pick(detail, "id", "device_id")
    raw_brand = _pick(detail, "manufacturer", "brand", "brand_name", default=brand_fallback or "")
    brand_name = canonical_brand(raw_brand) or raw_brand
    model_name = _pick(detail, "name", "model", "model_name")
    if not device_id or not brand_name or not model_name:
        return None

    # Strip leading redundant brand prefix if present (e.g. "Samsung Galaxy A15" -> "Galaxy A15")
    if model_name.lower().startswith(f"{brand_name.lower()} "):
        model_name = model_name[len(brand_name) :].strip()

    raw_year = _pick(detail, "release_date", "announced", "release_year", "year")
    year_match = re.search(r"(20[12]\d)", raw_year)
    release_year = int(year_match.group(1)) if year_match else 2024

    raw_storage = _pick(detail, "storage", "internal", "memory", "internal_storage")
    raw_ram = _pick(detail, "ram", "memory_ram")
    fallback_ram = parse_first_int(raw_ram, 0) if raw_ram else None
    configs = parse_memory_configs(raw_storage, fallback_ram_gb=fallback_ram)
    if not configs:
        return None

    raw_colors = detail.get("colors") or _pick(detail, "colors", "color")
    colors = parse_colors(raw_colors)

    display_str = _pick(detail, "display", "screen", "display_type", default="LCD")
    display_size = parse_first_float(
        _pick(detail, "screen_size", "display_size", default=display_str), 6.5
    )
    display_size = min(max(display_size, 3.5), 8.5)
    display_res = _pick(detail, "screen_resolution", "resolution", default="1080x2400")
    refresh_hz = parse_refresh_rate(
        f"{display_str} {_pick(detail, 'refresh_rate')}", default=60
    )

    chipset = _pick(detail, "hardware", "chipset", "cpu", "processor", default="Unknown")
    os_name = _pick(detail, "os", "operating_system", default="Android")

    rear_cam = _pick(detail, "camera", "main_camera", "rear_camera", default="50MP")
    front_cam = _pick(detail, "selfie_camera", "front_camera", default="8MP")
    video_spec = _pick(detail, "video", "camera_video", default="1080p@30fps")
    rear_ois = "ois" in rear_cam.lower()

    raw_bat = _pick(detail, "battery_capacity", "battery", default="5000 mAh")
    raw_charging = _pick(detail, "charging", "fast_charging", "battery_charging", default="")
    wired_w = parse_watts(raw_charging, default=0)
    wireless_w = 0
    if "wireless" in raw_charging.lower():
        w_match = re.search(r"(\d+)\s*W\s*wireless", raw_charging, re.IGNORECASE)
        if w_match:
            wireless_w = int(w_match.group(1))

    raw_net = _pick(detail, "network", "connectivity", "cellular", default="4G LTE")
    network = "5G" if "5g" in raw_net.lower() else "4G LTE"
    sim = _pick(detail, "sim", "sim_type", default="Dual SIM (Nano-SIM)")
    nfc = _pick(detail, "nfc", default="no").lower().startswith(("yes", "true"))
    usb = _pick(detail, "usb", "usb_port", default="USB-C")
    headphone_jack = _pick(detail, "headphone_jack", "audio_jack", default="no").lower().startswith(
        ("yes", "true")
    )
    card_slot = _pick(detail, "card_slot", "microsd", "expandable_storage", default="no").lower()
    microsd = bool(card_slot) and not card_slot.startswith(("no", "false"))

    fingerprint = _pick(detail, "fingerprint", "sensors", default="Side-mounted")[:80]
    ip_raw = _pick(detail, "ip_rating", "water_resistance", default="None")
    ip_match = re.search(r"(IP\d{2}[A-Z]?)", ip_raw, re.IGNORECASE)
    ip_rating = ip_match.group(1).upper() if ip_match else "None"

    series = model_name.split()[0] if model_name.split() else brand_name
    timestamp = fetched_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    model_entry = {
        "name": model_name[:120],
        "specifications": {
            "release_year": release_year,
            "series": series[:80],
            "source": {
                "provider": "mobileapi_dev",
                "external_id": device_id,
                "fetched_at": timestamp,
                "source_url": f"{MOBILEAPI_DEFAULT_BASE_URL}/devices/{device_id}/",
            },
            "display": {
                "size_inches": round(display_size, 2),
                "type": display_str[:120],
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


def sync_from_mobileapi(
    client: MobileAPIClient,
    brands: list[str],
    output_dir: Path,
    min_year: int = 2019,
    limit_per_brand: int = 50,
) -> dict[str, int]:
    """Fetch official smartphone specs from MobileAPI.dev and write per-brand JSON files."""
    output_dir.mkdir(parents=True, exist_ok=True)
    summary: dict[str, int] = {}

    for brand in brands:
        brand_canonical = canonical_brand(brand) or brand.strip()
        collected: dict[str, dict] = {}
        items = client.search_devices(brand_canonical)
        for item in items:
            if len(collected) >= limit_per_brand:
                break
            device_id = item.get("id") or item.get("device_id")
            if device_id is None:
                continue
            detail = client.get_device(device_id)
            normalized = normalize_mobileapi_device(detail, brand_fallback=brand_canonical)
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
