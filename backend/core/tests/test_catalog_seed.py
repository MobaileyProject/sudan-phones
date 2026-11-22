"""Tests for official catalog providers, provenance validation, and seed/sync commands."""

import io
import json
import os
import tempfile
from pathlib import Path
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from rest_framework.test import APIClient

from core.catalog.models import Brand, PhoneModel, Variant
from core.catalog.providers.google_play import parse_google_play_csv
from core.catalog.providers.sudan_brands import (
    SUDAN_BRANDS,
    parse_colors,
    parse_memory_configs,
)
from core.catalog.providers.techspecs import (
    TechSpecsClient,
    normalize_techspecs_product,
)
from core.catalog.seeder import (
    CatalogValidationError,
    load_catalog_data,
    seed_catalog,
)
from core.models import Account, Membership, Store


def _sample_techspecs_detail(
    product_id="ts-redmi-note-13-pro-5g",
    brand="Xiaomi",
    model="Redmi Note 13 Pro 5G",
    internal="128GB 8GB RAM, 256GB 8GB RAM, 256GB 12GB RAM, 512GB 12GB RAM",
    rear_cam="200 MP (wide, OIS) + 8 MP (ultrawide) + 2 MP (macro)",
    colors="Midnight Black, Aurora Purple, Ocean Teal",
    release_year=2024,
    category="Smartphones",
):
    return {
        "product_id": product_id,
        "brand_name": brand,
        "model_name": model,
        "category": category,
        "release_year": release_year,
        "specifications": {
            "display": {
                "title": "Display",
                "attributes": {
                    "type": "AMOLED, 120Hz, Dolby Vision",
                    "size": "6.67 inches",
                    "resolution": "1220 x 2712 pixels",
                },
            },
            "platform": {
                "title": "Platform",
                "attributes": {
                    "chipset": "Snapdragon 7s Gen 2",
                    "os": "Android 13, MIUI 14",
                },
            },
            "memory": {
                "title": "Memory",
                "attributes": {
                    "internal": internal,
                    "card_slot": "No",
                },
            },
            "camera": {
                "title": "Camera",
                "attributes": {
                    "main_camera_sensors": rear_cam,
                    "main_camera_features": "Dual-LED flash, OIS, HDR",
                    "main_camera_video": "4K@30fps, 1080p@60fps",
                    "selfie_camera_sensors": "16 MP (wide)",
                },
            },
            "battery": {
                "title": "Battery",
                "attributes": {
                    "capacity": "5100 mAh",
                    "charging": "67W wired",
                },
            },
            "connectivity": {
                "title": "Connectivity",
                "attributes": {
                    "technology": "GSM / HSPA / LTE / 5G",
                    "sim": "Dual SIM (Nano-SIM, eSIM)",
                    "nfc": "Yes",
                    "usb": "USB Type-C 2.0",
                    "3.5mm_jack": "Yes",
                },
            },
            "design": {
                "title": "Design",
                "attributes": {
                    "colors": colors,
                    "sensors": "Fingerprint (under display, optical)",
                    "ip_rating": "IP54 dust and splash resistant",
                },
            },
        },
    }


class OfficialCatalogProviderTests(TestCase):
    def test_sudan_brand_list_covers_all_14_target_brands(self):
        self.assertEqual(len(SUDAN_BRANDS), 14)
        for brand in ("Samsung", "Apple", "Xiaomi", "Tecno", "Infinix", "Itel", "Honor"):
            self.assertIn(brand, SUDAN_BRANDS)

    def test_memory_and_color_parsers_extract_all_variants(self):
        configs = parse_memory_configs(
            "128GB 6GB RAM, 256GB 8GB RAM, 512GB 12GB RAM, 1TB 12GB RAM"
        )
        self.assertEqual(
            configs,
            [
                {"ram_gb": 6, "storage_gb": 128},
                {"ram_gb": 8, "storage_gb": 256},
                {"ram_gb": 12, "storage_gb": 512},
                {"ram_gb": 12, "storage_gb": 1024},
            ],
        )
        self.assertEqual(
            parse_colors("Midnight Black, Aurora Purple; Ocean Teal, midnight black"),
            ["Midnight Black", "Aurora Purple", "Ocean Teal"],
        )

    def test_techspecs_normalizer_preserves_provenance_and_hardware_differences(self):
        pro_raw = _sample_techspecs_detail()
        base_raw = _sample_techspecs_detail(
            product_id="ts-redmi-note-13-4g",
            model="Redmi Note 13 4G",
            internal="128GB 6GB RAM, 256GB 8GB RAM",
            rear_cam="108 MP (wide) + 8 MP (ultrawide) + 2 MP (macro)",
            colors="Midnight Black, Mint Green",
        )
        base_raw["specifications"]["camera"]["attributes"]["main_camera_features"] = "LED flash, HDR"

        brand_pro, pro_entry = normalize_techspecs_product(
            pro_raw, fetched_at="2026-11-22T03:00:00+00:00"
        )
        brand_base, base_entry = normalize_techspecs_product(
            base_raw, fetched_at="2026-11-22T03:00:00+00:00"
        )

        self.assertEqual(brand_pro, "Xiaomi")
        self.assertEqual(brand_base, "Xiaomi")
        self.assertEqual(pro_entry["specifications"]["source"]["provider"], "techspecs_v5")
        self.assertEqual(
            pro_entry["specifications"]["source"]["external_id"],
            "ts-redmi-note-13-pro-5g",
        )
        self.assertEqual(pro_entry["specifications"]["camera"]["rear_main_mp"], 200)
        self.assertTrue(pro_entry["specifications"]["camera"]["rear_ois"])
        self.assertEqual(base_entry["specifications"]["camera"]["rear_main_mp"], 108)
        self.assertFalse(base_entry["specifications"]["camera"]["rear_ois"])
        self.assertEqual(len(pro_entry["configs"]), 4)
        self.assertEqual(len(base_entry["configs"]), 2)

        # Non-smartphones (e.g., Tablets) are skipped.
        tablet = _sample_techspecs_detail(category="Tablets")
        self.assertIsNone(normalize_techspecs_product(tablet))

    def test_google_play_csv_parser_handles_utf16_and_filters_sudan_brands(self):
        csv_text = (
            "Retail Branding,Marketing Name,Device,Model\n"
            "Samsung,Galaxy A15,a15,SM-A155F\n"
            "TECNO,SPARK 20 Pro,KJ6,TECNO KJ6\n"
            "Redmi,Redmi Note 13,sapphire,23129RAA4G\n"
            "UnknownCo,Mystery Phone,mp1,MP-1\n"
        )
        parsed = parse_google_play_csv(csv_text.encode("utf-16"))
        self.assertEqual(
            parsed,
            {
                "Samsung": ["Galaxy A15"],
                "Tecno": ["SPARK 20 Pro"],
                "Xiaomi": ["Redmi Note 13"],
            },
        )


class CatalogSeedAndSyncCommandTests(TestCase):
    def _write_official_fixture_dir(self, tmp_dir: Path):
        _, pro_entry = normalize_techspecs_product(
            _sample_techspecs_detail(), fetched_at="2026-11-22T03:00:00+00:00"
        )
        _, a15_entry = normalize_techspecs_product(
            _sample_techspecs_detail(
                product_id="ts-galaxy-a15-4g",
                brand="Samsung",
                model="Galaxy A15 4G",
                internal="128GB 4GB RAM, 128GB 6GB RAM, 256GB 8GB RAM",
                rear_cam="50 MP (wide) + 5 MP (ultrawide) + 2 MP (macro)",
                colors="Brave Black, Optimistic Blue",
            ),
            fetched_at="2026-11-22T03:00:00+00:00",
        )
        (tmp_dir / "xiaomi.json").write_text(
            json.dumps({"brand": "Xiaomi", "models": [pro_entry]}),
            encoding="utf-8",
        )
        (tmp_dir / "samsung.json").write_text(
            json.dumps({"brand": "Samsung", "models": [a15_entry]}),
            encoding="utf-8",
        )

    def test_seeder_requires_source_provenance_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, entry = normalize_techspecs_product(
                _sample_techspecs_detail(), fetched_at="2026-11-22T03:00:00+00:00"
            )
            del entry["specifications"]["source"]
            (Path(tmp) / "xiaomi.json").write_text(
                json.dumps({"brand": "Xiaomi", "models": [entry]}),
                encoding="utf-8",
            )
            with self.assertRaises(CatalogValidationError):
                load_catalog_data(data_dir=tmp)

    def test_seed_catalog_is_idempotent_and_serves_api_endpoints(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            self._write_official_fixture_dir(tmp_path)

            out_dry = io.StringIO()
            call_command("seed_catalog", "--data-dir", tmp, "--dry-run", stdout=out_dry)
            self.assertIn("Dry-run valid: 2 brands, 2 models, 18 variants.", out_dry.getvalue())
            self.assertEqual(Brand.objects.count(), 0)

            out_first = io.StringIO()
            call_command("seed_catalog", "--data-dir", tmp, stdout=out_first)
            self.assertIn("brands=2 (+2)", out_first.getvalue())
            self.assertEqual(Brand.objects.count(), 2)
            self.assertEqual(PhoneModel.objects.count(), 2)
            self.assertEqual(Variant.objects.count(), 18)

            # Re-running is idempotent and restores modified specs without duplicating rows.
            a15 = PhoneModel.objects.get(brand__name="Samsung", name="Galaxy A15 4G")
            original_pk = a15.pk
            a15.specifications = {"stale": True}
            a15.save(update_fields=["specifications"])

            second = seed_catalog(data_dir=tmp_path)
            self.assertEqual(second.brands_created, 0)
            self.assertEqual(second.models_created, 0)
            self.assertEqual(second.models_updated, 1)
            self.assertEqual(second.variants_created, 0)
            a15.refresh_from_db()
            self.assertEqual(a15.pk, original_pk)
            self.assertEqual(a15.specifications["source"]["provider"], "techspecs_v5")

            # Verify live catalog API endpoints serve the seeded brands, specs, and variants.
            owner = get_user_model().objects.create_user("catalog_owner")
            Account.objects.create(
                user=owner,
                phone="+249912340001",
                phone_verified=True,
                is_merchant=True,
            )
            store = Store.objects.create(
                owner=owner,
                name="Port Sudan Phones",
                city="port_sudan",
                status="verified",
                phone="+249912340001",
                whatsapp="+249912340001",
            )
            Membership.objects.create(store=store, user=owner, role="owner")
            api = APIClient()
            api.force_authenticate(owner)

            brands_resp = api.get("/api/v1/brands")
            self.assertEqual(brands_resp.status_code, 200)
            self.assertEqual(
                {row["name"] for row in brands_resp.json()["data"]},
                {"Samsung", "Xiaomi"},
            )

            samsung = Brand.objects.get(name="Samsung")
            models_resp = api.get(f"/api/v1/catalog/models?brand_id={samsung.pk}")
            self.assertEqual(models_resp.status_code, 200)
            model_row = models_resp.json()["data"][0]
            self.assertEqual(model_row["specifications"]["source"]["provider"], "techspecs_v5")

            variants_resp = api.get(f"/api/v1/catalog/variants?model_id={model_row['id']}")
            self.assertEqual(variants_resp.status_code, 200)
            pairs = {(v["ram_gb"], v["storage_gb"]) for v in variants_resp.json()["data"]}
            self.assertEqual(pairs, {(4, 128), (6, 128), (8, 256)})

    def test_sync_catalog_fails_closed_without_credentials(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(CommandError) as ctx:
                call_command("sync_catalog", "--brand", "Samsung")
            self.assertIn("TECHSPECS_API_ID", str(ctx.exception))

    def test_sync_catalog_fetches_writes_json_and_seeds_database(self):
        sample_detail = _sample_techspecs_detail()

        with tempfile.TemporaryDirectory() as tmp:
            with (
                mock.patch.dict(
                    os.environ,
                    {"TECHSPECS_API_ID": "test-id", "TECHSPECS_API_KEY": "test-key"},
                ),
                mock.patch.object(
                    TechSpecsClient,
                    "search_products",
                    return_value=[{"product_id": sample_detail["product_id"]}],
                ),
                mock.patch.object(
                    TechSpecsClient,
                    "get_product_detail",
                    return_value=sample_detail,
                ),
            ):
                out = io.StringIO()
                call_command(
                    "sync_catalog",
                    "--brand",
                    "Xiaomi",
                    "--output-dir",
                    tmp,
                    "--seed",
                    stdout=out,
                )

            written = Path(tmp) / "xiaomi.json"
            self.assertTrue(written.is_file())
            self.assertIn("Synced 1 models", out.getvalue())
            self.assertIn("Catalog seeded:", out.getvalue())
            self.assertEqual(Brand.objects.filter(name="Xiaomi").count(), 1)
            self.assertEqual(PhoneModel.objects.filter(name="Redmi Note 13 Pro 5G").count(), 1)
            self.assertEqual(Variant.objects.count(), 12)
