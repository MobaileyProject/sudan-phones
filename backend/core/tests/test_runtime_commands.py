from io import StringIO
from django.core.management import call_command, CommandError
from django.test import SimpleTestCase, override_settings


class RuntimeCommandTests(SimpleTestCase):
    @override_settings(R2_ACCOUNT_ID='', R2_PRIVATE_BUCKET='', R2_PUBLIC_BUCKET='')
    def test_storage_smoke_refuses_missing_provider_config_without_printing_credentials(self):
        output = StringIO()
        with self.assertRaisesMessage(CommandError, 'Storage smoke failed'):
            call_command('smoke_storage', origin='https://merchant.example.test', stdout=output)
        self.assertEqual(output.getvalue(), '')

    def test_runtime_probe_requires_shared_redis(self):
        with self.assertRaisesMessage(CommandError, 'shared Redis'):
            call_command('check_runtime', stdout=StringIO())
