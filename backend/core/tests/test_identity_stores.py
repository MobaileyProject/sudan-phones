"""BE-03/04 boundaries: account takeover, role escalation and tenant leakage."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

sent = []


def deliver(phone, code):
    sent.append((phone, code))


@override_settings(OTP_DELIVERY_BACKEND="core.tests.test_identity_stores.deliver")
class IdentityStoreTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        sent.clear()
        self.client = APIClient()
        self.payload = {
            "phone": "+249912345678",
            "password": "Strong-Phone-Pass42",
            "name": "Store owner",
        }

    def register(self):
        response = self.client.post(
            "/api/v1/merchant/auth/register", self.payload, format="json"
        )
        self.assertEqual(response.status_code, 201, response.content)
        return response

    def verify(self):
        self.register()
        response = self.client.post(
            "/api/v1/merchant/auth/verify", {"code": sent[-1][1]}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_registration_verification_logout_and_login(self):
        response = self.register()
        self.assertNotIn("code", str(response.data))
        denied = self.client.put(
            "/api/v1/stores/me/profile",
            {
                "name": "Shop",
                "city": "khartoum",
                "address": "Market",
                "phone": self.payload["phone"],
                "whatsapp": self.payload["phone"],
            },
            format="json",
        )
        self.assertEqual(denied.status_code, 403)
        code = sent[-1][1]
        self.assertEqual(
            self.client.post(
                "/api/v1/merchant/auth/verify", {"code": code}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/merchant/auth/verify", {"code": code}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(self.client.delete("/api/v1/auth/session").status_code, 200)
        self.assertIn(self.client.get("/api/v1/stores/me").status_code, [401, 403])
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/login", self.payload, format="json"
            ).status_code,
            200,
        )

    def test_store_profile_staff_and_private_fields(self):
        self.verify()
        body = {
            "name": "Nile Phones",
            "city": "khartoum",
            "address": "Market 1",
            "phone": self.payload["phone"],
            "whatsapp": self.payload["phone"],
        }
        response = self.client.put("/api/v1/stores/me/profile", body, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["data"]["name"], "Nile Phones")
        staff = get_user_model().objects.create_user("staff", password="Staff-Pass42")
        response = self.client.post(
            "/api/v1/stores/me/staff", {"user_id": staff.pk}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.content)
        other = APIClient()
        other.force_authenticate(staff)
        self.assertEqual(other.get("/api/v1/stores/me").status_code, 200)
        self.assertEqual(
            other.put("/api/v1/stores/me/profile", body, format="json").status_code, 403
        )
        self.assertEqual(
            self.client.delete(
                f"/api/v1/stores/me/staff/{response.data['data']['id']}"
            ).status_code,
            200,
        )
        self.assertEqual(other.get("/api/v1/stores/me").status_code, 403)

    def test_registration_rejects_privilege_and_unknown_fields(self):
        response = self.client.post(
            "/api/v1/merchant/auth/register",
            {**self.payload, "role": "admin"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            get_user_model().objects.filter(username=self.payload["phone"]).exists()
        )

    def test_recovery_is_generic_and_otp_single_use(self):
        self.verify()
        self.client.delete("/api/v1/auth/session")
        response = self.client.post(
            "/api/v1/auth/recover", {"phone": self.payload["phone"]}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.content)
        code = sent[-1][1]
        replacement = {
            "phone": self.payload["phone"],
            "code": code,
            "password": "Replacement-Pass42",
        }
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/recover", replacement, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/recover", replacement, format="json"
            ).status_code,
            400,
        )
        replacement["phone"] = "+249999999999"
        response = self.client.post(
            "/api/v1/auth/recover", {"phone": replacement["phone"]}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"data": {"accepted": True}})

    def test_csrf_required_for_login(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.post("/api/v1/auth/login", self.payload, format="json")
        self.assertEqual(response.status_code, 403)
        bootstrap = client.get("/api/v1/auth/session")
        self.assertEqual(bootstrap.status_code, 200)
        self.assertIn("csrftoken", bootstrap.cookies)

    def test_session_reports_roles_without_exposing_private_contact_data(self):
        self.verify()
        response = self.client.get("/api/v1/auth/session")
        self.assertEqual(response.data["data"]["role"], "merchant")
        self.assertEqual(response.data["data"]["permissions"], [])
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertNotIn("email", response.data["data"])
