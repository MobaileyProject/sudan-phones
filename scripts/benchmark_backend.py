#!/usr/bin/env python3
"""Seed synthetic data in a NEW Django test DB, benchmark API rendering, then drop it."""
import argparse
import json
from pathlib import Path
import statistics
import sys
import time
import uuid
import os


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--disposable', action='store_true', required=True)
    parser.add_argument('--listings', type=int, default=10000)
    parser.add_argument('--runs', type=int, default=30)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not 100 <= args.listings <= 100000 or not 5 <= args.runs <= 100:
        parser.error('Use 100..100000 listings and 5..100 runs')
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    import django
    django.setup()
    from django.conf import settings
    from django.test.runner import DiscoverRunner
    from django.db import connection
    from django.test.utils import CaptureQueriesContext
    from django.core.cache import cache
    from django.contrib.auth import get_user_model
    from django.utils import timezone
    from rest_framework.test import APIClient
    from core.models import Account, Membership, Brand, PhoneModel, Variant, Store, Listing, MediaAsset, ListingMedia
    from core.discovery.queries import visible_listings, filter_terms
    if connection.vendor != 'postgresql':
        parser.error('PostgreSQL 16 is required')
    settings.DATABASES['default']['TEST']['NAME'] = 'test_benchmark_' + uuid.uuid4().hex[:12]
    settings.R2_PUBLIC_DOMAIN = 'https://images.example.test'
    runner = DiscoverRunner(verbosity=0, interactive=False)
    runner.setup_test_environment()
    databases = runner.setup_databases()
    try:
        cache.clear()  # Use a dedicated disposable cache for this command.
        users = get_user_model().objects.bulk_create([
            get_user_model()(username=f'bench-{i}', password='!', is_active=i % 20 != 0)
            for i in range(100)])
        stores = Store.objects.bulk_create([Store(owner=user, name=f'Synthetic store {i}',
            city=['khartoum', 'port_sudan', 'omdurman'][i % 3], address='Synthetic market',
            phone=f'+24991{i:07d}', whatsapp=f'+24991{i:07d}',
            status='verified' if i % 10 < 8 else 'suspended') for i, user in enumerate(users)])
        Account.objects.bulk_create([Account(user=user, phone=f'+24991{i:07d}',
            phone_verified=True, is_merchant=True) for i, user in enumerate(users)])
        Membership.objects.bulk_create([Membership(store=store, user=user, role='owner')
            for store, user in zip(stores, users)])
        brands = Brand.objects.bulk_create([Brand(name=name) for name in ['Apple', 'Samsung', 'شاومي']])
        models = PhoneModel.objects.bulk_create([PhoneModel(brand=brands[i % 3],
            name=f'iPhone {13 + i}' if i % 3 == 0 else f'Galaxy {i}',
            specifications={'screen': '6.1', 'network': '5G'}) for i in range(30)])
        variants = Variant.objects.bulk_create([Variant(model=models[i % 30],
            storage_gb=[64, 128, 256, 512, 1024][i // 30], ram_gb=4, color='Black') for i in range(150)])
        listings = Listing.objects.bulk_create([Listing(store=stores[i % 100],
            variant=variants[(i // 100) % 150], condition='used' if i % 2 else 'new',
            quantity=1 if i % 2 else 3, price=100000 + (i * 7919) % 1900000,
            status='published', grade='good' if i % 2 else 'new',
            battery_health=83 if i % 2 else 100, is_sealed=not i % 2,
            warranty_days=3 if i % 2 else None, warranty_months=None if i % 2 else 12)
            for i in range(args.listings)], batch_size=1000)
        assets, links = [], []
        for listing in listings:
            for position, kind in enumerate(['front', 'back', 'screen'] if listing.condition == 'used' else ['seal']):
                token = uuid.uuid4().hex
                asset = MediaAsset(store_id=listing.store_id, purpose='listing', kind=kind,
                    content_type='image/jpeg', size=10000, sha256='a' * 64,
                    upload_key='quarantine/' + token, processed_key='public/' + token + '.jpg',
                    thumbnail_key='public/' + token + '-thumb.jpg', status='ready', expires_at=timezone.now())
                assets.append(asset)
                links.append(ListingMedia(listing=listing, asset=asset, position=position))
        MediaAsset.objects.bulk_create(assets, batch_size=1000)
        ListingMedia.objects.bulk_create(links, batch_size=1000)
        with connection.cursor() as cursor:
            cursor.execute('ANALYZE')
        client = APIClient()
        scenarios = {
            'filtered_search': ('/api/v1/listings', {'q': 'Apple iPhone 13', 'city': 'khartoum', 'condition': 'used', 'limit': 20}),
            'broad_search_100': ('/api/v1/listings', {'limit': 100}),
            'home': ('/api/v1/home', {}),
            'brands': ('/api/v1/brands', {}),
        }
        report = {'django': django.get_version(), 'postgres': connection.pg_version,
            'listings': args.listings, 'assets': len(assets), 'stores': 100,
            'runs': args.runs, 'cache_backend': settings.CACHES['default']['BACKEND'],
            'scope': 'Local sequential APIClient HTTP serialization; not network/load/CDN latency', 'scenarios': {}}
        for name, (path, query) in scenarios.items():
            cache.clear()
            durations, counts = [], []
            for _ in range(args.runs + 1):
                started = time.perf_counter()
                with CaptureQueriesContext(connection) as captured:
                    response = client.get(path, query)
                    body = response.content
                elapsed = (time.perf_counter() - started) * 1000
                if response.status_code != 200 or not body:
                    raise RuntimeError('Benchmark request failed: ' + name)
                durations.append(elapsed)
                counts.append(len(captured))
            warm = sorted(durations[1:])
            report['scenarios'][name] = {
                'cold_ms': round(durations[0], 2), 'p50_ms': round(statistics.median(warm), 2),
                'p95_ms': round(warm[int(.95 * (len(warm)-1))], 2),
                'max_queries_warm': max(counts[1:]), 'cold_queries': counts[0]}
        plan = filter_terms(visible_listings().filter(store__city='khartoum', condition='used'),
            'Apple iPhone 13').order_by('-created_at', 'pk')[:20].explain(analyze=True, buffers=True, format='json')
        report['filtered_search_plan'] = json.loads(plan)
        args.output.write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({k: v for k, v in report.items() if k != 'filtered_search_plan'}, indent=2))
    finally:
        cache.clear()
        runner.teardown_databases(databases)
        runner.teardown_test_environment()


if __name__ == '__main__':
    main()
