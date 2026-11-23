from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from core.common.views import DomainView, contract
from core.common.serializers import PageQuery, AcceptedResponse
from . import services
from .serializers import (
    RoleInput,
    RoleResponse,
    RoleListResponse,
    PERMISSIONS,
    ApprovalQuery,
    ApprovalDecision,
    ApprovalResponse,
    ApprovalListResponse,
    AuditQuery,
    AuditResponse,
    DashboardResponse,
    OverviewResponse,
    ContactResponse,
    ContactInput,
    ReportInput,
    ReportQuery,
    ReportResolveInput,
    ReportResponse,
    ReportListResponse,
    RatingInput,
    RatingResponse,
    RatingListResponse,
    SuspendStoreInput,
    AdminUserListResponse,
)


class ReportThrottle(SimpleRateThrottle):
    rate = "10/min"
    scope = "report"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


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
    @contract("API-065", "P6", response=ApprovalListResponse, parameters=[ApprovalQuery])
    def get(self, request):
        return Response(
            ApprovalListResponse(
                {
                    "data": services.approvals(
                        request.user, self.validated(ApprovalQuery, request.query_params)
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


class StoreRatingsView(DomainView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsAuthenticated()]

    @contract("API-072", "P5", response=RatingListResponse, parameters=[PageQuery], auth=[])
    def get(self, request, id):
        return Response(
            RatingListResponse(
                services.list_ratings(
                    "store", id, self.validated(PageQuery, request.query_params)
                )
            ).data
        )

    @contract("API-073", "P5", request=RatingInput, response=RatingResponse)
    def post(self, request, id):
        return Response(
            RatingResponse(
                {
                    "data": services.submit_rating(
                        request.user,
                        "store",
                        id,
                        self.validated(RatingInput, request.data),
                    )
                }
            ).data,
            status=201,
        )


class ModelRatingsView(DomainView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsAuthenticated()]

    @contract("API-074", "P5", response=RatingListResponse, parameters=[PageQuery], auth=[])
    def get(self, request, id):
        return Response(
            RatingListResponse(
                services.list_ratings(
                    "phone_model", id, self.validated(PageQuery, request.query_params)
                )
            ).data
        )

    @contract("API-075", "P5", request=RatingInput, response=RatingResponse)
    def post(self, request, id):
        return Response(
            RatingResponse(
                {
                    "data": services.submit_rating(
                        request.user,
                        "phone_model",
                        id,
                        self.validated(RatingInput, request.data),
                    )
                }
            ).data,
            status=201,
        )


class ReportCreateView(DomainView):
    permission_classes = [AllowAny]
    throttle_classes = [ReportThrottle]

    @contract("API-076", "P5", request=ReportInput, response=ReportResponse, auth=[])
    def post(self, request):
        return Response(
            ReportResponse(
                {
                    "data": services.submit_report(
                        request.user, self.validated(ReportInput, request.data)
                    )
                }
            ).data,
            status=201,
        )


class AdminReportsView(DomainView):
    @contract("API-077", "P6", response=ReportListResponse, parameters=[ReportQuery])
    def get(self, request):
        return Response(
            ReportListResponse(
                {
                    "data": services.list_reports(
                        request.user, self.validated(ReportQuery, request.query_params)
                    )
                }
            ).data
        )


class AdminReportResolveView(DomainView):
    @contract("API-078", "P6", request=ReportResolveInput, response=ReportResponse)
    def post(self, request, id):
        return Response(
            ReportResponse(
                {
                    "data": services.resolve_report(
                        request.user,
                        id,
                        self.validated(ReportResolveInput, request.data),
                        actor_ip=request.META.get("REMOTE_ADDR"),
                    )
                }
            ).data
        )


class AdminStoreSuspendView(DomainView):
    @contract("API-079", "P6", request=SuspendStoreInput, response=ApprovalResponse)
    def post(self, request, id):
        return Response(
            ApprovalResponse(
                {
                    "data": services.suspend_store_request(
                        request.user,
                        id,
                        self.validated(SuspendStoreInput, request.data),
                        actor_ip=request.META.get("REMOTE_ADDR"),
                    )
                }
            ).data,
            status=202,
        )


class AdminUsersView(DomainView):
    @contract("API-080", "P6", response=AdminUserListResponse)
    def get(self, request):
        return Response(
            AdminUserListResponse({"data": services.list_admin_users(request.user)}).data
        )
