from rest_framework import serializers


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if not hasattr(data, "keys") or set(data.keys()) - set(self.fields):
            raise serializers.ValidationError({"non_field_errors": ["Unknown fields."]})
        return super().to_internal_value(data)


class PageQuery(StrictSerializer):
    limit = serializers.IntegerField(min_value=1, max_value=100, default=20)
    offset = serializers.IntegerField(min_value=0, max_value=10000, default=0)


class AcceptedSerializer(serializers.Serializer):
    accepted = serializers.BooleanField()


class AcceptedResponse(serializers.Serializer):
    data = AcceptedSerializer()


class IDSerializer(serializers.Serializer):
    id = serializers.IntegerField()


class IDResponse(serializers.Serializer):
    data = IDSerializer()
