from rest_framework import serializers
from core.common.serializers import StrictSerializer, PageQuery

from .policy import PERMISSIONS


class RoleInput(StrictSerializer):
    id = serializers.IntegerField(min_value=1, required=False)
    version = serializers.IntegerField(min_value=1, required=False)
    name = serializers.CharField(max_length=80)
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=PERMISSIONS), max_length=4
    )
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), max_length=100, required=False
    )

    def validate(self, attrs):
        if "id" in attrs and "version" not in attrs:
            raise serializers.ValidationError("Version required for updates.")
        return attrs


class RoleData(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    permissions = serializers.ListField(child=serializers.CharField())
    version = serializers.IntegerField()
    user_ids = serializers.ListField(child=serializers.IntegerField())


class RoleResponse(serializers.Serializer):
    data = RoleData()


class RoleListResponse(serializers.Serializer):
    data = RoleData(many=True)
    available_permissions = serializers.ListField(child=serializers.CharField())


class ApprovalDecision(StrictSerializer):
    decision = serializers.ChoiceField(choices=["approve", "reject"])
    version = serializers.IntegerField(min_value=1)


class ApprovalData(serializers.Serializer):
    id = serializers.IntegerField()
    requested_by_id = serializers.IntegerField()
    decided_by_id = serializers.IntegerField(allow_null=True)
    operation = serializers.CharField()
    target_id = serializers.IntegerField()
    target_version = serializers.IntegerField()
    reason = serializers.CharField()
    status = serializers.CharField()
    version = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    decided_at = serializers.DateTimeField(allow_null=True)


class ApprovalResponse(serializers.Serializer):
    data = ApprovalData()


class ApprovalListResponse(serializers.Serializer):
    data = ApprovalData(many=True)


class AuditQuery(PageQuery):
    action = serializers.CharField(max_length=80, required=False)
    actor_id = serializers.IntegerField(min_value=1, required=False)
    resource = serializers.CharField(max_length=100, required=False)


class AuditData(serializers.Serializer):
    actor_ip = serializers.IPAddressField(allow_null=True)
    id = serializers.IntegerField()
    actor_id = serializers.IntegerField()
    action = serializers.CharField()
    resource = serializers.CharField()
    metadata = serializers.JSONField()
    created_at = serializers.DateTimeField()


class AuditResponse(serializers.Serializer):
    data = AuditData(many=True)


class DashboardData(serializers.Serializer):
    active_listings = serializers.IntegerField()
    out_of_stock = serializers.IntegerField()
    views = serializers.IntegerField()
    contact_leads = serializers.IntegerField()


class DashboardResponse(serializers.Serializer):
    data = DashboardData()


class OverviewData(DashboardData):
    stores = serializers.IntegerField()
    verified_stores = serializers.IntegerField()
    pending_verifications = serializers.IntegerField()
    daily_searches = serializers.IntegerField()


class OverviewResponse(serializers.Serializer):
    data = OverviewData()


class ContactData(serializers.Serializer):
    phone_url = serializers.CharField()
    whatsapp_url = serializers.URLField()


class ContactResponse(serializers.Serializer):
    data = ContactData()


class ContactInput(StrictSerializer):
    event_id = serializers.UUIDField()
    method = serializers.ChoiceField(choices=["whatsapp", "phone"])
