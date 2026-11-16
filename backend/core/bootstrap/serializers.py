"""Explicit public request/response contracts for bootstrap operations."""
from rest_framework import serializers


class StrictQuerySerializer(serializers.Serializer):
    def to_internal_value(self, data):
        errors = {key: ['Unknown query parameter.'] for key in data if key not in self.fields}
        for key in data:
            if hasattr(data, 'getlist') and len(data.getlist(key)) != 1:
                errors[key] = ['Repeated query parameter.']
        if errors:
            raise serializers.ValidationError(errors)
        # QueryDict's HTML form semantics otherwise treat optional empty values
        # as omitted. API query values must be validated literally.
        return super().to_internal_value({key: data[key] for key in data})


class LocaleQuerySerializer(StrictQuerySerializer):
    locale = serializers.ChoiceField(choices=['ar', 'en'], required=False)


class CurrencySerializer(serializers.Serializer):
    code = serializers.ChoiceField(choices=['SDG'])
    decimal_places = serializers.IntegerField(min_value=2, max_value=2)


class CitySerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()


class FeaturesSerializer(serializers.Serializer):
    customer_accounts = serializers.BooleanField()
    payments = serializers.BooleanField()
    paid_ads = serializers.BooleanField()


class ConfigDataSerializer(serializers.Serializer):
    api_version = serializers.CharField()
    minimum_app_version = serializers.CharField()
    currency = CurrencySerializer()
    default_locale = serializers.ChoiceField(choices=['ar'])
    supported_locales = serializers.ListField(child=serializers.ChoiceField(choices=['ar', 'en']))
    locale = serializers.ChoiceField(choices=['ar', 'en'])
    direction = serializers.ChoiceField(choices=['rtl', 'ltr'])
    cities = CitySerializer(many=True)
    features = FeaturesSerializer()


class ConfigResponseSerializer(serializers.Serializer):
    data = ConfigDataSerializer()


class BundleDataSerializer(serializers.Serializer):
    locale = serializers.ChoiceField(choices=['ar', 'en'])
    direction = serializers.ChoiceField(choices=['rtl', 'ltr'])
    version = serializers.CharField()
    strings = serializers.DictField(child=serializers.CharField())


class BundleResponseSerializer(serializers.Serializer):
    data = BundleDataSerializer()


class HealthDataSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['ok'])


class HealthResponseSerializer(serializers.Serializer):
    data = HealthDataSerializer()


class ErrorDetailSerializer(serializers.Serializer):
    field = serializers.CharField()
    code = serializers.CharField()
    message = serializers.CharField()


class ErrorDataSerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()
    details = ErrorDetailSerializer(many=True)


class ErrorResponseSerializer(serializers.Serializer):
    error = ErrorDataSerializer()
