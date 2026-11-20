"""Core views and health/introspection handlers."""
from django.http import JsonResponse
from rest_framework.views import APIView

from core.errors import error_payload


def api_404(request, exception=None):
    locale = getattr(request, "api_locale", "ar")
    return JsonResponse(error_payload(404, locale), status=404)


def api_500(request):
    locale = getattr(request, "api_locale", "ar")
    return JsonResponse(error_payload(500, locale), status=500)



def csrf_failure(request, reason=''):
    from django.http import JsonResponse
    from core.errors import error_payload
    return JsonResponse(error_payload(403, getattr(request, 'api_locale', 'ar')), status=403)
