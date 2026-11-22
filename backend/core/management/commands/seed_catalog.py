"""Idempotent management command to seed the Sudan phone catalog."""

from django.core.management.base import BaseCommand, CommandError

from core.catalog.seeder import CatalogValidationError, seed_catalog


class Command(BaseCommand):
    help = "Seed pre-configured Sudan phone brands, models, specifications, and variants."

    def add_arguments(self, parser):
        parser.add_argument(
            "--brand",
            action="append",
            dest="brands",
            help="Seed only the specified brand name (repeatable, case-insensitive).",
        )
        parser.add_argument(
            "--data-dir",
            dest="data_dir",
            default=None,
            help="Optional custom directory containing brand catalog JSON files.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate catalog JSON files and print counts without writing to the database.",
        )

    def handle(self, *args, **options):
        try:
            result = seed_catalog(
                data_dir=options["data_dir"],
                brands=options["brands"],
                dry_run=options["dry_run"],
            )
        except CatalogValidationError as exc:
            raise CommandError(str(exc)) from exc

        if result.dry_run:
            self.stdout.write(
                f"Dry-run valid: {result.brands_total} brands, "
                f"{result.models_total} models, {result.variants_total} variants."
            )
            return

        self.stdout.write(
            f"Catalog seeded: brands={result.brands_total} (+{result.brands_created}), "
            f"models={result.models_total} (+{result.models_created}, updated={result.models_updated}), "
            f"variants={result.variants_total} (+{result.variants_created})."
        )
