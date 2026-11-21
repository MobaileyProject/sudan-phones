"""Opt-in real R2 roundtrip; prints no keys, credentials or presigned URLs."""
import base64
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import uuid
from django.core.management.base import BaseCommand, CommandError
from core.media.storage import R2Storage


class Command(BaseCommand):
    help = 'Smoke-test signed PUT/GET expiry, private access, CDN and upload CORS'

    def add_arguments(self, parser):
        parser.add_argument('--origin', required=True)

    def handle(self, *args, **options):
        origin = options['origin']
        if not origin.startswith('https://') or '*' in origin:
            raise CommandError('Use the exact HTTPS client origin')
        provider = R2Storage()
        token = uuid.uuid4().hex
        private = 'quarantine/smoke-' + token + '.png'
        public = 'public/smoke-' + token + '.png'
        data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6ioAAAAASUVORK5CYII=')
        touched = []
        failed = False
        try:
            upload = provider.upload_url(private, 'image/png', len(data))
            preflight = Request(upload['url'], method='OPTIONS', headers={
                'Origin': origin, 'Access-Control-Request-Method': 'PUT',
                'Access-Control-Request-Headers': 'content-type'})
            with urlopen(preflight, timeout=15) as response:
                if response.headers.get('Access-Control-Allow-Origin') != origin:
                    raise RuntimeError
            # Include the key before PUT: an ambiguous timeout can still write it.
            touched.append(private)
            with urlopen(Request(upload['url'], data=data, method='PUT', headers=upload['headers']), timeout=15):
                pass
            if provider.read(private, 1024) != data:
                raise RuntimeError
            link = provider.private_url(private, 1)
            with urlopen(link, timeout=15) as response:
                if response.read(1024) != data:
                    raise RuntimeError
            try:
                with urlopen(link.split('?')[0], timeout=15):
                    raise RuntimeError('Private object accessible anonymously')
            except HTTPError as error:
                if error.code not in (401, 403, 404):
                    raise
            time.sleep(2)
            try:
                with urlopen(link, timeout=15):
                    raise RuntimeError('Expired link accepted')
            except HTTPError as error:
                if error.code != 403:
                    raise
            touched.append(public)
            provider.write(public, data, 'image/png')
            with urlopen(provider.public_url(public), timeout=15) as response:
                if response.read(1024) != data:
                    raise RuntimeError
        except Exception:
            failed = True
        finally:
            for key in touched:
                try:
                    provider.delete(key)
                except Exception:
                    failed = True
        if failed:
            raise CommandError('Storage smoke failed; inspect provider/CORS and smoke-object cleanup privately') from None
        self.stdout.write('Signed upload/private GET/expiry/anonymous denial/CDN/CORS: passed; smoke keys deleted')
