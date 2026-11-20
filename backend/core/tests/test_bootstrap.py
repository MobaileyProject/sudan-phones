"""BE-02 public HTTP contracts; SimpleTestCase rejects accidental database I/O."""
import uuid
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient


class BootstrapContractTest(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_public_config_has_only_the_agreed_pilot_metadata(self):
        response = self.client.get('/api/v1/config')
        self.assertEqual(response.status_code, 200)
        data = response.json()['data']
        self.assertEqual(data['currency'], {'code': 'SDG', 'decimal_places': 2})
        self.assertEqual([c['id'] for c in data['cities']], ['port_sudan', 'khartoum', 'omdurman'])
        self.assertEqual(data['cities'][0]['id'], 'port_sudan')
        self.assertEqual(data['cities'][0]['name'], 'بورتسودان')
        self.assertIn('port sudan', data['cities'][0]['aliases'])
        self.assertIn('بورتسودان', data['cities'][0]['aliases'])
        self.assertEqual(data['default_locale'], 'ar')
        self.assertEqual(data['locale'], 'ar')
        self.assertEqual(data['direction'], 'rtl')
        self.assertEqual(data['supported_locales'], ['ar', 'en'])
        self.assertFalse(any(data['features'].values()))
        self.assertNotIn('sessionid', response.cookies)

    @override_settings(MINIMUM_APP_VERSION='2.3.4', SECRET_KEY='private-fixture', R2_SECRET_ACCESS_KEY='private-fixture')
    def test_config_uses_an_explicit_public_allowlist(self):
        response = self.client.get('/api/v1/config?locale=en')
        self.assertEqual(response.json()['data']['minimum_app_version'], '2.3.4')
        self.assertNotIn('private-fixture', response.content.decode())
        self.assertEqual(response.json()['data']['cities'][0]['name'], 'Port Sudan')
        self.assertIn('port sudan', response.json()['data']['cities'][0]['aliases'])

    def test_locale_precedence_region_tags_and_default(self):
        for query, header, locale in [('', '', 'ar'), ('', 'en-US,en;q=0.8', 'en'),
                                      ('', 'ar-SD,en;q=0.5', 'ar'), ('', 'fr', 'ar'),
                                      ('?locale=ar', 'en-US', 'ar')]:
            with self.subTest(query=query, header=header):
                response = self.client.get('/api/v1/i18n/bundle' + query, HTTP_ACCEPT_LANGUAGE=header)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['data']['locale'], locale)
                self.assertEqual(response['Content-Language'], locale)

    def test_guest_language_cookie_does_not_change_public_cache_variants(self):
        self.client.cookies['django_language'] = 'en'
        response = self.client.get('/api/v1/config', HTTP_ACCEPT_LANGUAGE='ar')
        self.assertEqual(response.json()['data']['locale'], 'ar')

    def test_bundles_have_matching_keys_and_real_arabic_offline_strings(self):
        ar = self.client.get('/api/v1/i18n/bundle?locale=ar').json()['data']
        en = self.client.get('/api/v1/i18n/bundle?locale=en').json()['data']
        self.assertEqual(set(ar['strings']), set(en['strings']))
        self.assertEqual(ar['direction'], 'rtl')
        self.assertEqual(en['direction'], 'ltr')
        self.assertEqual(ar['strings']['common.retry'], 'حاول مرة أخرى')
        self.assertIn('offline.title', ar['strings'])
        self.assertTrue(ar['version'])

    def test_invalid_unknown_and_duplicate_query_fields_are_errors(self):
        for path in ['/api/v1/config', '/api/v1/i18n/bundle']:
            for query in ['locale=fr', 'locale=', 'locale=ar&locale=en', 'token=hidden', 'limit=500', 'format=xml']:
                with self.subTest(path=path, query=query):
                    response = self.client.get(path + '?' + query)
                    self.assertEqual(response.status_code, 400)
                    error = response.json()['error']
                    self.assertEqual(set(error), {'code', 'message', 'details'})
                    self.assertEqual(error['code'], 'VALIDATION_ERROR')
                    self.assertTrue(error['details'])
                    self.assertNotIn('hidden', response.content.decode())

    def test_request_ids_are_generated_and_cache_varies_by_language(self):
        first = self.client.get('/api/v1/config', HTTP_X_REQUEST_ID='untrusted')
        second = self.client.get('/api/v1/config')
        uuid.UUID(first['X-Request-ID'])
        self.assertNotEqual(first['X-Request-ID'], second['X-Request-ID'])
        self.assertEqual(first['Cache-Control'], 'public, max-age=300')
        self.assertIn('Accept-Language', first['Vary'])

    def test_head_options_methods_and_canonical_paths(self):
        for path in ['/api/v1/config', '/api/v1/i18n/bundle', '/api/v1/health']:
            with self.subTest(path=path):
                self.assertEqual(self.client.head(path).status_code, 200)
                self.assertEqual(self.client.head(path).content, b'')
                self.assertEqual(self.client.options(path).status_code, 200)
                post = self.client.post(path, {'secret': 'not-echoed'}, format='json')
                self.assertEqual(post.status_code, 405)
                self.assertEqual(post.json()['error']['code'], 'METHOD_NOT_ALLOWED')
                self.assertIn('GET', post['Allow'])
                self.assertEqual(self.client.get(path + '/').status_code, 404)

    @override_settings(DEBUG=True)
    def test_unknown_api_path_is_a_json_error_even_in_debug(self):
        response = self.client.get('/api/v1/missing?secret=not-echoed')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['error']['code'], 'NOT_FOUND')
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.assertNotIn('not-echoed', response.content.decode())

    def test_unsupported_accept_header_still_returns_a_json_error(self):
        response = self.client.get('/api/v1/config', HTTP_ACCEPT='text/html')
        self.assertEqual(response.status_code, 406)
        self.assertEqual(response.json()['error']['code'], 'NOT_ACCEPTABLE')

    @override_settings(DATA_UPLOAD_MAX_NUMBER_FIELDS=2)
    def test_excessive_query_fields_keep_the_json_error_and_trace_headers(self):
        for debug in [False, True]:
            with self.subTest(debug=debug), override_settings(DEBUG=debug):
                response = self.client.get('/api/v1/config?a=1&b=2&c=3')
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()['error']['code'], 'PARSE_ERROR')
                uuid.UUID(response['X-Request-ID'])
                self.assertEqual(response['Cache-Control'], 'no-store')

    def test_unexpected_service_failure_is_sanitized(self):
        with self.assertLogs('core.errors', level='ERROR') as logs, \
                patch('core.bootstrap.views.get_public_config', side_effect=RuntimeError('private-fixture')):
            response = self.client.get('/api/v1/config')
        self.assertNotIn('private-fixture', str(logs.output))
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()['error']['code'], 'INTERNAL_ERROR')
        self.assertEqual(response.json()['error']['details'], [])
        self.assertNotIn('private-fixture', response.content.decode())
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_liveness_is_public_and_uncached(self):
        response = self.client.get('/api/v1/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'data': {'status': 'ok'}})
        self.assertEqual(response['Cache-Control'], 'no-store')
