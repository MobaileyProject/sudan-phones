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
    StatusInput,
    EditInput,
    ModerateInput,
    BulkPriceInput,
    BulkPriceResponse,
    BulkImportInput,
    BulkImportResponse,
    ArchiveResponse,
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

    @contract("API-115", "P4", request=StatusInput, response=ListingResponse)
    def patch(self, request, id):
        payload = self.validated(StatusInput, request.data)
        return Response(
            ListingResponse(
                {"data": services.set_listing_status(request.user, id, payload)}
            ).data
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

    @contract("API-081", "P4", response=ArchiveResponse)
    def delete(self, request, id):
        return Response(
            ArchiveResponse({"data": services.archive_listing(request.user, id)}).data
        )


class DuplicateView(DomainView):
    @contract("API-087", "P4", response=ListingResponse)
    def post(self, request, id):
        return Response(
            ListingResponse({"data": services.duplicate_listing(request.user, id)}).data,
            status=201,
        )


class BulkPriceView(DomainView):
    @contract("API-082", "P4", request=BulkPriceInput, response=BulkPriceResponse)
    def post(self, request):
        return Response(
            BulkPriceResponse(
                {
                    "data": services.bulk_update_prices(
                        request.user, self.validated(BulkPriceInput, request.data)
                    )
                }
            ).data
        )


class BulkImportView(DomainView):
    @contract("API-083", "P4", request=BulkImportInput, response=BulkImportResponse)
    def post(self, request):
        return Response(
            BulkImportResponse(
                {
                    "data": services.bulk_import_listings(
                        request.user, self.validated(BulkImportInput, request.data)
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
