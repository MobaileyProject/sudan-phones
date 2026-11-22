"""Management command to sync official phone specs & variants from external providers."""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.catalog.providers.sudan_brands import SUDAN_BRANDS
from core.catalog.providers.techspecs import (
    TechSpecsClient,
    TechSpecsError,
    sync_from_techspecs,
)
from core.catalog.seeder import (
    CatalogValidationError,
    DEFAULT_DATA_DIR,
    seed_catalog,
)


class Command(BaseCommand):
    help = (
        "Fetch official phone specifications and variants from TechSpecs API v5 "
        "into catalog JSON files, and optionally seed the database."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--provider",
            choices=["techspecs"],
            default="techspecs",
            help="Official specification provider to fetch from (default: techspecs).",
        )
        parser.add_argument(
            "--brand",
            action="append",
            dest="brands",
            help=(
                "Brand name to sync (repeatable). Defaults to all 14 Sudan target brands: "
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
            "--limit-per-brand",
            type=int,
            default=50,
            help="Maximum number of smartphone models to fetch per brand (default: 50).",
        )
        parser.add_argument(
            "--output-dir",
            default=str(DEFAULT_DATA_DIR),
            help="Directory where normalized per-brand JSON files will be written.",
        )
        parser.add_argument(
            "--seed",
            action="store_true",
            help="Immediately validate and seed fetched JSON files into the database.",
        )

    def handle(self, *args, **options):
        brands = options["brands"] or list(SUDAN_BRANDS)
        output_dir = Path(options["output_dir"])

        try:
            client = TechSpecsClient()
            summary = sync_from_techspecs(
                client=client,
                brands=brands,
                output_dir=output_dir,
                min_year=options["min_year"],
                limit_per_brand=options["limit_per_brand"],
            )
        except TechSpecsError as exc:
            raise CommandError(str(exc)) from exc

        total_fetched = sum(summary.values())
        self.stdout.write(
            f"Synced {total_fetched} models across {len(summary)} brand(s) from {options['provider']}."
        )
        for brand, count in summary.items():
            self.stdout.write(f"  - {brand}: {count} model(s)")

        if options["seed"] and total_fetched > 0:
            try:
                result = seed_catalog(data_dir=output_dir, brands=list(summary.keys()))
            except CatalogValidationError as exc:
                raise CommandError(str(exc)) from exc
            self.stdout.write(
                f"Catalog seeded: brands={result.brands_total} (+{result.brands_created}), "
                f"models={result.models_total} (+{result.models_created}, updated={result.models_updated}), "
                f"variants={result.variants_total} (+{result.variants_created})."
            )
