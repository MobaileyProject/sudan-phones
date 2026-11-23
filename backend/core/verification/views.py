from rest_framework.response import Response
from core.common.views import DomainView, contract
from core.common.serializers import PageQuery
from .serializers import (
    SubmitInput,
    ReverificationInput,
    DecisionInput,
    VerificationResponse,
    VerificationListResponse,
    DocumentResponse,
)
from . import services


class VerificationView(DomainView):
    @contract("API-035", "P3", response=VerificationResponse)
    def get(self, request):
        return Response(
            VerificationResponse({"data": services.status(request.user)}).data
        )


class SubmitView(DomainView):
    @contract("API-057", "P3", request=SubmitInput, response=VerificationResponse)
    def post(self, request):
        return Response(
            VerificationResponse(
                {
                    "data": services.submit(
                        request.user, self.validated(SubmitInput, request.data)
                    )
                }
            ).data,
            status=201,
        )


class ReverificationView(DomainView):
    @contract("API-069", "P3", request=ReverificationInput, response=VerificationResponse)
    def post(self, request):
        return Response(
            VerificationResponse(
                {
                    "data": services.request_reverification(
                        request.user, self.validated(ReverificationInput, request.data)
                    )
                }
            ).data,
            status=201,
        )


class QueueView(DomainView):
    @contract(
        "API-011", "P3", response=VerificationListResponse, parameters=[PageQuery]
    )
    def get(self, request):
        return Response(
            VerificationListResponse(
                {
                    "data": services.queue(
                        request.user, self.validated(PageQuery, request.query_params)
                    )
                }
            ).data
        )


class DetailView(DomainView):
    @contract("API-012", "P3", response=VerificationResponse)
    def get(self, request, id):
        return Response(
            VerificationResponse({"data": services.detail(request.user, id)}).data
        )


class DocumentsView(DomainView):
    @contract("API-013", "P3", response=DocumentResponse)
    def get(self, request, id):
        return Response(
            DocumentResponse({"data": services.documents(request.user, id)}).data
        )


class DecisionView(DomainView):
    @contract("API-046", "P3", request=DecisionInput, response=VerificationResponse)
    def post(self, request, id):
        return Response(
            VerificationResponse(
                {
                    "data": services.decide(
                        request.user,
                        id,
                        self.validated(DecisionInput, request.data),
                        actor_ip=request.META.get("REMOTE_ADDR"),
                    )
                }
            ).data
        )
