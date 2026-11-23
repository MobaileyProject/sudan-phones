"""Django settings for Sudan Phones marketplace."""
import os
from pathlib import Path
import urllib.parse

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-sudan-phones-foundation-key-for-local-dev-only'
)

DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get(
        'DJANGO_ALLOWED_HOSTS',
        'localhost,127.0.0.1,[::1],testserver'
    ).split(',')
    if h.strip()
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    # Third-party
    'rest_framework',
    'drf_spectacular',
    # Sudan Phones project apps
    'core',
]

MIDDLEWARE = [
    'core.middleware.ApiResponseMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database configuration: PostgreSQL 16 target with safe local fallback
POSTGRES_DB = os.environ.get('POSTGRES_DB')
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    url = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': url.path.lstrip('/'),
            'USER': url.username or 'postgres',
            'PASSWORD': url.password or '',
            'HOST': url.hostname or 'localhost',
            'PORT': url.port or 5432,
        }
    }
elif POSTGRES_DB:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': POSTGRES_DB,
            'USER': os.environ.get('POSTGRES_USER', 'postgres'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', ''),
            'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
            'PORT': int(os.environ.get('POSTGRES_PORT', '5432')),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization: Arabic RTL first, Africa/Khartoum timezone
LANGUAGE_CODE = 'ar'
LANGUAGES = [
    ('ar', 'Arabic'),
    ('en', 'English'),
]
TIME_ZONE = 'Africa/Khartoum'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'URL_FORMAT_OVERRIDE': None,
    'EXCEPTION_HANDLER': 'core.errors.api_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# Canonical versioned API paths never redirect a mutation to a trailing slash.
APPEND_SLASH = False
MINIMUM_APP_VERSION = os.environ.get('MINIMUM_APP_VERSION', '1.0.0')

SPECTACULAR_SETTINGS = {
    'ENUM_NAME_OVERRIDES': {
        'LocaleEnum': ['ar', 'en'],
        'StaffRoleEnum': ['staff', 'manager', 'clerk'],
        'SessionRoleEnum': ['guest', 'buyer', 'merchant', 'admin'],
        'SudanCityEnum': 'core.bootstrap.services.CITY_IDS',
    },
    'TITLE': 'Sudan Phones Marketplace API',
    'DESCRIPTION': 'Bilingual marketplace for verified phone stores in Sudan.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Cloudflare R2 / S3 object storage baseline (SPEC-SCOPE-01)
R2_ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID', '')
R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET_NAME = os.environ.get('R2_BUCKET_NAME', 'sudan-phones-media')
R2_PUBLIC_DOMAIN = os.environ.get('R2_PUBLIC_DOMAIN', '')

# Phone and email OTP delivery is explicitly configured; no SMS or console secrets.
OTP_DELIVERY_BACKEND = os.environ.get('OTP_DELIVERY_BACKEND', 'core.identity.delivery.deliver_otp')
GOOGLE_OAUTH_CLIENT_IDS = [
    cid.strip()
    for cid in os.environ.get('GOOGLE_OAUTH_CLIENT_IDS', '').split(',')
    if cid.strip()
]
GOOGLE_TOKEN_VERIFIER = os.environ.get(
    'GOOGLE_TOKEN_VERIFIER', 'core.identity.google.verify_google_id_token'
)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
CSRF_FAILURE_VIEW = 'core.views.csrf_failure'

MEDIA_STORAGE_BACKEND = 'core.media.storage.R2Storage'
MEDIA_PHOTO_MAX_BYTES = 8 * 1024 * 1024
MEDIA_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024
MEDIA_MAX_PIXELS = 24_000_000
R2_PRIVATE_BUCKET = os.environ.get('R2_PRIVATE_BUCKET', '')
R2_PUBLIC_BUCKET = os.environ.get('R2_PUBLIC_BUCKET', '')

PUBLIC_LISTING_BASE_URL = os.environ.get('PUBLIC_LISTING_BASE_URL', 'https://souqphone.example/listings')

WHATSAPP_ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN','')
WHATSAPP_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_NUMBER_ID','')
WHATSAPP_API_VERSION = os.environ.get('WHATSAPP_API_VERSION','')
WHATSAPP_OTP_TEMPLATE = os.environ.get('WHATSAPP_OTP_TEMPLATE','')
WHATSAPP_TEMPLATE_LANGUAGE = os.environ.get('WHATSAPP_TEMPLATE_LANGUAGE','ar')
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST','localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT','587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER','')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD','')
EMAIL_USE_TLS = True
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL','noreply@localhost')
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL','redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_BEAT_SCHEDULE = {'process-durable-media':{'task':'core.media.tasks.process_pending','schedule':30.0}}

# Shared throttling cache for multi-process deployments; local memory remains dev-only.
if os.environ.get('REDIS_CACHE_URL'):
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache',
                          'LOCATION': os.environ['REDIS_CACHE_URL']}}

# Forwarding headers are trusted only when the operator declares a trusted ingress chain.
REST_FRAMEWORK['NUM_PROXIES'] = max(0, int(os.environ.get('TRUSTED_PROXY_COUNT', '0')))
