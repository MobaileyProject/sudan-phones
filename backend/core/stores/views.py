from rest_framework.response import Response
from core.common.views import DomainView, contract
from core.common.serializers import AcceptedResponse, IDResponse
from . import services
from .serializers import (
    ProfileInput,
    SettingsInput,
    StaffInput,
    StaffListResponse,
    StoreResponse,
)


class StoreView(DomainView):
    @contract("API-030", "P3", response=StoreResponse)
    def get(self, request):
        return Response(
            StoreResponse(
                {"data": services.member_store(request.user, allow_inactive=True)}
            ).data
        )

    @contract("API-059", "P3", request=SettingsInput, response=StoreResponse)
    def put(self, request):
        return Response(
            StoreResponse(
                {
                    "data": services.update_settings(
                        request.user, self.validated(SettingsInput, request.data)
                    )
                }
            ).data
        )


class ProfileView(DomainView):
    @contract("API-060", "P3", request=ProfileInput, response=StoreResponse)
    def put(self, request):
        return Response(
            StoreResponse(
                {
                    "data": services.update_profile(
                        request.user, self.validated(ProfileInput, request.data)
                    )
                }
            ).data
        )


class StaffView(DomainView):
    @contract("API-070", "P3", response=StaffListResponse)
    def get(self, request):
        return Response(
            StaffListResponse({"data": services.list_staff(request.user)}).data
        )

    @contract("API-055", "P3", request=StaffInput, response=IDResponse)
    def post(self, request):
        member = services.add_staff(
            request.user, self.validated(StaffInput, request.data)
        )
        return Response({"data": {"id": member.pk}}, status=201)


class StaffDetailView(DomainView):
    @contract("API-004", "P3", response=AcceptedResponse)
    def delete(self, request, id):
        services.remove_staff(request.user, id)
        return Response({"data": {"accepted": True}})
