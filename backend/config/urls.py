"""URL configuration for Sudan Phones backend."""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from core.bootstrap.views import BundleView, ConfigView, HealthView
from core.media.local_views import local_private_download, local_public_media, local_upload

urlpatterns = [
    path('api/v1/config', ConfigView.as_view(), name='public-config'),
    path('api/v1/i18n/bundle', BundleView.as_view(), name='localization-bundle'),
    path('api/v1/health', HealthView.as_view(), name='liveness'),
    path('api/v1/', include('core.urls')),
    path('media-transfer/upload/<str:token>', local_upload, name='local-media-upload'),
    path('media-transfer/private/<str:token>', local_private_download, name='local-media-private'),
    path('media-transfer/public/<path:key>', local_public_media, name='local-media-public'),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

handler404 = 'core.views.api_404'
handler500 = 'core.views.api_500'
