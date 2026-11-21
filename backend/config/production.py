"""Hosted settings. Use a private environment; never fall back to dev credentials."""
import os
from urllib.parse import urlparse
from django.core.exceptions import ImproperlyConfigured
from .settings import *  # noqa: F403


def required(name):
    value = os.environ.get(name, '').strip()
    if not value:
        raise ImproperlyConfigured(f'{name} is required for hosted deployment')
    return value


if os.environ.get('DJANGO_DEBUG', '').lower() in ('true', '1', 'yes'):
    raise ImproperlyConfigured('DJANGO_DEBUG must be false for hosted deployment')
DEBUG = False
SECRET_KEY = required('DJANGO_SECRET_KEY')
if len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5 or SECRET_KEY.startswith('django-insecure-'):
    raise ImproperlyConfigured('DJANGO_SECRET_KEY must be a strong private key')
ALLOWED_HOSTS = [h.strip() for h in required('DJANGO_ALLOWED_HOSTS').split(',') if h.strip()]
if not ALLOWED_HOSTS or any('*' in h or '/' in h or h.startswith('.') for h in ALLOWED_HOSTS):
    raise ImproperlyConfigured('DJANGO_ALLOWED_HOSTS must contain explicit hostnames')
if DATABASES['default']['ENGINE'] != 'django.db.backends.postgresql':
    raise ImproperlyConfigured('PostgreSQL is required for hosted deployment')
for name in ['REDIS_CACHE_URL', 'CELERY_BROKER_URL']:
    if urlparse(required(name)).scheme not in ('redis', 'rediss'):
        raise ImproperlyConfigured(f'{name} must use Redis')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = os.environ.get('DJANGO_SECURE_SSL_REDIRECT', 'true').lower() in ('true', '1', 'yes')
SECURE_PROXY_SSL_HEADER = (
    ('HTTP_X_FORWARDED_PROTO', 'https')
    if os.environ.get('DJANGO_TRUST_PROXY_SSL', '').lower() in ('true', '1', 'yes') else None
)
CSRF_TRUSTED_ORIGINS = [s.strip() for s in os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',') if s.strip()]
for origin in CSRF_TRUSTED_ORIGINS:
    parsed = urlparse(origin)
    if parsed.scheme != 'https' or not parsed.hostname or '*' in origin or parsed.path or parsed.query or parsed.fragment or parsed.username:
        raise ImproperlyConfigured('CSRF trusted origins must be explicit HTTPS origins')
# Enable HSTS only after the operator verifies HTTPS for the actual domain.
SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_HSTS_SECONDS', '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_REFERRER_POLICY = 'same-origin'
DATA_UPLOAD_MAX_MEMORY_SIZE = 256 * 1024
CELERY_WORKER_MAX_TASKS_PER_CHILD = 100
CELERY_WORKER_MAX_MEMORY_PER_CHILD = 512000
CELERY_TASK_SOFT_TIME_LIMIT = 90
CELERY_TASK_TIME_LIMIT = 120
# API request IDs are emitted by middleware; access logs omit paths/query strings.
LOGGING = {
    'version': 1, 'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'WARNING'},
}
