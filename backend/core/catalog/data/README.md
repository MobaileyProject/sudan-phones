# Official Sudan Phone Catalog Data

This directory stores brand catalog JSON files fetched from an official/authoritative
specification provider (such as **TechSpecs API v5**). No hand-authored or
general-knowledge device specs are committed here.

## Importing from a Downloaded CSV / ZIP Dataset (Offline Bootstrap)

If you have a downloaded global smartphone specifications CSV or ZIP (e.g., from Kaggle),
you can filter to smartphones across the 14 Sudan target brands (2019+), normalize all
specs and RAM/storage/color variants, and seed PostgreSQL directly:

```sh
python backend/manage.py import_catalog_csv ~/Downloads/Global_Mobile_Phone_Specifications_and_Prices_2026.csv --min-year 2019 --seed
```

Use `--dry-run` to preview counts without writing JSON or modifying the database.

## Fetching Official Phone Specs & Variants (API)

1. Obtain API credentials from [TechSpecs Developer Portal](https://developer.techspecs.io/).
2. Export your credentials privately in your shell (never commit them):
   ```sh
   export TECHSPECS_API_ID="..."
   export TECHSPECS_API_KEY="..."
   ```
3. Fetch and save official specs for the 14 Sudan phone brands (and optionally seed PostgreSQL immediately):
   ```sh
   python backend/manage.py sync_catalog --provider techspecs --min-year 2019 --seed
   ```
   Or fetch specific brands only:
   ```sh
   python backend/manage.py sync_catalog --provider techspecs --brand Samsung --brand Tecno --brand Apple --seed
   ```
4. To validate or re-seed already fetched JSON files idempotently without calling the API:
   ```sh
   python backend/manage.py seed_catalog --dry-run
   python backend/manage.py seed_catalog
   ```
