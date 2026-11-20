"""OTP channel separation and durable processing of queued media."""

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from unittest.mock import patch
from .test_identity_stores import sent


@override_settings(OTP_DELIVERY_BACKEND="core.tests.test_identity_stores.deliver")
class DeliveryTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        sent.clear()
        self.client = APIClient()

    def test_email_otp_does_not_verify_whatsapp_and_attempt_limit_persists(self):
        response = self.client.post(
            "/api/v1/merchant/auth/register",
            {
                "name": "Owner",
                "phone": "+249912345678",
                "email": "owner@example.com",
                "channel": "email",
                "password": "Strong-Phone-Pass42",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        valid_code = sent[-1][1]
        wrong_code = "000000" if valid_code != "000000" else "111111"
        for _ in range(5):
            response = self.client.post(
                "/api/v1/merchant/auth/verify",
                {"channel": "email", "code": wrong_code},
                format="json",
            )
            self.assertEqual(response.status_code, 400)
        self.assertEqual(
            self.client.post(
                "/api/v1/merchant/auth/verify",
                {"channel": "email", "code": valid_code},
                format="json",
            ).status_code,
            400,
        )
        from core.models import OTPChallenge

        self.assertEqual(OTPChallenge.objects.get().attempts, 5)
        account = get_user_model().objects.get().account
        self.assertFalse(account.phone_verified)
        self.assertFalse(account.email_verified)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="noreply@example.com",
    )
    def test_email_provider_delivers_code_only_to_destination(self):
        from core.identity.delivery import deliver_otp

        deliver_otp("owner@example.com", "123456")
        self.assertEqual(mail.outbox[0].to, ["owner@example.com"])
        self.assertIn("123456", mail.outbox[0].body)

    def test_unconfigured_whatsapp_fails_without_creating_an_account(self):
        with override_settings(
            OTP_DELIVERY_BACKEND="core.identity.delivery.deliver_otp",
            WHATSAPP_ACCESS_TOKEN="",
        ):
            response = self.client.post(
                "/api/v1/merchant/auth/register",
                {
                    "name": "Owner",
                    "phone": "+249912345678",
                    "password": "Strong-Phone-Pass42",
                },
                format="json",
            )
        self.assertEqual(response.status_code, 503, response.content)
        self.assertFalse(get_user_model().objects.exists())

    def test_authenticated_login_attempts_are_throttled_too(self):
        from core.identity.views import AuthThrottle

        actor = get_user_model().objects.create_user("authenticated")
        self.client.force_authenticate(actor)
        with patch.object(AuthThrottle, "rate", "1/min"):
            first = self.client.post(
                "/api/v1/auth/login",
                {"phone": "+249912345678", "password": "wrong"},
                format="json",
            )
            second = self.client.post(
                "/api/v1/auth/login",
                {"phone": "+249912345678", "password": "wrong"},
                format="json",
            )
        self.assertEqual(first.status_code, 401)
        self.assertEqual(second.status_code, 429)
