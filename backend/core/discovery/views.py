from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.common.views import DomainView, contract
from core.common.serializers import PageQuery
from .serializers import (
    SearchQuery,
    SearchResponse,
    DetailResponse,
    StoreDetailResponse,
    FeaturedResponse,
    HomeResponse,
)
from . import services


class PublicView(DomainView):
    authentication_classes = []
    permission_classes = [AllowAny]


class HomeView(PublicView):
    @contract("API-020", "P5", response=HomeResponse, auth=[])
    def get(self, request):
        return Response(HomeResponse({"data": services.home()}).data)


class SearchView(PublicView):
    @contract(
        "API-022", "P5", response=SearchResponse, parameters=[SearchQuery], auth=[]
    )
    def get(self, request):
        return Response(
            SearchResponse(
                services.search(
                    self.validated(SearchQuery, request.query_params),
                    count_search=request.method == "GET",
                )
            ).data
        )


class DetailView(PublicView):
    @contract("API-023", "P5", response=DetailResponse, auth=[])
    def get(self, request, id):
        return Response(
            DetailResponse(
                {"data": services.detail(id, count_view=request.method == "GET")}
            ).data
        )


class RelatedView(PublicView):
    @contract(
        "API-025", "P5", response=SearchResponse, parameters=[SearchQuery], auth=[]
    )
    def get(self, request, id):
        return Response(
            SearchResponse(
                services.search(
                    self.validated(SearchQuery, request.query_params), related_id=id
                )
            ).data
        )


class OffersView(PublicView):
    @contract(
        "API-027", "P5", response=SearchResponse, parameters=[SearchQuery], auth=[]
    )
    def get(self, request, id):
        return Response(
            SearchResponse(
                services.search(
                    self.validated(SearchQuery, request.query_params), variant_id=id
                )
            ).data
        )


class FeaturedView(PublicView):
    @contract(
        "API-029", "P5", response=FeaturedResponse, parameters=[PageQuery], auth=[]
    )
    def get(self, request):
        return Response(
            FeaturedResponse(
                {
                    "data": services.featured(
                        self.validated(PageQuery, request.query_params)
                    )
                }
            ).data
        )


class StoreView(PublicView):
    @contract("API-036", "P5", response=StoreDetailResponse, auth=[])
    def get(self, request, id):
        return Response(StoreDetailResponse({"data": services.public_store(id)}).data)


class StoreListingsView(PublicView):
    @contract(
        "API-037", "P5", response=SearchResponse, parameters=[SearchQuery], auth=[]
    )
    def get(self, request, id):
        return Response(
            SearchResponse(
                services.search(
                    self.validated(SearchQuery, request.query_params), store_id=id
                )
            ).data
        )
