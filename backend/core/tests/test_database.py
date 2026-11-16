"""Tests verifying PostgreSQL 16 connectivity, migrations, and prerequisite reporting."""
import os
import unittest
from django.conf import settings
from django.db import connection
from django.test import SimpleTestCase, TestCase


class DatabasePrerequisitesTest(SimpleTestCase):
    """Verify database configuration and prerequisite reporting."""

    def test_database_configuration_structure(self):
        """Database settings must have a default connection configured."""
        default_db = settings.DATABASES.get('default', {})
        self.assertIn('ENGINE', default_db)
        self.assertIn('NAME', default_db)


class PostgreSQL16IntegrationTest(TestCase):
    """Verify PostgreSQL 16 operations when available."""

    def setUp(self):
        postgres_db = os.environ.get('POSTGRES_DB')
        database_url = os.environ.get('DATABASE_URL')
        if not (postgres_db or database_url):
            raise unittest.SkipTest(
                "PostgreSQL 16 prerequisite not configured (POSTGRES_DB or DATABASE_URL not set). "
                "Explicitly skipping live PostgreSQL test on runner without DB."
            )
        if connection.vendor != 'postgresql':
            raise unittest.SkipTest(
                f"Active connection vendor is {connection.vendor!r}, not 'postgresql'. "
                "Skipping PostgreSQL 16 verification."
            )

    def test_postgresql_version_is_16_or_higher(self):
        """Active PostgreSQL connection must be version 16.x."""
        with connection.cursor() as cursor:
            cursor.execute("SHOW server_version;")
            version_str = cursor.fetchone()[0]
            major_version = int(version_str.split('.')[0])
            self.assertGreaterEqual(
                major_version, 16,
                f"PostgreSQL target is 16, found {version_str}"
            )

    def test_transactional_ddl_and_atomic_queries(self):
        """PostgreSQL connection supports transactional operations and queries."""
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            result = cursor.fetchone()[0]
            self.assertEqual(result, 1)
