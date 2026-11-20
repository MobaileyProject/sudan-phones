from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.common.views import DomainView, contract
from core.common.serializers import PageQuery, AcceptedResponse
from . import services
from .serializers import (
    RoleInput,
    RoleResponse,
    RoleListResponse,
    PERMISSIONS,
    ApprovalDecision,
    ApprovalResponse,
    ApprovalListResponse,
    AuditQuery,
    AuditResponse,
    DashboardResponse,
    OverviewResponse,
    ContactResponse,
    ContactInput,
)


class RolesView(DomainView):
    @contract("API-010", "P6", response=RoleListResponse, parameters=[PageQuery])
    def get(self, request):
        return Response(
            RoleListResponse(
                {
                    "data": services.roles(
                        request.user, self.validated(PageQuery, request.query_params)
                    ),
                    "available_permissions": PERMISSIONS,
                }
            ).data
        )

    @contract("API-045", "P6", request=RoleInput, response=RoleResponse)
    def post(self, request):
        data = self.validated(RoleInput, request.data)
        return Response(
            RoleResponse(
                {
                    "data": services.save_role(
                        request.user, data, actor_ip=request.META.get("REMOTE_ADDR")
                    )
                }
            ).data,
            status=200 if "id" in data else 201,
        )


class RoleDeleteView(DomainView):
    @contract("API-001", "P6", response=ApprovalResponse)
    def delete(self, request, id):
        return Response(
            ApprovalResponse(
                {
                    "data": services.delete_role(
                        request.user, id, actor_ip=request.META.get("REMOTE_ADDR")
                    )
                }
            ).data,
            status=202,
        )


class ApprovalListView(DomainView):
    @contract("API-065", "P6", response=ApprovalListResponse, parameters=[PageQuery])
    def get(self, request):
        return Response(
            ApprovalListResponse(
                {
                    "data": services.approvals(
                        request.user, self.validated(PageQuery, request.query_params)
                    )
                }
            ).data
        )


class ApprovalDecisionView(DomainView):
    @contract("API-043", "P6", request=ApprovalDecision, response=ApprovalResponse)
    def post(self, request, id):
        return Response(
            ApprovalResponse(
                {
                    "data": services.decide(
                        request.user,
                        id,
                        self.validated(ApprovalDecision, request.data),
                        actor_ip=request.META.get("REMOTE_ADDR"),
                    )
                }
            ).data
        )


class AuditView(DomainView):
    @contract("API-006", "P6", response=AuditResponse, parameters=[AuditQuery])
    def get(self, request):
        return Response(
            AuditResponse(
                {
                    "data": services.audits(
                        request.user, self.validated(AuditQuery, request.query_params)
                    )
                }
            ).data
        )


class DashboardView(DomainView):
    @contract("API-032", "P6", response=DashboardResponse)
    def get(self, request):
        return Response(
            DashboardResponse({"data": services.dashboard(request.user)}).data
        )


class OverviewView(DomainView):
    @contract("API-009", "P6", response=OverviewResponse)
    def get(self, request):
        return Response(
            OverviewResponse({"data": services.overview(request.user)}).data
        )


class ContactMethodsView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @contract("API-024", "P6", response=ContactResponse, auth=[])
    def get(self, request, id):
        return Response(ContactResponse({"data": services.contact_methods(id)}).data)


class ContactEventView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @contract("API-064", "P6", request=ContactInput, response=AcceptedResponse, auth=[])
    def post(self, request, id):
        return Response(
            {
                "data": services.contact_event(
                    id, self.validated(ContactInput, request.data)
                )
            }
        )
