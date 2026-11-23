from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from core.bootstrap.services import CITY_IDS, SUPPORTED_LOCALES
from core.common.serializers import StrictSerializer


class PhoneField(serializers.RegexField):
    def __init__(self, **kwargs):
        super().__init__(r"^\+249[1-9][0-9]{8}$", **kwargs)


class PasswordField(serializers.CharField):
    def __init__(self, **kwargs):
        super().__init__(
            write_only=True, trim_whitespace=False, max_length=128, **kwargs
        )

    def run_validation(self, data=serializers.empty):
        value = super().run_validation(data)
        try:
            validate_password(value)
        except ValidationError:
            raise serializers.ValidationError("Invalid password.")
        return value


class RegisterInput(StrictSerializer):
    phone = PhoneField()
    password = PasswordField()
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False)
    channel = serializers.ChoiceField(choices=["whatsapp", "email"], default="whatsapp")

    def validate(self, attrs):
        if attrs["channel"] == "email" and not attrs.get("email"):
            raise serializers.ValidationError("Email required.")
        return attrs


class LoginInput(StrictSerializer):
    phone = PhoneField(required=False)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(
        write_only=True, trim_whitespace=False, max_length=128
    )
    name = serializers.CharField(required=False, max_length=150)

    def validate(self, attrs):
        has_phone = bool(attrs.get("phone"))
        has_email = bool(attrs.get("email"))
        if has_phone == has_email:
            raise serializers.ValidationError(
                "Provide either phone or email with password."
            )
        return attrs


class GoogleLoginInput(StrictSerializer):
    id_token = serializers.CharField(min_length=10, max_length=4096)


class MeUpdateInput(StrictSerializer):
    name = serializers.CharField(max_length=150, required=False)
    preferred_city = serializers.ChoiceField(
        choices=[""] + CITY_IDS, required=False, allow_blank=True
    )
    preferred_locale = serializers.ChoiceField(
        choices=list(SUPPORTED_LOCALES), required=False
    )


class MeData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    phone = serializers.CharField()
    email = serializers.CharField()
    phone_verified = serializers.BooleanField()
    email_verified = serializers.BooleanField()
    preferred_city = serializers.CharField()
    preferred_locale = serializers.CharField()
    role = serializers.ChoiceField(choices=["guest", "buyer", "merchant", "admin"])
    merchant = serializers.BooleanField()


class MeResponse(serializers.Serializer):
    data = MeData()


class VerifyInput(StrictSerializer):
    code = serializers.RegexField(r"^[0-9]{6}$", required=False)
    channel = serializers.ChoiceField(choices=["whatsapp", "email"], default="whatsapp")


class RecoverInput(StrictSerializer):
    phone = PhoneField()
    channel = serializers.ChoiceField(choices=["whatsapp", "email"], default="whatsapp")
    code = serializers.RegexField(r"^[0-9]{6}$", required=False)
    password = PasswordField(required=False)

    def validate(self, attrs):
        if ("code" in attrs) != ("password" in attrs):
            raise serializers.ValidationError(
                "Code and replacement password required together."
            )
        return attrs


class SessionData(serializers.Serializer):
    authenticated = serializers.BooleanField()
    role = serializers.ChoiceField(choices=["guest", "buyer", "merchant", "admin"])
    permissions = serializers.ListField(child=serializers.CharField())
    user_id = serializers.IntegerField(allow_null=True)
    merchant = serializers.BooleanField()
    phone_verified = serializers.BooleanField()
    email_verified = serializers.BooleanField()


class SessionResponse(serializers.Serializer):
    data = SessionData()
