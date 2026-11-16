"""Tests verifying drf-spectacular schema generation without production secrets."""
from io import StringIO
import json
from django.core.management import call_command
from django.test import TestCase
from drf_spectacular.generators import SchemaGenerator


class SchemaExportTest(TestCase):
    """Verify OpenAPI 3 contract export behavior."""

    def test_schema_generator_produces_openapi_spec(self):
        """SchemaGenerator must generate valid OpenAPI 3.0 dictionary."""
        generator = SchemaGenerator()
        schema = generator.get_schema(request=None, public=True)
        self.assertIsInstance(schema, dict)
        self.assertTrue(schema.get('openapi', '').startswith('3.'))
        self.assertEqual(schema.get('info', {}).get('title'), 'Sudan Phones Marketplace API')
        self.assertEqual(schema.get('info', {}).get('version'), '1.0.0')
        self.assertIn('paths', schema)

    def test_spectacular_command_runs_cleanly(self):
        """Django management command spectacular must export JSON without errors."""
        out = StringIO()
        call_command('spectacular', format='openapi-json', stdout=out)
        data = json.loads(out.getvalue())
        self.assertTrue(data.get('openapi', '').startswith('3.'))
        self.assertEqual(data.get('info', {}).get('title'), 'Sudan Phones Marketplace API')
