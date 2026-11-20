from rest_framework import serializers
from core.common.serializers import StrictSerializer


class UploadInput(StrictSerializer):
    content_type = serializers.ChoiceField(
        choices=["image/jpeg", "image/png", "image/webp"]
    )
    size = serializers.IntegerField(min_value=1, max_value=10 * 1024 * 1024)
    sha256 = serializers.RegexField(r"^[a-f0-9]{64}$")
    kind = serializers.ChoiceField(
        choices=["front", "back", "screen", "seal", "catalog"]
    )


class DocumentInput(UploadInput):
    kind = serializers.ChoiceField(
        choices=["id_front", "id_back", "commercial", "signboard"]
    )


class UploadData(serializers.Serializer):
    id = serializers.UUIDField()
    url = serializers.URLField()
    headers = serializers.DictField(child=serializers.CharField())
    expires_in = serializers.IntegerField()


class UploadResponse(serializers.Serializer):
    data = UploadData()
