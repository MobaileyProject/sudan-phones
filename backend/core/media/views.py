from rest_framework.response import Response
from core.common.views import DomainView, contract
from core.common.serializers import AcceptedResponse
from .serializers import UploadInput, DocumentInput, UploadResponse
from . import services


class UploadView(DomainView):
    @contract("API-050", "P4", request=UploadInput, response=UploadResponse)
    def post(self, request):
        return Response(
            UploadResponse(
                {
                    "data": services.initiate(
                        request.user, self.validated(UploadInput, request.data)
                    )
                }
            ).data,
            status=201,
        )


class DocumentUploadView(DomainView):
    @contract("API-056", "P3", request=DocumentInput, response=UploadResponse)
    def post(self, request):
        return Response(
            UploadResponse(
                {
                    "data": services.initiate(
                        request.user,
                        self.validated(DocumentInput, request.data),
                        purpose="verification",
                    )
                }
            ).data,
            status=201,
        )


class CompleteView(DomainView):
    @contract("API-063", "P4", response=AcceptedResponse)
    def post(self, request, id):
        return Response({"data": services.complete(request.user, id)}, status=202)
