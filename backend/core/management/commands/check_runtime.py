"""Private readiness probe, not an unauthenticated dependency-disclosure API."""
import uuid
from celery import current_app
from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = 'Check PostgreSQL, shared Redis cache, broker and optionally a worker'

    def add_arguments(self, parser):
        parser.add_argument('--worker', action='store_true')

    def handle(self, *args, **options):
        if 'RedisCache' not in settings.CACHES['default']['BACKEND']:
            raise CommandError('Runtime probe requires shared Redis')
        key = 'readiness:' + uuid.uuid4().hex
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                if cursor.fetchone() != (1,):
                    raise RuntimeError
            cache.set(key, 'ready', timeout=10)
            if cache.get(key) != 'ready':
                raise RuntimeError
            cache.delete(key)
            with current_app.connection_for_read() as broker:
                broker.ensure_connection(max_retries=0)
            if options['worker'] and not current_app.control.inspect(timeout=3).ping():
                raise RuntimeError
        except Exception:
            raise CommandError('Runtime dependency probe failed; inspect services privately') from None
        self.stdout.write('PostgreSQL/cache/broker' + ('/worker' if options['worker'] else '') + ': ready')
