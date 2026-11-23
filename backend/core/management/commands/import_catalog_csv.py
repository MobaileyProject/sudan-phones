"""Management command to import smartphone specs & variants from a local CSV/ZIP dataset."""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.catalog.providers.csv_importer import (
    CSVImportError,
    import_catalog_from_csv,
)
from core.catalog.providers.sudan_brands import SUDAN_BRANDS
from core.catalog.seeder import (
    CatalogValidationError,
    DEFAULT_DATA_DIR,
    seed_catalog,
)


class Command(BaseCommand):
    help = (
        "Import official smartphone specifications and RAM/storage/color variants "
        "from a CSV or ZIP dataset into normalized catalog JSON files and optionally seed the DB."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            help="Path to the smartphone specifications CSV or ZIP file.",
        )
        parser.add_argument(
            "--brand",
            action="append",
            dest="brands",
            help=(
                "Brand name to import (repeatable). Defaults to all 14 Sudan target brands: "
                + ", ".join(SUDAN_BRANDS)
            ),
        )
        parser.add_argument(
            "--min-year",
            type=int,
            default=2019,
            help="Minimum device release year to include (default: 2019).",
        )
        parser.add_argument(
            "--provider-name",
            default="kaggle_mobile_specs_2026",
            help="Source provider label recorded in specifications.source.provider.",
        )
        parser.add_argument(
            "--output-dir",
            default=str(DEFAULT_DATA_DIR),
            help="Directory where normalized per-brand JSON files will be written.",
        )
        parser.add_argument(
            "--seed",
            action="store_true",
            help="Immediately validate and seed imported JSON files into the database.",
        )
        parser.add_argument(
            "--include-unreleased",
            action="store_true",
            help="Include Cancelled and Rumored devices (excluded by default).",
        )
        parser.add_argument(
            "--include-regional",
            action="store_true",
            help="Include region-tagged editions like (India)/(China) (excluded by default).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report counts without writing JSON files or modifying the database.",
        )

    def handle(self, *args, **options):
        output_dir = Path(options["output_dir"])
        try:
            summary = import_catalog_from_csv(
                csv_path=options["csv_path"],
                output_dir=output_dir,
                brands=options["brands"],
                min_year=options["min_year"],
                provider_name=options["provider_name"],
                write_json=not options["dry_run"],
                include_unreleased=options["include_unreleased"],
                include_regional=options["include_regional"],
            )
        except CSVImportError as exc:
            raise CommandError(str(exc)) from exc

        total_models = sum(summary.values())
        prefix = "Dry-run parsed" if options["dry_run"] else "Imported"
        self.stdout.write(
            f"{prefix} {total_models} smartphone models across {len(summary)} brand(s)."
        )
        for brand, count in summary.items():
            self.stdout.write(f"  - {brand}: {count} model(s)")

        if options["dry_run"]:
            return

        try:
            result = seed_catalog(
                data_dir=output_dir,
                brands=list(summary.keys()) if summary else None,
                dry_run=not options["seed"],
            )
        except CatalogValidationError as exc:
            raise CommandError(str(exc)) from exc

        if options["seed"]:
            self.stdout.write(
                f"Catalog seeded: brands={result.brands_total} (+{result.brands_created}), "
                f"models={result.models_total} (+{result.models_created}, updated={result.models_updated}), "
                f"variants={result.variants_total} (+{result.variants_created})."
            )
        else:
            self.stdout.write(
                f"Validated JSON: {result.brands_total} brands, "
                f"{result.models_total} models, {result.variants_total} variants."
            )
