from rest_framework import serializers
from core.bootstrap.services import CITY_IDS
from core.common.serializers import StrictSerializer


class SubmitInput(StrictSerializer):
    documents = serializers.ListField(
        child=serializers.UUIDField(), min_length=2, max_length=4
    )


class ReverificationInput(StrictSerializer):
    note = serializers.CharField(max_length=1000)
    name = serializers.CharField(max_length=160, required=False)
    city = serializers.ChoiceField(choices=CITY_IDS, required=False)
    documents = serializers.ListField(
        child=serializers.UUIDField(), max_length=4, required=False, default=list
    )

    def validate_note(self, value):
        if not value.strip():
            raise serializers.ValidationError("Note required.")
        return value.strip()


class DecisionInput(StrictSerializer):
    decision = serializers.ChoiceField(
        choices=["verified", "approved", "changes_requested", "rejected"]
    )
    reason = serializers.CharField(max_length=1000, allow_blank=True)
    version = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        if attrs["decision"] == "approved":
            attrs["decision"] = "verified"
        if attrs["decision"] != "verified" and not attrs["reason"].strip():
            raise serializers.ValidationError("Reason required.")
        return attrs


class VerificationProfile(serializers.Serializer):
    name = serializers.CharField()
    city = serializers.CharField()
    address = serializers.CharField()
    phone = serializers.CharField()
    whatsapp = serializers.CharField()


class VerificationData(serializers.Serializer):
    profile = VerificationProfile()
    id = serializers.IntegerField()
    store_id = serializers.IntegerField()
    request_type = serializers.CharField()
    note = serializers.CharField()
    status = serializers.CharField()
    feedback = serializers.CharField()
    version = serializers.IntegerField()
    submitted_at = serializers.DateTimeField()
    decided_at = serializers.DateTimeField(allow_null=True)


class VerificationResponse(serializers.Serializer):
    data = VerificationData(allow_null=True)


class VerificationListResponse(serializers.Serializer):
    data = VerificationData(many=True)


class DocumentData(serializers.Serializer):
    id = serializers.UUIDField()
    kind = serializers.CharField()
    url = serializers.URLField()
    expires_in = serializers.IntegerField()


class DocumentResponse(serializers.Serializer):
    data = DocumentData(many=True)
