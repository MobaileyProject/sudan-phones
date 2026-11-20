from drf_spectacular.utils import extend_schema
from rest_framework.renderers import JSONRenderer
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from core.bootstrap.serializers import ErrorResponseSerializer
from .metadata import SUMMARIES


class DomainView(APIView):
    renderer_classes = [JSONRenderer]
    permission_classes = [IsAuthenticated]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        return response

    def validated(self, serializer, data):
        value = serializer(data=data)
        value.is_valid(raise_exception=True)
        return value.validated_data


def contract(api_id, phase, request=None, response=None, **kwargs):
    successes = (
        (201,)
        if api_id
        in {"API-049", "API-051", "API-055", "API-056", "API-057", "API-050", "API-054"}
        else (202,)
        if api_id in {"API-063", "API-001"}
        else (200, 201)
        if api_id == "API-045"
        else (200,)
    )
    return extend_schema(
        operation_id=api_id.lower().replace("-", "_"),
        tags=[phase],
        summary=SUMMARIES[api_id],
        description=SUMMARIES[api_id]
        + ". See docs/api for authorization, state transitions, examples and deployment prerequisites.",
        request=request,
        responses={
            **{status: response for status in successes},
            400: ErrorResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
            409: ErrorResponseSerializer,
            429: ErrorResponseSerializer,
            500: ErrorResponseSerializer,
            503: ErrorResponseSerializer,
        },
        extensions={"x-api-id": api_id, "x-phase": phase},
        **kwargs,
    )
