from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from core.common.views import DomainView, contract
from core.common.serializers import PageQuery, AcceptedResponse
from . import ads as ads_services
from . import engagement
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
    FavoriteListResponse,
    FavoriteActionResponse,
    ProductRatingListResponse,
    ProductRatingCreateResponse,
    PriceAlertInput,
    PriceAlertResponse,
    PriceAlertListResponse,
    DeleteFlagResponse,
    NotificationListResponse,
    ReadFlagResponse,
    StoreMessageInput,
    StoreMessageListResponse,
    StoreMessageSendResponse,
    ChatThreadListResponse,
    MerchantChatReplyInput,
    SponsoredAdResponse,
    SponsoredAdListResponse,
    MerchantAdsSummaryResponse,
    AdQuery,
    AdImpressionInput,
    AdClickInput,
    MerchantAdRequestInput,
    AdminAdInput,
    AdminAdPatchInput,
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


class FavoritesView(DomainView):
    @contract("API-084", "P5", response=FavoriteListResponse)
    def get(self, request):
        return Response(
            FavoriteListResponse({"data": services.list_favorites(request.user)}).data
        )


class FavoriteDetailView(DomainView):
    @contract("API-085", "P5", response=FavoriteActionResponse)
    def post(self, request, listing_id):
        return Response(
            FavoriteActionResponse(
                {"data": services.add_favorite(request.user, listing_id)}
            ).data,
            status=201,
        )

    @contract("API-086", "P5", response=FavoriteActionResponse)
    def delete(self, request, listing_id):
        return Response(
            FavoriteActionResponse(
                {"data": services.remove_favorite(request.user, listing_id)}
            ).data
        )


def _visitor_id(request):
    return (
        request.headers.get("X-Chat-Visitor-Id")
        or request.query_params.get("visitor_id")
        or ""
    )


class AllProductRatingsView(DomainView):
    permission_classes = [AllowAny]

    @contract("API-092", "P5", response=ProductRatingListResponse, auth=[])
    def get(self, request):
        return Response(
            ProductRatingListResponse(
                {"data": engagement.list_all_product_ratings()}
            ).data
        )


class ListingRatingsView(DomainView):
    permission_classes = [AllowAny]

    @contract("API-093", "P5", response=ProductRatingListResponse, auth=[])
    def get(self, request, id):
        return Response(
            ProductRatingListResponse(engagement.list_listing_ratings(id)).data
        )

    @contract(
        "API-094", "P5", request=RatingInput, response=ProductRatingCreateResponse, auth=[]
    )
    def post(self, request, id):
        payload = engagement.submit_listing_rating(
            request.user, id, self.validated(RatingInput, request.data)
        )
        return Response(ProductRatingCreateResponse(payload).data, status=201)


class PriceAlertsView(DomainView):
    permission_classes = [AllowAny]

    @contract("API-095", "P5", response=PriceAlertListResponse, auth=[])
    def get(self, request):
        return Response(
            PriceAlertListResponse(
                {"data": engagement.list_alerts(request.user, _visitor_id(request))}
            ).data
        )

    @contract("API-096", "P5", request=PriceAlertInput, response=PriceAlertResponse, auth=[])
    def post(self, request):
        data, created = engagement.create_alert(
            request.user,
            self.validated(PriceAlertInput, request.data),
            _visitor_id(request),
        )
        return Response(
            PriceAlertResponse({"data": data}).data, status=201 if created else 200
        )


class PriceAlertDetailView(DomainView):
    permission_classes = [AllowAny]

    @contract("API-097", "P5", response=DeleteFlagResponse, auth=[])
    def delete(self, request, id):
        return Response(
            DeleteFlagResponse(
                {
                    "data": engagement.delete_alert(
                        request.user, id, _visitor_id(request)
                    )
                }
            ).data
        )


class NotificationsView(DomainView):
    permission_classes = [AllowAny]

    @contract("API-098", "P5", response=NotificationListResponse, auth=[])
    def get(self, request):
        return Response(
            NotificationListResponse(
                {
                    "data": engagement.list_notifications(
                        request.user, _visitor_id(request)
                    )
                }
            ).data
        )


class NotificationsReadView(DomainView):
    permission_classes = [AllowAny]

    @contract("API-099", "P5", response=ReadFlagResponse, auth=[])
    def post(self, request):
        return Response(
            ReadFlagResponse(
                {
                    "data": engagement.mark_notifications_read(
                        request.user, _visitor_id(request)
                    )
                }
            ).data
        )


class BuyerChatsView(DomainView):
    permission_classes = [AllowAny]

    @contract("API-100", "P5", response=ChatThreadListResponse, auth=[])
    def get(self, request):
        return Response(
            ChatThreadListResponse(
                {"data": engagement.list_buyer_chats(request.user, _visitor_id(request))}
            ).data
        )


class StoreMessagesView(DomainView):
    permission_classes = [AllowAny]

    @contract("API-101", "P5", response=StoreMessageListResponse, auth=[])
    def get(self, request, id):
        return Response(
            StoreMessageListResponse(
                {
                    "data": engagement.list_store_messages(
                        request.user, id, _visitor_id(request)
                    )
                }
            ).data
        )

    @contract(
        "API-102",
        "P5",
        request=StoreMessageInput,
        response=StoreMessageSendResponse,
        auth=[],
    )
    def post(self, request, id):
        locale = getattr(request, "api_locale", "ar")
        result = engagement.send_store_message(
            request.user,
            id,
            self.validated(StoreMessageInput, request.data),
            _visitor_id(request),
            locale=locale,
        )
        return Response(StoreMessageSendResponse({"data": result}).data, status=201)


class MerchantChatsView(DomainView):
    @contract("API-103", "P5", response=ChatThreadListResponse)
    def get(self, request):
        return Response(
            ChatThreadListResponse(
                {"data": engagement.list_merchant_chats(request.user)}
            ).data
        )


class MerchantChatReplyView(DomainView):
    @contract(
        "API-104",
        "P5",
        request=MerchantChatReplyInput,
        response=StoreMessageSendResponse,
    )
    def post(self, request, thread_key):
        data = self.validated(MerchantChatReplyInput, request.data)
        result = engagement.reply_merchant_chat(request.user, thread_key, data["text"])
        return Response(StoreMessageSendResponse({"data": result}).data, status=201)


class MerchantChatReadView(DomainView):
    @contract("API-105", "P5", response=ReadFlagResponse)
    def post(self, request, thread_key):
        return Response(
            ReadFlagResponse(
                {"data": engagement.mark_merchant_chat_read(request.user, thread_key)}
            ).data
        )


class ActiveAdsView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @contract("API-106", "P5", response=SponsoredAdListResponse, parameters=[AdQuery], auth=[])
    def get(self, request):
        query = self.validated(AdQuery, request.query_params)
        return Response(
            SponsoredAdListResponse(
                {"data": ads_services.list_active_ads(query.get("city", "all"))}
            ).data
        )


class AdImpressionView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @contract(
        "API-107",
        "P5",
        request=AdImpressionInput,
        response=SponsoredAdResponse,
        auth=[],
    )
    def post(self, request, id):
        self.validated(AdImpressionInput, request.data or {})
        return Response(
            SponsoredAdResponse({"data": ads_services.record_ad_impression(id)}).data
        )


class AdClickView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @contract(
        "API-108", "P5", request=AdClickInput, response=SponsoredAdResponse, auth=[]
    )
    def post(self, request, id):
        data = self.validated(AdClickInput, request.data or {})
        return Response(
            SponsoredAdResponse({"data": ads_services.record_ad_click(id, data)}).data
        )


class MerchantAdsView(DomainView):
    @contract("API-109", "P5", response=MerchantAdsSummaryResponse)
    def get(self, request):
        return Response(
            MerchantAdsSummaryResponse(
                {"data": ads_services.list_merchant_ads(request.user)}
            ).data
        )


class MerchantAdRequestView(DomainView):
    @contract(
        "API-110",
        "P5",
        request=MerchantAdRequestInput,
        response=SponsoredAdResponse,
    )
    def post(self, request):
        return Response(
            SponsoredAdResponse(
                {
                    "data": ads_services.request_merchant_ad(
                        request.user,
                        self.validated(MerchantAdRequestInput, request.data),
                        actor_ip=request.META.get("REMOTE_ADDR"),
                    )
                }
            ).data,
            status=201,
        )


class AdminAdsView(DomainView):
    @contract("API-111", "P6", response=SponsoredAdListResponse)
    def get(self, request):
        return Response(
            SponsoredAdListResponse(
                {"data": ads_services.list_admin_ads(request.user)}
            ).data
        )

    @contract("API-112", "P6", request=AdminAdInput, response=SponsoredAdResponse)
    def post(self, request):
        return Response(
            SponsoredAdResponse(
                {
                    "data": ads_services.create_admin_ad(
                        request.user,
                        self.validated(AdminAdInput, request.data),
                        actor_ip=request.META.get("REMOTE_ADDR"),
                    )
                }
            ).data,
            status=201,
        )


class AdminAdDetailView(DomainView):
    @contract("API-113", "P6", request=AdminAdPatchInput, response=SponsoredAdResponse)
    def patch(self, request, id):
        return Response(
            SponsoredAdResponse(
                {
                    "data": ads_services.update_admin_ad(
                        request.user,
                        id,
                        self.validated(AdminAdPatchInput, request.data),
                        actor_ip=request.META.get("REMOTE_ADDR"),
                    )
                }
            ).data
        )

    @contract("API-114", "P6", response=DeleteFlagResponse)
    def delete(self, request, id):
        return Response(
            DeleteFlagResponse(
                {
                    "data": ads_services.delete_admin_ad(
                        request.user, id, actor_ip=request.META.get("REMOTE_ADDR")
                    )
                }
            ).data
        )
