from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from core.common.views import DomainView, contract
from core.common.serializers import AcceptedResponse
from . import services
from .serializers import (
    RegisterInput,
    LoginInput,
    VerifyInput,
    RecoverInput,
    SessionResponse,
)


class AuthThrottle(SimpleRateThrottle):
    rate = "10/min"
    scope = "auth"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


@method_decorator(csrf_protect, name="dispatch")
class AuthView(DomainView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]


class RegisterView(AuthView):
    @contract("API-049", "P3", auth=[], request=RegisterInput, response=SessionResponse)
    def post(self, request):
        user = services.register(self.validated(RegisterInput, request.data))
        login(request, user)
        return Response(
            SessionResponse({"data": services.session_data(user)}).data, status=201
        )


class MerchantRegisterView(AuthView):
    @contract("API-051", "P3", auth=[], request=RegisterInput, response=SessionResponse)
    def post(self, request):
        user = services.register(
            self.validated(RegisterInput, request.data), merchant=True
        )
        login(request, user)
        return Response(
            SessionResponse({"data": services.session_data(user)}).data, status=201
        )


class LoginView(AuthView):
    @contract("API-047", "P3", auth=[], request=LoginInput, response=SessionResponse)
    def post(self, request):
        user = services.login_user(self.validated(LoginInput, request.data))
        login(request, user)
        return Response(SessionResponse({"data": services.session_data(user)}).data)


class SessionView(AuthView):
    @method_decorator(ensure_csrf_cookie)
    @contract("API-062", "P3", response=SessionResponse)
    def get(self, request):
        get_token(request)
        return Response(
            SessionResponse({"data": services.session_data(request.user)}).data
        )

    @contract("API-002", "P3", response=AcceptedResponse)
    def delete(self, request):
        logout(request)
        return Response({"data": {"accepted": True}})


class VerifyView(AuthView):
    permission_classes = [IsAuthenticated]

    @contract("API-052", "P3", request=VerifyInput, response=AcceptedResponse)
    def post(self, request):
        services.verify(request.user, self.validated(VerifyInput, request.data))
        return Response({"data": {"accepted": True}})


class RecoverView(AuthView):
    @contract("API-048", "P3", auth=[], request=RecoverInput, response=AcceptedResponse)
    def post(self, request):
        services.recover(self.validated(RecoverInput, request.data))
        return Response({"data": {"accepted": True}})
