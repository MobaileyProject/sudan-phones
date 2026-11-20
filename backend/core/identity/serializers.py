from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
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
    phone = PhoneField()
    password = serializers.CharField(
        write_only=True, trim_whitespace=False, max_length=128
    )
    name = serializers.CharField(required=False, max_length=150)


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
