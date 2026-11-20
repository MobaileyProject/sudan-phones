from django.urls import path
from core.identity import views as auth
from core.stores import views as stores

urlpatterns = [
    path("auth/register", auth.RegisterView.as_view()),
    path("merchant/auth/register", auth.MerchantRegisterView.as_view()),
    path("merchant/auth/verify", auth.VerifyView.as_view()),
    path("auth/login", auth.LoginView.as_view()),
    path("auth/recover", auth.RecoverView.as_view()),
    path("auth/session", auth.SessionView.as_view()),
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
    path("categories", catalog.CategoriesView.as_view()),
    path("catalog/brands", catalog.MerchantBrandsView.as_view()),
    path("catalog/models", catalog.ModelsView.as_view()),
    path("catalog/variants", catalog.VariantsView.as_view()),
    path("stores/me/listings", listings.ListingsView.as_view()),
    path("stores/me/listings/<int:id>/status", listings.StatusView.as_view()),
    path("stores/me/listings/<int:id>", listings.EditView.as_view()),
    path("stores/me/listings/<int:id>/price", listings.PriceView.as_view()),
    path("stores/me/listings/<int:id>/stock", listings.StockView.as_view()),
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
    path("admin/overview", operations.OverviewView.as_view()),
    path("admin/roles", operations.RolesView.as_view()),
    path("admin/roles/<int:id>", operations.RoleDeleteView.as_view()),
    path("admin/audit-events", operations.AuditView.as_view()),
    path("admin/dual-approvals", operations.ApprovalListView.as_view()),
    path(
        "admin/dual-approvals/<int:id>/decision",
        operations.ApprovalDecisionView.as_view(),
    ),
]
