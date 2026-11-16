"""Core serializers and envelope contracts."""
from rest_framework import serializers


class BaseResponseSerializer(serializers.Serializer):
    """Base response serializer structure for consistent API output."""
    pass
