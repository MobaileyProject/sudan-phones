from core.common.domain import require, require_actor


def require_admin(actor, permission):
    require_actor(actor)
    if actor.is_superuser:
        return
    # A Django staff flag alone grants no business permission.
    from .models import RoleAssignment

    assignment = (
        RoleAssignment.objects.select_related("role").filter(user=actor).first()
    )
    require(assignment and permission in assignment.role.permissions, "FORBIDDEN", 403)
