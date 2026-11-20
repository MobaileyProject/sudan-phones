from .models import AuditEvent


def record(actor, action, resource, actor_ip=None, **metadata):
    return AuditEvent.objects.create(
        actor=actor,
        action=action,
        resource=str(resource),
        metadata=metadata,
        actor_ip=actor_ip,
    )
