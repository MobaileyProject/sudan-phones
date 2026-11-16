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


def api_exception_handler(exc, context):
    request = context.get('request')
    locale = getattr(request, 'api_locale', 'ar')
    response = exception_handler(exc, context)
    if response is None:
        logging.getLogger(__name__).error('Unhandled API exception (%s), request_id=%s',
                                         type(exc).__name__, getattr(request, 'request_id', 'unknown'))
        return Response(error_payload(500, locale), status=500)
    response.data = error_payload(response.status_code, locale,
                                  exc.detail if isinstance(exc, ValidationError) else None)
    return response
