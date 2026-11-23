from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.common.views import DomainView, contract
from .serializers import (
    CatalogQuery,
    PublicModelQuery,
    BrandResponse,
    ModelResponse,
    PublicModelResponse,
    VariantResponse,
    CategoryResponse,
)
from .services import choices, public_models


class BrandsView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @contract(
        "API-014", "P4", response=BrandResponse, parameters=[CatalogQuery], auth=[]
    )
    def get(self, request):
        return Response(
            BrandResponse(
                {
                    "data": choices(
                        request.user,
                        "brands",
                        self.validated(CatalogQuery, request.query_params),
                        public=True,
                    )
                }
            ).data
        )


class PublicModelsView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @contract(
        "API-071", "P4", response=PublicModelResponse, parameters=[PublicModelQuery], auth=[]
    )
    def get(self, request):
        return Response(
            PublicModelResponse(
                {
                    "data": public_models(
                        self.validated(PublicModelQuery, request.query_params)
                    )
                }
            ).data
        )


class CategoriesView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @contract("API-018", "P4", response=CategoryResponse, auth=[])
    def get(self, request):
        return Response(
            CategoryResponse(
                {"data": choices(request.user, "categories", {}, public=True)}
            ).data
        )


class MerchantBrandsView(DomainView):
    @contract("API-015", "P4", response=BrandResponse, parameters=[CatalogQuery])
    def get(self, request):
        return Response(
            BrandResponse(
                {
                    "data": choices(
                        request.user,
                        "brands",
                        self.validated(CatalogQuery, request.query_params),
                    )
                }
            ).data
        )


class ModelsView(DomainView):
    @contract("API-016", "P4", response=ModelResponse, parameters=[CatalogQuery])
    def get(self, request):
        return Response(
            ModelResponse(
                {
                    "data": choices(
                        request.user,
                        "models",
                        self.validated(CatalogQuery, request.query_params),
                    )
                }
            ).data
        )


class VariantsView(DomainView):
    @contract("API-017", "P4", response=VariantResponse, parameters=[CatalogQuery])
    def get(self, request):
        return Response(
            VariantResponse(
                {
                    "data": choices(
                        request.user,
                        "variants",
                        self.validated(CatalogQuery, request.query_params),
                    )
                }
            ).data
        )
