"""Request tracing, locale/cache headers and JSON errors for the versioned API."""
import uuid
from types import SimpleNamespace

from django.conf import settings
from django.core.exceptions import TooManyFieldsSent
from django.http import HttpResponse, JsonResponse
from django.utils.translation import get_language_from_request

from core.errors import error_payload


class ApiResponseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def _apply_cors(self, request, response):
        origin = request.headers.get('Origin')
        allowed = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        if origin and origin in allowed:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, X-Session-Token, Idempotency-Key, Accept-Language'
            response['Access-Control-Expose-Headers'] = 'X-CSRFToken, X-Session-Token, X-Request-ID, Content-Language'
            vary = response.get('Vary', '')
            if 'Origin' not in vary:
                response['Vary'] = f'{vary}, Origin'.strip(', ')
        return response

    def __call__(self, request):
        if request.path.startswith('/media-transfer/'):
            if request.method == 'OPTIONS':
                return self._apply_cors(request, HttpResponse(status=204))
            return self._apply_cors(request, self.get_response(request))
        if not request.path.startswith('/api/v1/'):
            return self.get_response(request)
        if request.method == 'OPTIONS' and request.headers.get('Origin') in getattr(settings, 'CORS_ALLOWED_ORIGINS', []):
            return self._apply_cors(request, HttpResponse(status=204))
        # Allow mobile APK clients to persist Django sessions across app restarts via X-Session-Token.
        # Always prefer an explicit X-Session-Token header over any stale WebView/HTTP cookie.
        session_token = request.headers.get('X-Session-Token')
        if session_token:
            request.COOKIES[settings.SESSION_COOKIE_NAME] = session_token
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
        user = getattr(request, 'user', None)
        session = getattr(request, 'session', None)
        if user is not None and getattr(user, 'is_authenticated', False) and session is not None and session.session_key:
            response['X-Session-Token'] = session.session_key
        response['X-Request-ID'] = request.request_id
        response['Content-Language'] = request.api_locale
        if response.status_code >= 400 or request.path == '/api/v1/health':
            response['Cache-Control'] = 'no-store'
        return self._apply_cors(request, response)
