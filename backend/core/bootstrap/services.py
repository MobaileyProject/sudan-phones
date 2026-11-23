"""Read-only public bootstrap data; never expose the settings object or read users."""
import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings

SUPPORTED_LOCALES = ('ar', 'en')
_CITIES = (
    ('khartoum', 'ولاية الخرطوم', 'Khartoum State', (
        'khartoum', 'الخرطوم', 'khartoum state', 'ولاية الخرطوم',
    )),
    ('port_sudan', 'ولاية البحر الأحمر (بورتسودان)', 'Red Sea (Port Sudan)', (
        'port sudan', 'portsudan', 'بورتسودان', 'red sea', 'البحر الأحمر', 'البحر الاحمر',
    )),
    ('omdurman', 'أم درمان (ولاية الخرطوم)', 'Omdurman (Khartoum)', (
        'omdurman', 'أم درمان', 'ام درمان', 'امدرمان', 'أمدرمان',
    )),
    ('al_jazirah', 'ولاية الجزيرة (ود مدني)', 'Al Jazirah (Wad Madani)', (
        'al jazirah', 'gezira', 'wad madani', 'الجزيرة', 'ود مدني',
    )),
    ('river_nile', 'ولاية نهر النيل (عطبرة / الدامر)', 'River Nile (Atbara / Ed Damer)', (
        'river nile', 'atbara', 'ed damer', 'نهر النيل', 'عطبرة', 'الدامر',
    )),
    ('northern', 'الولاية الشمالية (دنقلا)', 'Northern State (Dongola)', (
        'northern', 'dongola', 'الشمالية', 'دنقلا',
    )),
    ('kassala', 'ولاية كسلا', 'Kassala State', (
        'kassala', 'كسلا',
    )),
    ('gedaref', 'ولاية القضارف', 'Al Qadarif (Gedaref)', (
        'gedaref', 'al qadarif', 'qadarif', 'القضارف',
    )),
    ('sennar', 'ولاية سنار (سنجة)', 'Sennar State (Singa)', (
        'sennar', 'singa', 'سنار', 'سنجة',
    )),
    ('white_nile', 'ولاية النيل الأبيض (كوستي / ربك)', 'White Nile (Kosti / Rabak)', (
        'white nile', 'kosti', 'rabak', 'النيل الأبيض', 'كوستي', 'ربك',
    )),
    ('blue_nile', 'ولاية النيل الأزرق (الدمازين)', 'Blue Nile (Ad-Damazin)', (
        'blue nile', 'ad-damazin', 'damazin', 'النيل الأزرق', 'الدمازين',
    )),
    ('north_kordofan', 'ولاية شمال كردفان (الأبيض)', 'North Kordofan (El-Obeid)', (
        'north kordofan', 'el-obeid', 'el obeid', 'شمال كردفان', 'الأبيض',
    )),
    ('south_kordofan', 'ولاية جنوب كردفان (كادوقلي)', 'South Kordofan (Kadugli)', (
        'south kordofan', 'kadugli', 'جنوب كردفان', 'كادوقلي',
    )),
    ('west_kordofan', 'ولاية غرب كردفان (الفولة)', 'West Kordofan (Al-Fulah)', (
        'west kordofan', 'al-fulah', 'fulah', 'غرب كردفان', 'الفولة',
    )),
    ('north_darfur', 'ولاية شمال دارفور (الفاشر)', 'North Darfur (El Fasher)', (
        'north darfur', 'el fasher', 'شمال دارفور', 'الفاشر',
    )),
    ('south_darfur', 'ولاية جنوب دارفور (نيالا)', 'South Darfur (Nyala)', (
        'south darfur', 'nyala', 'جنوب دارفور', 'نيالا',
    )),
    ('west_darfur', 'ولاية غرب دارفور (الجنينة)', 'West Darfur (Geneina)', (
        'west darfur', 'geneina', 'غرب دارفور', 'الجنينة',
    )),
    ('central_darfur', 'ولاية وسط دارفور (زالنجي)', 'Central Darfur (Zalingei)', (
        'central darfur', 'zalingei', 'وسط دارفور', 'زالنجي',
    )),
    ('east_darfur', 'ولاية شرق دارفور (الضعين)', 'East Darfur (Ed Daein)', (
        'east darfur', 'ed daein', 'شرق دارفور', 'الضعين',
    )),
)
CITY_IDS = [city[0] for city in _CITIES]


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
                'aliases': list(city[3]),
            }
            for city in _CITIES
        ],
        'features': {'customer_accounts': True, 'payments': False, 'paid_ads': False},
    }
