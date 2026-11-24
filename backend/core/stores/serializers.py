from rest_framework import serializers
from core.bootstrap.services import CITY_IDS
from core.common.serializers import StrictSerializer
from core.identity.serializers import PhoneField


class ProfileInput(StrictSerializer):
    name = serializers.CharField(max_length=160)
    city = serializers.ChoiceField(choices=CITY_IDS)
    address = serializers.CharField(max_length=300)
    phone = PhoneField()
    whatsapp = PhoneField()
    location_guidance = serializers.CharField(
        max_length=300, allow_blank=True, required=False
    )
    description = serializers.CharField(
        max_length=2000, allow_blank=True, required=False
    )
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, allow_null=True, required=False
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, allow_null=True, required=False
    )
    accepts_trade_in = serializers.BooleanField(required=False)


class SettingsInput(StrictSerializer):
    opening_hours = serializers.CharField(
        max_length=300, allow_blank=True, required=False
    )
    address = serializers.CharField(max_length=300, allow_blank=True, required=False)
    location_guidance = serializers.CharField(
        max_length=300, allow_blank=True, required=False
    )
    description = serializers.CharField(
        max_length=2000, allow_blank=True, required=False
    )
    phone = PhoneField(required=False)
    whatsapp = PhoneField(required=False)
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, allow_null=True, required=False
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, allow_null=True, required=False
    )
    contact_available = serializers.BooleanField(required=False)
    accepts_trade_in = serializers.BooleanField(required=False)


class StaffInput(StrictSerializer):
    user_id = serializers.IntegerField(min_value=1, required=False)
    phone = PhoneField(required=False)
    role = serializers.ChoiceField(
        choices=["staff", "manager", "clerk"], default="staff"
    )

    def validate(self, attrs):
        if bool(attrs.get("user_id")) == bool(attrs.get("phone")):
            raise serializers.ValidationError("Provide either user_id or phone.")
        return attrs


class StaffData(serializers.Serializer):
    id = serializers.IntegerField()
    user_id = serializers.IntegerField()
    name = serializers.CharField()
    phone = serializers.CharField()
    role = serializers.CharField()
    created_at = serializers.DateTimeField(allow_null=True)


class StaffListResponse(serializers.Serializer):
    data = StaffData(many=True)


class StoreData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    city = serializers.CharField()
    address = serializers.CharField()
    location_guidance = serializers.CharField()
    description = serializers.CharField()
    banner_url = serializers.CharField()
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, allow_null=True
    )
    phone = serializers.CharField()
    whatsapp = serializers.CharField()
    opening_hours = serializers.CharField()
    contact_available = serializers.BooleanField()
    accepts_trade_in = serializers.BooleanField(default=False)
    status = serializers.CharField()
    feedback = serializers.CharField()
    version = serializers.IntegerField()


class StoreResponse(serializers.Serializer):
    data = StoreData()
