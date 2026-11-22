"""Sudan phone catalog loader, validator, and idempotent database seeder."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from django.db import transaction

from .models import Brand, PhoneModel, Variant

DEFAULT_DATA_DIR = Path(__file__).resolve().parent / "data"

REQUIRED_SPEC_SECTIONS = {
    "source": ("provider", "external_id", "fetched_at"),
    "display": ("size_inches", "type", "resolution", "refresh_rate_hz"),
    "performance": ("chipset", "os"),
    "camera": ("rear", "rear_main_mp", "rear_ois", "front", "front_mp", "video"),
    "battery": ("capacity_mah", "charging_wired_w", "charging_wireless_w"),
    "connectivity": ("network", "sim", "nfc", "usb", "headphone_jack", "microsd"),
    "build": ("fingerprint", "ip_rating"),
}


class CatalogValidationError(ValueError):
    """Raised when a catalog data file violates the standardized schema."""


@dataclass(frozen=True)
class SeedResult:
    brands_created: int
    brands_total: int
    models_created: int
    models_updated: int
    models_total: int
    variants_created: int
    variants_total: int
    dry_run: bool = False


def _require_non_empty_str(value, field_name: str, max_len: int | None = None) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CatalogValidationError(f"{field_name} must be a non-empty string")
    cleaned = value.strip()
    if max_len is not None and len(cleaned) > max_len:
        raise CatalogValidationError(
            f"{field_name} exceeds max length {max_len}: {cleaned!r}"
        )
    return cleaned


def _require_positive_int(value, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise CatalogValidationError(f"{field_name} must be a positive integer")
    return value


def _require_non_negative_int(value, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise CatalogValidationError(f"{field_name} must be a non-negative integer")
    return value


def _require_bool(value, field_name: str) -> bool:
    if not isinstance(value, bool):
        raise CatalogValidationError(f"{field_name} must be a boolean")
    return value


def validate_specifications(specs: dict, context: str) -> dict:
    if not isinstance(specs, dict):
        raise CatalogValidationError(f"{context}: specifications must be an object")

    release_year = specs.get("release_year")
    if (
        isinstance(release_year, bool)
        or not isinstance(release_year, int)
        or not (2015 <= release_year <= 2030)
    ):
        raise CatalogValidationError(
            f"{context}: release_year must be an integer between 2015 and 2030"
        )
    _require_non_empty_str(specs.get("series"), f"{context}.series")

    for section, required_keys in REQUIRED_SPEC_SECTIONS.items():
        block = specs.get(section)
        if not isinstance(block, dict):
            raise CatalogValidationError(f"{context}: missing or invalid section '{section}'")
        for key in required_keys:
            if key not in block:
                raise CatalogValidationError(
                    f"{context}.{section}: missing required key '{key}'"
                )

    source = specs["source"]
    _require_non_empty_str(source["provider"], f"{context}.source.provider")
    _require_non_empty_str(source["external_id"], f"{context}.source.external_id")
    _require_non_empty_str(source["fetched_at"], f"{context}.source.fetched_at")

    display = specs["display"]
    size = display["size_inches"]
    if isinstance(size, bool) or not isinstance(size, (int, float)) or not (3.5 <= size <= 8.5):
        raise CatalogValidationError(f"{context}.display.size_inches out of range")
    _require_non_empty_str(display["type"], f"{context}.display.type")
    _require_non_empty_str(display["resolution"], f"{context}.display.resolution")
    _require_positive_int(display["refresh_rate_hz"], f"{context}.display.refresh_rate_hz")

    perf = specs["performance"]
    _require_non_empty_str(perf["chipset"], f"{context}.performance.chipset")
    _require_non_empty_str(perf["os"], f"{context}.performance.os")

    cam = specs["camera"]
    _require_non_empty_str(cam["rear"], f"{context}.camera.rear")
    _require_positive_int(cam["rear_main_mp"], f"{context}.camera.rear_main_mp")
    _require_bool(cam["rear_ois"], f"{context}.camera.rear_ois")
    _require_non_empty_str(cam["front"], f"{context}.camera.front")
    _require_positive_int(cam["front_mp"], f"{context}.camera.front_mp")
    _require_non_empty_str(cam["video"], f"{context}.camera.video")

    bat = specs["battery"]
    _require_positive_int(bat["capacity_mah"], f"{context}.battery.capacity_mah")
    _require_non_negative_int(bat["charging_wired_w"], f"{context}.battery.charging_wired_w")
    _require_non_negative_int(bat["charging_wireless_w"], f"{context}.battery.charging_wireless_w")

    conn = specs["connectivity"]
    _require_non_empty_str(conn["network"], f"{context}.connectivity.network")
    _require_non_empty_str(conn["sim"], f"{context}.connectivity.sim")
    _require_bool(conn["nfc"], f"{context}.connectivity.nfc")
    _require_non_empty_str(conn["usb"], f"{context}.connectivity.usb")
    _require_bool(conn["headphone_jack"], f"{context}.connectivity.headphone_jack")
    _require_bool(conn["microsd"], f"{context}.connectivity.microsd")

    build = specs["build"]
    _require_non_empty_str(build["fingerprint"], f"{context}.build.fingerprint")
    _require_non_empty_str(build["ip_rating"], f"{context}.build.ip_rating")

    return specs


def _expand_variants(model_entry: dict, context: str) -> list[dict]:
    explicit = model_entry.get("variants")
    configs = model_entry.get("configs")
    colors = model_entry.get("colors")

    expanded: list[dict] = []
    if explicit is not None:
        if not isinstance(explicit, list) or not explicit:
            raise CatalogValidationError(f"{context}: variants must be a non-empty list")
        for idx, item in enumerate(explicit):
            if not isinstance(item, dict):
                raise CatalogValidationError(f"{context}.variants[{idx}] must be an object")
            expanded.append(
                {
                    "ram_gb": _require_positive_int(
                        item.get("ram_gb"), f"{context}.variants[{idx}].ram_gb"
                    ),
                    "storage_gb": _require_positive_int(
                        item.get("storage_gb"), f"{context}.variants[{idx}].storage_gb"
                    ),
                    "color": _require_non_empty_str(
                        item.get("color"), f"{context}.variants[{idx}].color", max_len=80
                    ),
                }
            )
    else:
        if not isinstance(configs, list) or not configs:
            raise CatalogValidationError(f"{context}: configs must be a non-empty list")
        if not isinstance(colors, list) or not colors:
            raise CatalogValidationError(f"{context}: colors must be a non-empty list")
        cleaned_colors = [
            _require_non_empty_str(color, f"{context}.colors[{idx}]", max_len=80)
            for idx, color in enumerate(colors)
        ]
        if len(set(cleaned_colors)) != len(cleaned_colors):
            raise CatalogValidationError(f"{context}: duplicate colors detected")
        for idx, cfg in enumerate(configs):
            if not isinstance(cfg, dict):
                raise CatalogValidationError(f"{context}.configs[{idx}] must be an object")
            ram_gb = _require_positive_int(cfg.get("ram_gb"), f"{context}.configs[{idx}].ram_gb")
            storage_gb = _require_positive_int(
                cfg.get("storage_gb"), f"{context}.configs[{idx}].storage_gb"
            )
            for color in cleaned_colors:
                expanded.append(
                    {"ram_gb": ram_gb, "storage_gb": storage_gb, "color": color}
                )

    seen: set[tuple[int, int, str]] = set()
    for variant in expanded:
        key = (variant["storage_gb"], variant["ram_gb"], variant["color"])
        if key in seen:
            raise CatalogValidationError(f"{context}: duplicate variant {key}")
        seen.add(key)

    return expanded


def load_catalog_data(
    data_dir: Path | str | None = None,
    brands: list[str] | None = None,
) -> list[dict]:
    """Load and validate all brand catalog JSON files."""
    base_dir = Path(data_dir) if data_dir is not None else DEFAULT_DATA_DIR
    if not base_dir.is_dir():
        raise CatalogValidationError(f"Catalog data directory not found: {base_dir}")

    json_files = sorted(base_dir.glob("*.json"))
    if not json_files:
        raise CatalogValidationError(f"No catalog JSON files found in {base_dir}")

    brand_filter = {b.strip().lower() for b in brands if b.strip()} if brands else None
    seen_brands: set[str] = set()
    catalog: list[dict] = []

    for path in json_files:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CatalogValidationError(f"{path.name}: invalid JSON ({exc})") from exc

        if not isinstance(payload, dict):
            raise CatalogValidationError(f"{path.name}: root payload must be an object")

        brand_name = _require_non_empty_str(
            payload.get("brand"), f"{path.name}.brand", max_len=80
        )
        brand_key = brand_name.lower()
        if brand_key in seen_brands:
            raise CatalogValidationError(f"Duplicate brand '{brand_name}' in {path.name}")
        seen_brands.add(brand_key)

        if brand_filter is not None and brand_key not in brand_filter:
            continue

        raw_models = payload.get("models")
        if not isinstance(raw_models, list) or not raw_models:
            raise CatalogValidationError(f"{path.name}: models must be a non-empty list")

        seen_models: set[str] = set()
        normalized_models: list[dict] = []
        for idx, entry in enumerate(raw_models):
            if not isinstance(entry, dict):
                raise CatalogValidationError(f"{path.name}.models[{idx}] must be an object")
            model_name = _require_non_empty_str(
                entry.get("name"), f"{path.name}.models[{idx}].name", max_len=120
            )
            model_key = model_name.lower()
            if model_key in seen_models:
                raise CatalogValidationError(
                    f"{path.name}: duplicate model '{model_name}'"
                )
            seen_models.add(model_key)

            context = f"{brand_name}/{model_name}"
            specs = validate_specifications(entry.get("specifications"), context)
            variants = _expand_variants(entry, context)
            normalized_models.append(
                {
                    "name": model_name,
                    "specifications": specs,
                    "variants": variants,
                }
            )

        catalog.append({"brand": brand_name, "models": normalized_models})

    if brand_filter is not None:
        loaded_keys = {entry["brand"].lower() for entry in catalog}
        missing = sorted(brand_filter - loaded_keys)
        if missing:
            raise CatalogValidationError(
                f"Requested brand(s) not found in catalog data: {', '.join(missing)}"
            )

    return catalog


def seed_catalog(
    data_dir: Path | str | None = None,
    brands: list[str] | None = None,
    dry_run: bool = False,
) -> SeedResult:
    """Idempotently seed brands, phone models, specifications, and variants."""
    catalog = load_catalog_data(data_dir=data_dir, brands=brands)

    brands_total = len(catalog)
    models_total = sum(len(entry["models"]) for entry in catalog)
    variants_total = sum(
        len(model["variants"]) for entry in catalog for model in entry["models"]
    )

    if dry_run:
        return SeedResult(
            brands_created=0,
            brands_total=brands_total,
            models_created=0,
            models_updated=0,
            models_total=models_total,
            variants_created=0,
            variants_total=variants_total,
            dry_run=True,
        )

    brands_created = 0
    models_created = 0
    models_updated = 0
    variants_created = 0

    with transaction.atomic():
        for brand_entry in catalog:
            brand_obj, created = Brand.objects.get_or_create(name=brand_entry["brand"])
            if created:
                brands_created += 1

            for model_entry in brand_entry["models"]:
                model_obj, created = PhoneModel.objects.get_or_create(
                    brand=brand_obj,
                    name=model_entry["name"],
                    defaults={"specifications": model_entry["specifications"]},
                )
                if created:
                    models_created += 1
                elif model_obj.specifications != model_entry["specifications"]:
                    model_obj.specifications = model_entry["specifications"]
                    model_obj.save(update_fields=["specifications"])
                    models_updated += 1

                for variant_entry in model_entry["variants"]:
                    _, v_created = Variant.objects.get_or_create(
                        model=model_obj,
                        storage_gb=variant_entry["storage_gb"],
                        ram_gb=variant_entry["ram_gb"],
                        color=variant_entry["color"],
                    )
                    if v_created:
                        variants_created += 1

    return SeedResult(
        brands_created=brands_created,
        brands_total=brands_total,
        models_created=models_created,
        models_updated=models_updated,
        models_total=models_total,
        variants_created=variants_created,
        variants_total=variants_total,
        dry_run=False,
    )
