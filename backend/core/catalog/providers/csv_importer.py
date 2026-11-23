"""Offline CSV / ZIP importer for global smartphone specification datasets.

Normalizes tabular smartphone datasets (such as Kaggle's Global Mobile Phone
Specifications 2026 CSV) into the standardized Sudan Phones catalog JSON format
with source provenance, filtering to smartphones and target Sudan brands.
"""

from __future__ import annotations

import csv
import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from .sudan_brands import (
    SUDAN_BRANDS,
    canonical_brand,
    parse_colors,
    parse_first_float,
    parse_mah,
    parse_mp,
    parse_refresh_rate,
    parse_storage_to_gb,
    parse_watts,
)


class CSVImportError(RuntimeError):
    """Raised when a catalog CSV file cannot be read or parsed."""


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")


def _clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def parse_csv_memory_configs(
    memory_variant: str,
    memory_ram: str,
    memory_internal: str,
) -> list[dict]:
    """Parse variant strings from CSV columns into unique {ram_gb, storage_gb} dicts.

    Handles:
      - Memory_Variant: '4GB 128GB, 6GB 128GB, 8GB 256GB' or '6GB 128GB / 8GB 256GB'
      - Memory_RAM + Memory_Internal: '8 GB' + '256/512 GB / 1TB NVMe'
      - Multi-RAM + Multi-Storage: '4/6/8 GB' + '128/256 GB'
    """
    configs: list[dict] = []
    seen: set[tuple[int, int]] = set()

    def _add(ram_gb: int, storage_gb: int) -> None:
        if 1 <= ram_gb <= 64 and 4 <= storage_gb <= 4096 and storage_gb >= ram_gb:
            if (ram_gb, storage_gb) not in seen:
                seen.add((ram_gb, storage_gb))
                configs.append({"ram_gb": ram_gb, "storage_gb": storage_gb})

    # 1. Explicit paired variants like "4GB 128GB", "8GB/256GB", "12GB 1TB"
    variant_text = _clean_text(memory_variant)
    if variant_text:
        pair_pattern = re.compile(
            r"(\d+)\s*GB\s*(?:RAM)?\s*[/,+\s-]+\s*(\d+)\s*(GB|TB)", re.IGNORECASE
        )
        for ram_s, stor_s, stor_u in pair_pattern.findall(variant_text):
            _add(int(ram_s), parse_storage_to_gb(stor_s, stor_u))

    if configs:
        return configs

    # 2. Fallback: extract all RAM options and all Storage options from separate columns.
    ram_text = _clean_text(memory_ram)
    stor_text = _clean_text(memory_internal)

    ram_values: list[int] = []
    if ram_text and "mb" not in ram_text.lower():
        for match in re.findall(r"\b(\d{1,2})\b", ram_text):
            val = int(match)
            if 1 <= val <= 32 and val not in ram_values:
                ram_values.append(val)

    stor_values: list[int] = []
    if stor_text:
        # Handle "256/512 GB / 1TB NVMe" or "128/256 GB" or "64GB, 128GB"
        # First capture explicit TB values
        for tb_val in re.findall(r"(\d+)\s*TB", stor_text, re.IGNORECASE):
            gb = int(tb_val) * 1024
            if gb not in stor_values:
                stor_values.append(gb)
        # Capture slash-separated numbers before GB (e.g. "128/256/512 GB")
        for group in re.findall(r"((?:\d+\s*/\s*)*\d+)\s*GB", stor_text, re.IGNORECASE):
            for num in re.findall(r"\d+", group):
                gb = int(num)
                if 8 <= gb <= 2048 and gb not in stor_values:
                    stor_values.append(gb)

    if ram_values and stor_values:
        for r_gb in ram_values:
            for s_gb in stor_values:
                _add(r_gb, s_gb)

    return configs


def _extract_year(row: dict) -> int | None:
    for col in ("Launch_Announced", "Released", "Launch_Status"):
        val = row.get(col) or ""
        match = re.search(r"(20[12]\d)", val)
        if match:
            return int(match.group(1))
    return None


def _extract_rear_camera(row: dict) -> str:
    for col in (
        "Main camera_Penta",
        "Main camera_Quad",
        "Main camera_Triple",
        "Main camera_Dual",
        "Main camera_Single",
        "Camera_Primary",
        "Camera",
    ):
        val = _clean_text(row.get(col))
        if val:
            # Separate concatenated lenses like "AF5 MP" -> "AF + 5 MP"
            val = re.sub(r"(?<=[A-Za-z)\"'])(\d+\s*MP)", r" + \1", val)
            return val[:240]
    return "12MP"


def _extract_front_camera(row: dict) -> str:
    for col in (
        "Selfie camera_Triple",
        "Selfie camera_Dual",
        "Selfie camera_Single",
        "Camera_Secondary",
    ):
        val = _clean_text(row.get(col))
        if val:
            val = re.sub(r"(?<=[A-Za-z)\"'])(\d+\s*MP)", r" + \1", val)
            return val[:160]
    return "8MP"


def _extract_fingerprint(row: dict) -> str:
    sensors = _clean_text(row.get("Features_Sensors"))
    lower = sensors.lower()
    if "face id" in lower:
        return "Face ID"
    fp_match = re.search(r"fingerprint\s*\(([^)]+)\)", sensors, re.IGNORECASE)
    if fp_match:
        return fp_match.group(1).strip().capitalize()[:80]
    if "fingerprint" in lower:
        return "Fingerprint"
    return "None"


def _extract_ip_rating(row: dict) -> str:
    haystack = f"{row.get('Body_Others') or ''} {row.get('Body_Build') or ''}"
    match = re.search(r"(IP\d{2}[A-Z]?)", haystack, re.IGNORECASE)
    return match.group(1).upper() if match else "None"


def normalize_csv_row(
    row: dict,
    provider_name: str = "kaggle_mobile_specs_2026",
    fetched_at: str | None = None,
) -> tuple[str, dict] | None:
    """Normalize a single CSV row into (canonical_brand, model_entry) or None if skipped."""
    device_type = _clean_text(row.get("General_Device")).lower()
    if device_type and device_type not in ("smartphones", "smartphone", "mobiles"):
        return None

    raw_brand = _clean_text(row.get("General_Brand"))
    brand_name = canonical_brand(raw_brand)
    if not brand_name:
        return None

    model_name = _clean_text(row.get("General_Model")) or _clean_text(row.get("Name"))
    if not model_name:
        return None
    if model_name.lower().startswith(f"{brand_name.lower()} "):
        model_name = model_name[len(brand_name) :].strip()
    if not model_name:
        return None

    release_year = _extract_year(row)
    if release_year is None or not (2015 <= release_year <= 2030):
        return None

    configs = parse_csv_memory_configs(
        row.get("Memory_Variant") or "",
        row.get("Memory_RAM") or "",
        row.get("Memory_Internal") or "",
    )
    if not configs:
        return None

    colors = parse_colors(row.get("More_Color"))

    # Display
    display_type = _clean_text(row.get("Display_Type")) or "LCD"
    display_size = parse_first_float(row.get("Display_Size") or row.get("Display") or "6.5", 6.5)
    display_size = min(max(display_size, 3.5), 8.5)
    raw_res = _clean_text(row.get("Display_Resolution"))
    res_match = re.search(r"(\d{3,4}\s*x\s*\d{3,4})", raw_res, re.IGNORECASE)
    resolution = re.sub(r"\s+", "", res_match.group(1)) if res_match else (raw_res[:80] or "1080x2400")
    refresh_hz = parse_refresh_rate(
        f"{display_type} {row.get('Display_Features') or ''}", default=60
    )

    # Performance
    chipset = _clean_text(row.get("Platform_Chipset")) or _clean_text(row.get("Platform_CPU")) or "Unknown"
    os_name = _clean_text(row.get("Platform_OS")) or _clean_text(row.get("OS")) or "Android"

    # Camera
    rear_cam = _extract_rear_camera(row)
    front_cam = _extract_front_camera(row)
    rear_ois = "ois" in f"{rear_cam} {row.get('Main camera_Features') or ''}".lower()
    video = _clean_text(row.get("Main camera_Video")) or _clean_text(row.get("Camera_Video")) or "1080p@30fps"

    # Battery
    capacity_mah = parse_mah(row.get("Battery_Capacity") or row.get("Battery") or "5000 mAh", default=5000)
    raw_charging = _clean_text(row.get("Battery_Charging"))
    wired_w = parse_watts(raw_charging, default=0)
    wireless_w = 0
    w_match = re.search(r"(\d+)\s*W\s*wireless", raw_charging, re.IGNORECASE)
    if w_match:
        wireless_w = int(w_match.group(1))

    # Connectivity
    net_raw = f"{row.get('Network_Technology') or ''} {row.get('Network_5G bands') or ''}".lower()
    network = "5G" if "5g" in net_raw else "4G LTE"
    sim = _clean_text(row.get("Body_SIM")) or "Dual SIM (Nano-SIM)"
    nfc = _clean_text(row.get("Connectivity_NFC")).lower().startswith("yes")
    usb = _clean_text(row.get("Connectivity_USB")) or "USB-C"
    headphone_jack = _clean_text(row.get("Sound_3.5mm jack")).lower().startswith("yes")
    card_slot = _clean_text(row.get("Memory_Card slot")).lower()
    microsd = bool(card_slot) and not card_slot.startswith(("no", "none"))

    # Source provenance
    source_url = _clean_text(row.get("URL"))
    external_id = (
        source_url.rstrip("/").split("/")[-1]
        if source_url
        else f"{_slugify(brand_name)}-{_slugify(model_name)}"
    )
    timestamp = fetched_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    series = model_name.split()[0] if model_name.split() else brand_name

    model_entry = {
        "name": model_name[:120],
        "specifications": {
            "release_year": release_year,
            "series": series[:80],
            "source": {
                "provider": provider_name,
                "external_id": external_id[:120],
                "fetched_at": timestamp,
                "source_url": source_url or provider_name,
            },
            "display": {
                "size_inches": round(display_size, 2),
                "type": display_type[:120],
                "resolution": resolution[:80],
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
                "video": video[:120],
            },
            "battery": {
                "capacity_mah": capacity_mah,
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
                "fingerprint": _extract_fingerprint(row),
                "ip_rating": _extract_ip_rating(row),
            },
        },
        "configs": configs,
        "colors": colors,
    }
    return brand_name, model_entry


def _iter_csv_rows(csv_path: Path):
    if not csv_path.is_file():
        raise CSVImportError(f"Catalog CSV file not found: {csv_path}")

    if csv_path.suffix.lower() == ".zip":
        with zipfile.ZipFile(csv_path) as zf:
            csv_members = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            if not csv_members:
                raise CSVImportError(f"No CSV file found inside archive: {csv_path}")
            with zf.open(csv_members[0]) as fh:
                reader = csv.DictReader(
                    io.TextIOWrapper(fh, encoding="utf-8-sig", errors="replace")
                )
                yield from reader
    else:
        with csv_path.open("r", encoding="utf-8-sig", errors="replace") as fh:
            reader = csv.DictReader(fh)
            yield from reader


def import_catalog_from_csv(
    csv_path: Path | str,
    output_dir: Path,
    brands: list[str] | None = None,
    min_year: int = 2019,
    provider_name: str = "kaggle_mobile_specs_2026",
    write_json: bool = True,
) -> dict[str, int]:
    """Parse a CSV/ZIP smartphone dataset into normalized per-brand JSON files."""
    path = Path(csv_path)
    target_brands = {
        (canonical_brand(b) or b.strip()).lower()
        for b in (brands or SUDAN_BRANDS)
        if b.strip()
    }

    grouped: dict[str, dict[str, dict]] = {}
    timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    for row in _iter_csv_rows(path):
        normalized = normalize_csv_row(
            row, provider_name=provider_name, fetched_at=timestamp
        )
        if normalized is None:
            continue
        brand_name, model_entry = normalized
        if brand_name.lower() not in target_brands:
            continue
        if model_entry["specifications"]["release_year"] < min_year:
            continue

        brand_bucket = grouped.setdefault(brand_name, {})
        model_key = model_entry["name"].lower()
        existing = brand_bucket.get(model_key)
        # Prefer entry with more RAM/storage configs if duplicate model name exists.
        if existing is None or len(model_entry["configs"]) > len(existing["configs"]):
            brand_bucket[model_key] = model_entry

    if write_json:
        output_dir.mkdir(parents=True, exist_ok=True)
        for brand_name, models_map in sorted(grouped.items()):
            out_path = output_dir / f"{_slugify(brand_name)}.json"
            payload = {
                "brand": brand_name,
                "models": sorted(
                    models_map.values(),
                    key=lambda m: (m["specifications"]["release_year"], m["name"]),
                ),
            }
            out_path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

    return {brand: len(models_map) for brand, models_map in sorted(grouped.items())}
