"""Shared DRF error contracts retain useful codes and protocol headers."""
from types import SimpleNamespace

from django.test import SimpleTestCase
from rest_framework.exceptions import ParseError, PermissionDenied, Throttled, ValidationError

from core.errors import api_exception_handler


class ErrorContractTest(SimpleTestCase):
    def test_nested_validation_has_stable_paths_without_echoing_values(self):
        error = ValidationError({'items': [{'price': ['private-fixture']}], 'locale': ['invalid']})
        response = api_exception_handler(error, {'request': SimpleNamespace(api_locale='en')})
        self.assertEqual(response.status_code, 400)
        self.assertEqual([d['field'] for d in response.data['error']['details']], ['items.0.price', 'locale'])
        self.assertNotIn('private-fixture', str(response.data))

    def test_parse_permission_and_throttling_use_shared_envelope(self):
        for exception, status, code in [(ParseError('private-fixture'), 400, 'PARSE_ERROR'),
                                         (PermissionDenied('private-fixture'), 403, 'FORBIDDEN'),
                                         (Throttled(wait=3), 429, 'THROTTLED')]:
            with self.subTest(code=code):
                response = api_exception_handler(exception, {})
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.data['error']['code'], code)
                self.assertNotIn('private-fixture', str(response.data))
                if status == 429:
                    self.assertEqual(response['Retry-After'], '3')
