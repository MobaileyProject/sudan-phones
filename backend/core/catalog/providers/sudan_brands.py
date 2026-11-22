"""Target Sudan phone brands and shared specification parsing helpers."""

from __future__ import annotations

import re

SUDAN_BRANDS: tuple[str, ...] = (
    "Samsung",
    "Apple",
    "Xiaomi",
    "Tecno",
    "Infinix",
    "Itel",
    "Huawei",
    "Honor",
    "OPPO",
    "Realme",
    "Google",
    "OnePlus",
    "Vivo",
    "Nokia",
)

# Canonical brand lookup (case-insensitive) including common sub-brand aliases.
BRAND_ALIASES: dict[str, str] = {
    **{brand.lower(): brand for brand in SUDAN_BRANDS},
    "redmi": "Xiaomi",
    "poco": "Xiaomi",
    "itel mobile": "Itel",
    "tecno mobile": "Tecno",
    "infinix mobility": "Infinix",
    "hmd global": "Nokia",
}


def canonical_brand(raw: str) -> str | None:
    cleaned = (raw or "").strip()
    if not cleaned:
        return None
    return BRAND_ALIASES.get(cleaned.lower())


def parse_storage_to_gb(value: str, unit: str) -> int:
    num = int(value)
    return num * 1024 if unit.upper() == "TB" else num


def parse_memory_configs(raw_internal: str, fallback_ram_gb: int | None = None) -> list[dict]:
    """Parse strings like '128GB 6GB RAM, 256GB 8GB RAM, 1TB 12GB RAM' into unique configs."""
    text = (raw_internal or "").strip()
    if not text:
        return []

    configs: list[dict] = []
    seen: set[tuple[int, int]] = set()

    # Pattern 1: "128GB 6GB RAM" or "1TB 8GB RAM" or "256 GB / 8 GB RAM"
    pattern_storage_first = re.compile(
        r"(\d+)\s*(GB|TB)\s*(?:[/,+]\s*)?(\d+)\s*GB\s*RAM", re.IGNORECASE
    )
    for storage_val, storage_unit, ram_val in pattern_storage_first.findall(text):
        storage_gb = parse_storage_to_gb(storage_val, storage_unit)
        ram_gb = int(ram_val)
        if storage_gb > 0 and ram_gb > 0 and (ram_gb, storage_gb) not in seen:
            seen.add((ram_gb, storage_gb))
            configs.append({"ram_gb": ram_gb, "storage_gb": storage_gb})

    # Pattern 2: "6GB RAM, 128GB" or "8GB + 256GB"
    if not configs:
        pattern_ram_first = re.compile(
            r"(\d+)\s*GB\s*(?:RAM)?\s*(?:[/,+]\s*)(\d+)\s*(GB|TB)", re.IGNORECASE
        )
        for ram_val, storage_val, storage_unit in pattern_ram_first.findall(text):
            ram_gb = int(ram_val)
            storage_gb = parse_storage_to_gb(storage_val, storage_unit)
            if storage_gb >= ram_gb > 0 and (ram_gb, storage_gb) not in seen:
                seen.add((ram_gb, storage_gb))
                configs.append({"ram_gb": ram_gb, "storage_gb": storage_gb})

    # Pattern 3: Storage-only list with separate RAM value (e.g. "128GB, 256GB, 512GB")
    if not configs and fallback_ram_gb and fallback_ram_gb > 0:
        for storage_val, storage_unit in re.findall(r"(\d+)\s*(GB|TB)", text, re.IGNORECASE):
            storage_gb = parse_storage_to_gb(storage_val, storage_unit)
            if storage_gb >= fallback_ram_gb and (fallback_ram_gb, storage_gb) not in seen:
                seen.add((fallback_ram_gb, storage_gb))
                configs.append({"ram_gb": fallback_ram_gb, "storage_gb": storage_gb})

    return configs


def parse_colors(raw_colors: str | list[str] | None) -> list[str]:
    """Extract clean, deduplicated color names (max 80 chars each)."""
    if not raw_colors:
        return ["Standard"]
    if isinstance(raw_colors, list):
        items = [str(item).strip() for item in raw_colors]
    else:
        items = [part.strip() for part in re.split(r"[,;/]", str(raw_colors))]

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in items:
        name = item.strip(" .")
        if not name or len(name) > 80:
            continue
        key = name.lower()
        if key not in seen:
            seen.add(key)
            cleaned.append(name)
    return cleaned or ["Standard"]


def parse_first_float(text: str, default: float) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)", str(text or ""))
    return float(match.group(1)) if match else default


def parse_first_int(text: str, default: int) -> int:
    match = re.search(r"(\d+)", str(text or ""))
    return int(match.group(1)) if match else default


def parse_refresh_rate(text: str, default: int = 60) -> int:
    match = re.search(r"(\d+)\s*Hz", str(text or ""), re.IGNORECASE)
    return int(match.group(1)) if match else default


def parse_watts(text: str, default: int = 0) -> int:
    match = re.search(r"(\d+)\s*W", str(text or ""), re.IGNORECASE)
    return int(match.group(1)) if match else default


def parse_mah(text: str, default: int = 5000) -> int:
    match = re.search(r"(\d{3,5})\s*mAh", str(text or ""), re.IGNORECASE)
    if match:
        return int(match.group(1))
    return parse_first_int(text, default)


def parse_mp(text: str, default: int = 12) -> int:
    match = re.search(r"(\d+)\s*MP", str(text or ""), re.IGNORECASE)
    if match:
        return int(match.group(1))
    return parse_first_int(text, default)
