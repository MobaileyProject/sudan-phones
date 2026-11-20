"""Read-only public bootstrap data; never expose the settings object or read users."""
import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings

SUPPORTED_LOCALES = ('ar', 'en')
_CITIES = (
    ('port_sudan', 'بورتسودان', 'Port Sudan', 19.6158, 37.2164, 45),
    ('khartoum', 'الخرطوم', 'Khartoum', 15.5007, 32.5599, 35),
    ('omdurman', 'أم درمان', 'Omdurman', 15.6500, 32.4833, 35),
)


@lru_cache(maxsize=2)
def _strings(locale):
    # Locale is an allowlisted value, never a user-provided filesystem path.
    if locale not in SUPPORTED_LOCALES:
        raise ValueError('Unsupported locale')
    return json.loads((Path(__file__).parent / 'locales' / f'{locale}.json').read_text(encoding='utf-8'))


def get_bundle(locale: str) -> dict:
    strings = dict(_strings(locale))
    return {'locale': locale, 'direction': 'rtl' if locale == 'ar' else 'ltr',
            'version': '1', 'strings': strings}


def get_public_config(locale: str) -> dict:
    if locale not in SUPPORTED_LOCALES:
        raise ValueError('Unsupported locale')
    return {
        'api_version': '1.0.0', 'minimum_app_version': settings.MINIMUM_APP_VERSION,
        'currency': {'code': 'SDG', 'decimal_places': 2},
        'default_locale': 'ar', 'supported_locales': list(SUPPORTED_LOCALES),
        'locale': locale, 'direction': 'rtl' if locale == 'ar' else 'ltr',
        'cities': [
            {
                'id': city[0],
                'name': city[1 if locale == 'ar' else 2],
                'lat': city[3],
                'lon': city[4],
                'radius_km': city[5],
            }
            for city in _CITIES
        ],
        'features': {'customer_accounts': False, 'payments': False, 'paid_ads': False},
    }
