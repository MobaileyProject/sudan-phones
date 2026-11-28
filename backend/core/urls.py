from django.urls import path
from core.identity import views as auth
from core.stores import views as stores

urlpatterns = [
    path("auth/register", auth.RegisterView.as_view()),
    path("merchant/auth/register", auth.MerchantRegisterView.as_view()),
    path("merchant/auth/verify", auth.VerifyView.as_view()),
    path("auth/login", auth.LoginView.as_view()),
    path("auth/google", auth.GoogleLoginView.as_view()),
    path("auth/recover", auth.RecoverView.as_view()),
    path("auth/session", auth.SessionView.as_view()),
    path("me", auth.MeView.as_view()),
    path("stores/me", stores.StoreView.as_view()),
    path("stores/me/profile", stores.ProfileView.as_view()),
    path("stores/me/staff", stores.StaffView.as_view()),
    path("stores/me/staff/<int:id>", stores.StaffDetailView.as_view()),
]

from core.media import views as media
from core.verification import views as verification

urlpatterns += [
    path("media/uploads", media.UploadView.as_view()),
    path("media/uploads/<uuid:id>/complete", media.CompleteView.as_view()),
    path("stores/me/verification/documents", media.DocumentUploadView.as_view()),
    path("stores/me/verification/submit", verification.SubmitView.as_view()),
    path("stores/me/reverification", verification.ReverificationView.as_view()),
    path("stores/me/verification", verification.VerificationView.as_view()),
    path("admin/verifications", verification.QueueView.as_view()),
    path("admin/verifications/<int:id>", verification.DetailView.as_view()),
    path(
        "admin/verifications/<int:id>/documents", verification.DocumentsView.as_view()
    ),
    path("admin/verifications/<int:id>/decision", verification.DecisionView.as_view()),
]

from core.catalog import views as catalog
from core.listings import views as listings

urlpatterns += [
    path("brands", catalog.BrandsView.as_view()),
    path("models", catalog.PublicModelsView.as_view()),
    path("categories", catalog.CategoriesView.as_view()),
    path("catalog/brands", catalog.MerchantBrandsView.as_view()),
    path("catalog/models", catalog.ModelsView.as_view()),
    path("catalog/variants", catalog.VariantsView.as_view()),
    path("stores/me/listings", listings.ListingsView.as_view()),
    path("stores/me/listings/bulk-price", listings.BulkPriceView.as_view()),
    path("stores/me/listings/import", listings.BulkImportView.as_view()),
    path("stores/me/listings/<int:id>/status", listings.StatusView.as_view()),
    path("stores/me/listings/<int:id>/duplicate", listings.DuplicateView.as_view()),
    path("stores/me/listings/<int:id>", listings.EditView.as_view()),
    path("stores/me/listings/<int:id>/price", listings.PriceView.as_view()),
    path("stores/me/listings/<int:id>/stock", listings.StockView.as_view()),
    path("admin/catalog/brands", catalog.AdminBrandsView.as_view()),
    path("admin/catalog/models", catalog.AdminModelsView.as_view()),
    path("admin/catalog/models/<int:id>", catalog.AdminModelDetailView.as_view()),
    path("admin/moderation/queue", listings.ModerationQueueView.as_view()),
    path("admin/listings/<int:id>/moderate", listings.ModerateView.as_view()),
]

from core.discovery import views as discovery

urlpatterns += [
    path("home", discovery.HomeView.as_view()),
    path("listings", discovery.SearchView.as_view()),
    path("listings/<int:id>", discovery.DetailView.as_view()),
    path("listings/<int:id>/related", discovery.RelatedView.as_view()),
    path("product-variants/<int:id>/listings", discovery.OffersView.as_view()),
    path("stores/featured", discovery.FeaturedView.as_view()),
    path("stores/<int:id>", discovery.StoreView.as_view()),
    path("stores/<int:id>/listings", discovery.StoreListingsView.as_view()),
]

from core.operations import views as operations

urlpatterns += [
    path("stores/me/dashboard", operations.DashboardView.as_view()),
    path("listings/<int:id>/contact-methods", operations.ContactMethodsView.as_view()),
    path("listings/<int:id>/contact-events", operations.ContactEventView.as_view()),
    path("stores/<int:id>/ratings", operations.StoreRatingsView.as_view()),
    path("ratings/products", operations.AllProductRatingsView.as_view()),
    path("listings/<int:id>/ratings", operations.ListingRatingsView.as_view()),
    path("models/<int:id>/ratings", operations.ModelRatingsView.as_view()),
    path("reports", operations.ReportCreateView.as_view()),
    path("me/favorites", operations.FavoritesView.as_view()),
    path("me/favorites/<int:listing_id>", operations.FavoriteDetailView.as_view()),
    path("me/alerts", operations.PriceAlertsView.as_view()),
    path("me/alerts/<int:id>", operations.PriceAlertDetailView.as_view()),
    path("me/notifications", operations.NotificationsView.as_view()),
    path("me/notifications/read", operations.NotificationsReadView.as_view()),
    path("me/chats", operations.BuyerChatsView.as_view()),
    path("stores/me/chats", operations.MerchantChatsView.as_view()),
    path(
        "stores/me/chats/<str:thread_key>/reply",
        operations.MerchantChatReplyView.as_view(),
    ),
    path(
        "stores/me/chats/<str:thread_key>/read",
        operations.MerchantChatReadView.as_view(),
    ),
    path("stores/<int:id>/messages", operations.StoreMessagesView.as_view()),
    path("ads/active", operations.ActiveAdsView.as_view()),
    path("ads/<int:id>/impression", operations.AdImpressionView.as_view()),
    path("ads/<int:id>/click", operations.AdClickView.as_view()),
    path("stores/me/ads", operations.MerchantAdsView.as_view()),
    path("stores/me/ads/request", operations.MerchantAdRequestView.as_view()),
    path("admin/ads", operations.AdminAdsView.as_view()),
    path("admin/ads/<int:id>", operations.AdminAdDetailView.as_view()),
    path("admin/overview", operations.OverviewView.as_view()),
    path("admin/roles", operations.RolesView.as_view()),
    path("admin/roles/<int:id>", operations.RoleDeleteView.as_view()),
    path("admin/users", operations.AdminUsersView.as_view()),
    path("admin/reports", operations.AdminReportsView.as_view()),
    path("admin/reports/<int:id>/resolve", operations.AdminReportResolveView.as_view()),
    path("admin/stores/<int:id>/suspend", operations.AdminStoreSuspendView.as_view()),
    path("admin/audit-events", operations.AuditView.as_view()),
    path("admin/dual-approvals", operations.ApprovalListView.as_view()),
    path(
        "admin/dual-approvals/<int:id>/decision",
        operations.ApprovalDecisionView.as_view(),
    ),
]
