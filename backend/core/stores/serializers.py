from rest_framework import serializers
from core.common.serializers import StrictSerializer
from core.identity.serializers import PhoneField


class ProfileInput(StrictSerializer):
    name = serializers.CharField(max_length=160)
    city = serializers.ChoiceField(choices=["port_sudan", "khartoum", "omdurman"])
    address = serializers.CharField(max_length=300)
    phone = PhoneField()
    whatsapp = PhoneField()


class SettingsInput(StrictSerializer):
    opening_hours = serializers.CharField(max_length=300, allow_blank=True)


class StaffInput(StrictSerializer):
    user_id = serializers.IntegerField(min_value=1)


class StoreData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    city = serializers.CharField()
    address = serializers.CharField()
    phone = serializers.CharField()
    whatsapp = serializers.CharField()
    opening_hours = serializers.CharField()
    status = serializers.CharField()
    feedback = serializers.CharField()
    version = serializers.IntegerField()


class StoreResponse(serializers.Serializer):
    data = StoreData()
