"""Deployment settings fail closed without changing local development settings."""
import json
import os
from pathlib import Path
import subprocess
import sys
from django.test import SimpleTestCase


class ProductionSettingsTests(SimpleTestCase):
    def settings_process(self, **changes):
        env = {k: v for k, v in os.environ.items() if not k.startswith((
            'DJANGO_', 'POSTGRES_', 'DATABASE_URL', 'REDIS_', 'CELERY_', 'TRUSTED_'))}
        env.update(DJANGO_SECRET_KEY='local-test-only-' + 'q8Vz6sA1bR' * 6,
                   DJANGO_ALLOWED_HOSTS='api.example.test', POSTGRES_DB='disposable',
                   REDIS_CACHE_URL='redis://redis:6379/1', CELERY_BROKER_URL='redis://redis:6379/0')
        env.update(changes)
        return subprocess.run([sys.executable, '-c',
            'import config.production as s; import json; print(json.dumps({'
            '"debug":s.DEBUG,"secure":s.SESSION_COOKIE_SECURE,'
            '"redirect":s.SECURE_SSL_REDIRECT,"proxy":s.SECURE_PROXY_SSL_HEADER,'
            '"csrf":s.CSRF_TRUSTED_ORIGINS}))'],
            cwd=Path(__file__).resolve().parents[2], env=env, capture_output=True, text=True)

    def test_valid_production_uses_secure_defaults_without_implicit_proxy_trust(self):
        result = self.settings_process()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), {
            'debug': False, 'secure': True, 'redirect': True, 'proxy': None, 'csrf': []})

    def test_unsafe_production_configuration_is_rejected_without_secret_echo(self):
        for changes, message in [
            ({'DJANGO_SECRET_KEY': ''}, 'DJANGO_SECRET_KEY'),
            ({'DJANGO_SECRET_KEY': 'weak'}, 'DJANGO_SECRET_KEY'),
            ({'DJANGO_ALLOWED_HOSTS': '*'}, 'DJANGO_ALLOWED_HOSTS'),
            ({'DJANGO_ALLOWED_HOSTS': ''}, 'DJANGO_ALLOWED_HOSTS'),
            ({'DJANGO_DEBUG': 'true'}, 'DJANGO_DEBUG'),
            ({'POSTGRES_DB': ''}, 'PostgreSQL'),
            ({'REDIS_CACHE_URL': ''}, 'REDIS_CACHE_URL'),
            ({'CELERY_BROKER_URL': ''}, 'CELERY_BROKER_URL'),
            ({'DJANGO_CSRF_TRUSTED_ORIGINS': 'https://*.example.test'}, 'CSRF'),
        ]:
            with self.subTest(changes=list(changes)):
                result = self.settings_process(**changes)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stderr)
                self.assertNotIn('q8Vz6sA1bR', result.stderr)

    def test_proxy_trust_and_csrf_origin_are_explicit(self):
        result = self.settings_process(DJANGO_TRUST_PROXY_SSL='true',
            DJANGO_CSRF_TRUSTED_ORIGINS='https://merchant.example.test')
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual(data['proxy'], ['HTTP_X_FORWARDED_PROTO', 'https'])
        self.assertEqual(data['csrf'], ['https://merchant.example.test'])
