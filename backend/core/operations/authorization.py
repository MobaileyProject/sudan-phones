from core.common.domain import require, require_actor


def require_admin(actor, permission, lock=False):
    require_actor(actor)
    if actor.is_superuser:
        return
    # A Django staff flag alone grants no business permission.
    from .models import RoleAssignment, AdminRole

    assignment = RoleAssignment.objects.filter(user=actor).first()
    require(assignment is not None, "FORBIDDEN", 403)
    if lock:
        role = (
            AdminRole.objects.select_for_update().filter(pk=assignment.role_id).first()
        )
        assignment = (
            RoleAssignment.objects.select_for_update()
            .filter(user=actor, role_id=assignment.role_id)
            .first()
        )
    else:
        role = AdminRole.objects.filter(pk=assignment.role_id).first()
    require(assignment and role and permission in role.permissions, "FORBIDDEN", 403)
