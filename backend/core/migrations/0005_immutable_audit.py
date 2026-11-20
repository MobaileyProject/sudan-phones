"""Append-only audit enforced even for QuerySet/raw SQL mutation paths."""

from django.db import migrations


def install(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("""
            CREATE FUNCTION core_guard_audit() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN RAISE EXCEPTION 'audit events are immutable'; END; $$;
            CREATE TRIGGER core_audit_immutable BEFORE UPDATE OR DELETE ON core_auditevent
            FOR EACH ROW EXECUTE FUNCTION core_guard_audit();
        """)
    elif schema_editor.connection.vendor == "sqlite":
        for operation in ["UPDATE", "DELETE"]:
            schema_editor.execute(
                f"CREATE TRIGGER core_audit_no_{operation.lower()} BEFORE {operation} ON core_auditevent BEGIN SELECT RAISE(ABORT, 'audit events are immutable'); END;"
            )


def uninstall(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute(
            "DROP TRIGGER core_audit_immutable ON core_auditevent; DROP FUNCTION core_guard_audit();"
        )
    elif schema_editor.connection.vendor == "sqlite":
        for operation in ["update", "delete"]:
            schema_editor.execute(f"DROP TRIGGER core_audit_no_{operation};")


class Migration(migrations.Migration):
    dependencies = [("core", "0004_dailymetrics_contactevent_dualapproval")]
    operations = [migrations.RunPython(install, uninstall)]
