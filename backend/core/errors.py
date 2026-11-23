"""Stable error envelopes without exception text, submitted values or private data."""
import logging

from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

from core.bootstrap.services import get_bundle

_STATUS = {
    400: ('PARSE_ERROR', 'parse'), 401: ('UNAUTHORIZED', 'unauthorized'),
    403: ('FORBIDDEN', 'forbidden'), 404: ('NOT_FOUND', 'not_found'),
    405: ('METHOD_NOT_ALLOWED', 'method_not_allowed'), 406: ('NOT_ACCEPTABLE', 'not_acceptable'),
    415: ('UNSUPPORTED_MEDIA_TYPE', 'unsupported_media_type'), 429: ('THROTTLED', 'throttled'),
}


def error_payload(status: int, locale: str, validation=None) -> dict:
    strings = get_bundle(locale)['strings']
    code, key = _STATUS.get(status, ('INTERNAL_ERROR', 'internal'))
    details = []
    if validation is not None:
        code, key = 'VALIDATION_ERROR', 'validation'

        def flatten(value, path=''):
            if isinstance(value, dict):
                for field, child in value.items():
                    flatten(child, f'{path}.{field}' if path else str(field))
            elif isinstance(value, list):
                for index, child in enumerate(value):
                    flatten(child, f'{path}.{index}' if isinstance(child, (dict, list)) else path)
            else:
                details.append({'field': path, 'code': getattr(value, 'code', 'invalid'),
                                'message': strings['errors.invalid_value']})

        flatten(validation)
    return {'error': {'code': code, 'message': strings['errors.' + key], 'details': details}}


_DOMAIN_MESSAGES = {
    'INVALID_CREDENTIALS': {
        'ar': 'البريد الإلكتروني أو رقم الهاتف أو كلمة المرور غير صحيحة.',
        'en': 'Invalid email, phone number, or password.',
    },
    'ACCOUNT_UNAVAILABLE': {
        'ar': 'هذا الحساب أو رقم الهاتف مسجل مسبقاً.',
        'en': 'This account or phone number is already registered.',
    },
    'INVALID_OTP': {
        'ar': 'رمز التحقق غير صحيح أو منتهي الصلاحية.',
        'en': 'Verification code is invalid or expired.',
    },
    'INVALID_GOOGLE_TOKEN': {
        'ar': 'تعذر التحقق من حساب جوجل، حاول مرة أخرى.',
        'en': 'Could not verify Google account. Please try again.',
    },
    'SELF_RATING_FORBIDDEN': {
        'ar': 'لا يمكنك تقييم متجرك الخاص.',
        'en': 'You cannot rate your own store.',
    },
    'STALE_VERSION': {
        'ar': 'تم تحديث البيانات من مستخدم آخر، يرجى التحديث والمحاولة مجدداً.',
        'en': 'This item was updated elsewhere. Please refresh and try again.',
    },
    'PHONE_NOT_VERIFIED': {
        'ar': 'يرجى توثيق رقم الهاتف أولاً.',
        'en': 'Please verify your phone number first.',
    },
}


def api_exception_handler(exc, context):
    request = context.get('request')
    locale = getattr(request, 'api_locale', 'ar')
    from core.common.domain import DomainError
    if isinstance(exc, DomainError):
        payload = error_payload(exc.status, locale)
        payload['error']['code'] = exc.code
        custom = _DOMAIN_MESSAGES.get(exc.code)
        if custom:
            payload['error']['message'] = custom.get(locale, custom['ar'])
        return Response(payload, status=exc.status)
    response = exception_handler(exc, context)
    if response is None:
        logging.getLogger(__name__).error('Unhandled API exception (%s), request_id=%s',
                                         type(exc).__name__, getattr(request, 'request_id', 'unknown'))
        return Response(error_payload(500, locale), status=500)
    response.data = error_payload(response.status_code, locale,
                                  exc.detail if isinstance(exc, ValidationError) else None)
    return response
