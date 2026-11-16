"""Foundation tests for Django/DRF settings and system checks."""
from io import StringIO
from django.conf import settings
from django.core.management import call_command
from django.test import TestCase


class FoundationSettingsTest(TestCase):
    """Verify Django and DRF configuration invariants."""

    def test_django_system_check_passes_without_errors(self):
        """Standard Django system check must identify zero issues."""
        out = StringIO()
        call_command('check', stdout=out)
        self.assertIn('System check identified no issues', out.getvalue())

    def test_installed_apps_includes_drf_and_spectacular(self):
        """DRF and drf-spectacular must be registered in INSTALLED_APPS."""
        self.assertIn('rest_framework', settings.INSTALLED_APPS)
        self.assertIn('drf_spectacular', settings.INSTALLED_APPS)
        self.assertIn('core', settings.INSTALLED_APPS)

    def test_bilingual_arabic_first_and_timezone(self):
        """Default locale must be Arabic (ar) with Africa/Khartoum timezone."""
        self.assertEqual(settings.LANGUAGE_CODE, 'ar')
        self.assertEqual(settings.TIME_ZONE, 'Africa/Khartoum')
        self.assertTrue(settings.USE_I18N)
        self.assertTrue(settings.USE_TZ)

    def test_rest_framework_defaults(self):
        """DRF must use drf-spectacular AutoSchema."""
        self.assertEqual(
            settings.REST_FRAMEWORK.get('DEFAULT_SCHEMA_CLASS'),
            'drf_spectacular.openapi.AutoSchema'
        )

    def test_r2_storage_settings_baseline(self):
        """R2 / S3 storage settings must be defined for media pipelines."""
        self.assertTrue(hasattr(settings, 'R2_BUCKET_NAME'))
        self.assertTrue(hasattr(settings, 'R2_ACCOUNT_ID'))
