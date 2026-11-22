# Official Sudan Phone Catalog Data

This directory stores brand catalog JSON files fetched from an official/authoritative
specification provider (such as **TechSpecs API v5**). No hand-authored or
general-knowledge device specs are committed here.

## Fetching Official Phone Specs & Variants

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
