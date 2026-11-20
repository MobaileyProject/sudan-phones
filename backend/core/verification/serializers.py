from rest_framework import serializers
from core.common.serializers import StrictSerializer


class SubmitInput(StrictSerializer):
    documents = serializers.ListField(
        child=serializers.UUIDField(), min_length=3, max_length=4
    )


class DecisionInput(StrictSerializer):
    decision = serializers.ChoiceField(
        choices=["verified", "changes_requested", "rejected"]
    )
    reason = serializers.CharField(max_length=1000, allow_blank=True)
    version = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
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
