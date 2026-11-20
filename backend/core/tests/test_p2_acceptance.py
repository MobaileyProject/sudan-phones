"""INT-02 backend journey and actual response/schema parity, without client claims."""
from django.test import SimpleTestCase
from drf_spectacular.generators import SchemaGenerator
from jsonschema import validate
from rest_framework.test import APIClient


class P2BackendAcceptanceTest(SimpleTestCase):
    def test_guest_bootstrap_journey_in_both_client_locales_matches_openapi(self):
        schema = SchemaGenerator().get_schema(request=None, public=True)
        self.assertTrue({'/api/v1/config', '/api/v1/i18n/bundle', '/api/v1/health'}.issubset(schema['paths']))
        client = APIClient()
        for locale in ['ar', 'en']:
            config = client.get('/api/v1/config', {'locale': locale})
            self.assertEqual(config.status_code, 200)
            self.assertEqual(config.json()['data']['currency']['code'], 'SDG')
            bundle = client.get('/api/v1/i18n/bundle', {'locale': config.json()['data']['locale']})
            self.assertEqual(bundle.status_code, 200)
            for path, response in [('/api/v1/config', config), ('/api/v1/i18n/bundle', bundle),
                                   ('/api/v1/health', client.get('/api/v1/health'))]:
                operation = schema['paths'][path]['get']
                self.assertNotIn('security', operation)
                body_schema = operation['responses']['200']['content']['application/json']['schema']
                validate(response.json(), {**body_schema, 'components': schema['components']})

    def test_bundle_return_values_cannot_mutate_later_responses(self):
        from core.bootstrap.services import get_bundle
        first = get_bundle('ar')
        first['strings']['common.retry'] = 'changed'
        self.assertEqual(get_bundle('ar')['strings']['common.retry'], 'حاول مرة أخرى')
