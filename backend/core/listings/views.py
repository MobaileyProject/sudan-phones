from drf_spectacular.utils import OpenApiParameter
from rest_framework import serializers
from rest_framework.response import Response
from core.common.views import DomainView, contract
from core.common.serializers import PageQuery
from . import services
from .serializers import (
    CreateInput,
    PriceInput,
    StockInput,
    EditInput,
    ModerateInput,
    ListingResponse,
    ListingListResponse,
    ModerationResponse,
)

_KEY = OpenApiParameter(
    "Idempotency-Key",
    str,
    OpenApiParameter.HEADER,
    required=True,
    description="Stable UUID retained across ambiguous timeouts; reuse with changed payload returns 409.",
)


def key(request):
    return str(
        serializers.UUIDField().run_validation(request.headers.get("Idempotency-Key"))
    )


class ListingsView(DomainView):
    @contract("API-033", "P4", response=ListingListResponse, parameters=[PageQuery])
    def get(self, request):
        return Response(
            ListingListResponse(
                {
                    "data": services.merchant_list(
                        request.user, self.validated(PageQuery, request.query_params)
                    )
                }
            ).data
        )

    @contract(
        "API-054",
        "P4",
        request=CreateInput,
        response=ListingResponse,
        parameters=[_KEY],
    )
    def post(self, request):
        return Response(
            ListingResponse(
                {
                    "data": services.create_listing(
                        request.user,
                        self.validated(CreateInput, request.data),
                        key(request),
                    )
                }
            ).data,
            status=201,
        )


class StatusView(DomainView):
    @contract("API-034", "P4", response=ListingResponse)
    def get(self, request, id):
        return Response(
            ListingResponse({"data": services.merchant_status(request.user, id)}).data
        )


class EditView(DomainView):
    @contract(
        "API-038", "P4", request=EditInput, response=ListingResponse, parameters=[_KEY]
    )
    def patch(self, request, id):
        return Response(
            ListingResponse(
                {
                    "data": services.update_listing(
                        request.user,
                        id,
                        self.validated(EditInput, request.data),
                        key(request),
                        "edit",
                    )
                }
            ).data
        )


class PriceView(DomainView):
    @contract(
        "API-039", "P4", request=PriceInput, response=ListingResponse, parameters=[_KEY]
    )
    def patch(self, request, id):
        return Response(
            ListingResponse(
                {
                    "data": services.update_listing(
                        request.user,
                        id,
                        self.validated(PriceInput, request.data),
                        key(request),
                        "price",
                    )
                }
            ).data
        )


class StockView(DomainView):
    @contract(
        "API-040", "P4", request=StockInput, response=ListingResponse, parameters=[_KEY]
    )
    def patch(self, request, id):
        return Response(
            ListingResponse(
                {
                    "data": services.update_listing(
                        request.user,
                        id,
                        self.validated(StockInput, request.data),
                        key(request),
                        "stock",
                    )
                }
            ).data
        )


class ModerationQueueView(DomainView):
    @contract("API-008", "P4", response=ListingListResponse, parameters=[PageQuery])
    def get(self, request):
        return Response(
            ListingListResponse(
                {
                    "data": services.moderation_queue(
                        request.user, self.validated(PageQuery, request.query_params)
                    )
                }
            ).data
        )


class ModerateView(DomainView):
    @contract("API-044", "P4", request=ModerateInput, response=ModerationResponse)
    def post(self, request, id):
        return Response(
            ModerationResponse(
                {
                    "data": services.moderate(
                        request.user,
                        id,
                        self.validated(ModerateInput, request.data),
                        actor_ip=request.META.get("REMOTE_ADDR"),
                    )
                }
            ).data
        )
