# Official Sudan Phone Catalog Data

This directory stores brand catalog JSON files fetched from an official/authoritative
specification provider (**TechSpecs API v5** or **MobileAPI.dev**). No hand-authored
or general-knowledge device specs are committed here.

## Fetching Official Phone Specs & Variants

### Option 1: TechSpecs API v5
1. Obtain API credentials from [TechSpecs Developer Portal](https://developer.techspecs.io/).
2. Export your credentials privately in your shell (never commit them):
   ```sh
   export TECHSPECS_API_ID="..."
   export TECHSPECS_API_KEY="..."
   ```
3. Fetch and seed official specs for the 14 Sudan phone brands:
   ```sh
   python backend/manage.py sync_catalog --provider techspecs --min-year 2019 --seed
   ```

### Option 2: MobileAPI.dev
1. Obtain an API key from [MobileAPI.dev](https://mobileapi.dev/).
2. Export your key privately:
   ```sh
   export MOBILEAPI_KEY="..."
   ```
3. Fetch and seed official specs:
   ```sh
   python backend/manage.py sync_catalog --provider mobileapi --min-year 2019 --seed
   ```
4. To validate or re-seed already fetched JSON files idempotently without calling the API:
   ```sh
   python backend/manage.py seed_catalog --dry-run
   python backend/manage.py seed_catalog
   ```
