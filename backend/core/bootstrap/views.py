"""Public HTTP adapters; all bootstrap data is assembled in read-only services."""
from django.utils.cache import patch_vary_headers
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (BundleResponseSerializer, ConfigResponseSerializer, ErrorResponseSerializer,
                          HealthResponseSerializer, LocaleQuerySerializer, StrictQuerySerializer)
from .services import get_bundle, get_public_config

_ERRORS = {400: ErrorResponseSerializer, 405: ErrorResponseSerializer,
           406: ErrorResponseSerializer, 500: ErrorResponseSerializer}
_LANGUAGE = OpenApiParameter('Accept-Language', str, OpenApiParameter.HEADER,
                             description='Arabic default; supports ar/en and regional variants.')
_REQUEST_ID = OpenApiParameter('X-Request-ID', str, OpenApiParameter.HEADER,
                               response=True, description='Server-generated UUID for this request.')


class PublicBootstrapView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    renderer_classes = [JSONRenderer]
    http_method_names = ['get', 'head', 'options']

    def locale(self, request):
        query = LocaleQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        return query.validated_data.get('locale', request.api_locale)

    def public_response(self, payload, serializer):
        response = Response(serializer({'data': payload}).data)
        response['Cache-Control'] = 'public, max-age=300'
        patch_vary_headers(response, ['Accept-Language'])
        return response


class ConfigView(PublicBootstrapView):
    @extend_schema(operation_id='public_config', tags=['bootstrap'], auth=[],
                   parameters=[LocaleQuerySerializer, _LANGUAGE, _REQUEST_ID],
                   responses={200: ConfigResponseSerializer, **_ERRORS},
                   extensions={'x-api-id': 'API-019', 'x-phase': 'P2'})
    def get(self, request):
        return self.public_response(get_public_config(self.locale(request)), ConfigResponseSerializer)


class BundleView(PublicBootstrapView):
    @extend_schema(operation_id='localization_bundle', tags=['bootstrap'], auth=[],
                   parameters=[LocaleQuerySerializer, _LANGUAGE, _REQUEST_ID],
                   responses={200: BundleResponseSerializer, **_ERRORS},
                   extensions={'x-api-id': 'API-021', 'x-phase': 'P2'})
    def get(self, request):
        return self.public_response(get_bundle(self.locale(request)), BundleResponseSerializer)


class HealthView(PublicBootstrapView):
    @extend_schema(operation_id='liveness', tags=['bootstrap'], auth=[], parameters=[_REQUEST_ID],
                   responses={200: HealthResponseSerializer, **_ERRORS},
                   extensions={'x-api-id': 'API-061', 'x-phase': 'P2'})
    def get(self, request):
        query = StrictQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        return Response(HealthResponseSerializer({'data': {'status': 'ok'}}).data)
