"""Request tracing, locale/cache headers and JSON errors for the versioned API."""
import uuid
from types import SimpleNamespace

from django.core.exceptions import TooManyFieldsSent
from django.http import JsonResponse
from django.utils.translation import get_language_from_request

from core.errors import error_payload


class ApiResponseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith('/api/v1/'):
            return self.get_response(request)
        request.request_id = str(uuid.uuid4())
        # Public responses vary by Accept-Language, never by a language/session
        # cookie. Keep Django's regional-language negotiation without cookies.
        language_request = SimpleNamespace(COOKIES={}, META={
            'HTTP_ACCEPT_LANGUAGE': request.headers.get('Accept-Language', '')})
        locale = get_language_from_request(language_request).split('-')[0]
        request.api_locale = locale
        try:
            requested = request.GET.getlist('locale')
        except TooManyFieldsSent:
            response = JsonResponse(error_payload(400, locale), status=400)
        else:
            if len(requested) == 1 and requested[0] in ('ar', 'en'):
                request.api_locale = requested[0]
            response = self.get_response(request)
        if response.status_code >= 400 and not response.get('Content-Type', '').startswith('application/json'):
            response = JsonResponse(error_payload(response.status_code, request.api_locale), status=response.status_code)
        response['X-Request-ID'] = request.request_id
        response['Content-Language'] = request.api_locale
        if response.status_code >= 400 or request.path == '/api/v1/health':
            response['Cache-Control'] = 'no-store'
        return response
