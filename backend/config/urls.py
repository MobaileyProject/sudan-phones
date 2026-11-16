"""URL configuration for Sudan Phones backend."""
from django.contrib import admin
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from core.bootstrap.views import BundleView, ConfigView, HealthView

urlpatterns = [
    path('api/v1/config', ConfigView.as_view(), name='public-config'),
    path('api/v1/i18n/bundle', BundleView.as_view(), name='localization-bundle'),
    path('api/v1/health', HealthView.as_view(), name='liveness'),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
