"""INT-02 backend-only acceptance over a real local HTTP connection."""
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from django.test import LiveServerTestCase


class BootstrapHttpAcceptanceTest(LiveServerTestCase):
    def test_guest_can_bootstrap_over_http_and_recover_from_bad_locale(self):
        for locale in ['ar', 'en']:
            request = Request(self.live_server_url + '/api/v1/config?locale=' + locale,
                              headers={'Accept': 'application/json'})
            with urlopen(request, timeout=5) as response:
                config = json.load(response)['data']
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers['Content-Language'], locale)
                self.assertIsNone(response.headers.get('Set-Cookie'))
            with urlopen(self.live_server_url + '/api/v1/i18n/bundle?locale=' + config['locale'], timeout=5) as response:
                bundle = json.load(response)['data']
                self.assertEqual(bundle['locale'], config['locale'])
                self.assertIn('common.retry', bundle['strings'])
        with self.assertRaises(HTTPError) as caught:
            urlopen(self.live_server_url + '/api/v1/config?locale=unknown', timeout=5)
        self.assertEqual(caught.exception.code, 400)
        self.assertEqual(json.load(caught.exception)['error']['code'], 'VALIDATION_ERROR')
        caught.exception.close()
        with urlopen(self.live_server_url + '/api/v1/health', timeout=5) as response:
            self.assertEqual(json.load(response), {'data': {'status': 'ok'}})
