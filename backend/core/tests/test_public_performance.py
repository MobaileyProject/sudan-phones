"""Public caching never substitutes for current eligibility and listing fields."""
from unittest.mock import patch
from django.core.cache import cache
from django.db import connection
from django.test import TestCase, SimpleTestCase, override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from .factories import InventoryFixture


@override_settings(MEDIA_STORAGE_BACKEND='core.media.storage.R2Storage',
                   R2_PUBLIC_DOMAIN='https://images.example.test')
class PublicPerformanceTests(InventoryFixture, TestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)
        self.guest = APIClient()

    def test_public_cdn_urls_work_without_s3_credentials_or_client_construction(self):
        listing = self.create_listing()
        with patch('boto3.client', side_effect=AssertionError('S3 client on public read')):
            response = self.guest.get(f'/api/v1/listings/{listing["id"]}')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data['data']['media'][0]['url'].startswith(
            'https://images.example.test/public/'))

    @override_settings(MEDIA_STORAGE_BACKEND='core.tests.test_verification_media.MemoryStorage')
    def test_search_media_query_count_does_not_grow_with_page_size(self):
        self.create_listing()
        for _ in range(4):
            self.create_listing(self.payload('used'))
        self.guest.get("/api/v1/listings", {"limit": 1})  # initialize daily metric
        counts = []
        for limit in [1, 5]:
            with CaptureQueriesContext(connection) as queries:
                response = self.guest.get('/api/v1/listings', {'limit': limit})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.data['data']), limit)
            counts.append(len(queries))
        self.assertEqual(counts[1], counts[0], counts)

    @override_settings(MEDIA_STORAGE_BACKEND='core.tests.test_verification_media.MemoryStorage')
    def test_warm_home_rechecks_eligibility_and_current_price(self):
        from core.models import Listing, MediaAsset
        listing = self.create_listing()
        self.assertEqual(len(self.guest.get('/api/v1/home').data['data']['latest']), 1)
        Listing.objects.filter(pk=listing['id']).update(price='123456.00')
        self.assertEqual(self.guest.get('/api/v1/home').data['data']['latest'][0]['price'], '123456.00')
        for change in ['suspend', 'inactive', 'removed', 'zero', 'media']:
            self.store.status = 'suspended' if change == 'suspend' else 'verified'
            self.store.save()
            self.owner.is_active = change != 'inactive'
            self.owner.save()
            Listing.objects.filter(pk=listing['id']).update(
                status='removed' if change == 'removed' else 'published',
                quantity=0 if change == 'zero' else 3)
            MediaAsset.objects.filter(store=self.store).update(
                status='failed' if change == 'media' else 'ready')
            data = self.guest.get('/api/v1/home').data['data']
            self.assertEqual(data['latest'], [], change)
            self.assertEqual(data['top_deals'], [], change)

    def test_compression_codec_cannot_be_selected_as_json_charset(self):
        import json
        import zlib
        listing = self.create_listing()
        body = {"event_id": "00000000-0000-4000-8000-000000000002", "method": "whatsapp"}
        response = self.guest.post(f'/api/v1/listings/{listing["id"]}/contact-events',
            zlib.compress(json.dumps(body).encode()), content_type='application/json; charset=zlib_codec')
        self.assertEqual(response.status_code, 400, response.content)

    def test_cached_brand_pages_are_bounded_and_expire(self):
        from core.models import Brand
        from core.common.public_cache import cached
        Brand.objects.create(name='Samsung')
        first = self.guest.get('/api/v1/brands', {'limit': 1}).data
        self.assertEqual(len(first['data']), 1)
        self.assertEqual(len(self.guest.get('/api/v1/brands', {'limit': 2}).data['data']), 2)
        with CaptureQueriesContext(connection) as queries:
            again = self.guest.get('/api/v1/brands', {'limit': 1}).data
        self.assertEqual(again, first)
        self.assertEqual(len(queries), 0)
        self.assertEqual(cached('expiry-test', lambda: 'old', timeout=0), 'old')
        self.assertEqual(cached('expiry-test', lambda: 'new'), 'new')


class PublicCacheFailureTests(SimpleTestCase):
    def test_cache_outage_falls_back_without_suppressing_producer_errors(self):
        from core.common.public_cache import cached
        with patch('core.common.public_cache.cache.get', side_effect=ConnectionError), \
             patch('core.common.public_cache.cache.set', side_effect=ConnectionError):
            self.assertEqual(cached('outage', lambda: ['current']), ['current'])
            with self.assertRaises(ValueError):
                cached('outage', lambda: int('bad'))


class SessionCsrfTests(InventoryFixture, TestCase):
    def test_real_session_rotates_csrf_and_rejects_cross_origin_stock_mutations(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.owner.set_password('Strong-Phone-Pass42')
        self.owner.save()
        listing = self.create_listing()
        browser = APIClient(enforce_csrf_checks=True)
        browser.get('/api/v1/auth/session', secure=True)
        old = browser.cookies['csrftoken'].value
        body = {'phone': '+249912345678', 'password': 'Strong-Phone-Pass42'}
        self.assertEqual(browser.post('/api/v1/auth/login', body, format='json', secure=True).status_code, 403)
        response = browser.post('/api/v1/auth/login', body, format='json', secure=True, HTTP_X_CSRFTOKEN=old, HTTP_ORIGIN='https://testserver')
        self.assertEqual(response.status_code, 200, response.content)
        token = browser.cookies['csrftoken'].value
        self.assertNotEqual(token, old)
        path = f'/api/v1/stores/me/listings/{listing["id"]}/stock'
        for headers in [{}, {'HTTP_X_CSRFTOKEN': old},
                        {'HTTP_X_CSRFTOKEN': token, 'HTTP_ORIGIN': 'https://evil.example.test'}]:
            self.assertEqual(browser.patch(path, {'quantity': 2, 'version': 1}, format='json',
                secure=True, HTTP_IDEMPOTENCY_KEY='csrf-denied', **headers).status_code, 403)
        response = browser.patch(path, {'quantity': 2, 'version': 1}, format='json', secure=True,
            HTTP_X_CSRFTOKEN=token, HTTP_IDEMPOTENCY_KEY='00000000-0000-4000-8000-000000000001', HTTP_ORIGIN='https://testserver')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['data']['quantity'], 2)
