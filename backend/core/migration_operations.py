"""Preserve PostgreSQL index state while allowing the documented lightweight SQLite fallback."""

from django.db import migrations


class PostgresAddIndex(migrations.AddIndex):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor == "postgresql":
            super().database_forwards(app_label, schema_editor, from_state, to_state)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor == "postgresql":
            super().database_backwards(app_label, schema_editor, from_state, to_state)


class PostgresSafeAddField(migrations.AddField):
    """Avoid SQLite table-remake failing on PostgreSQL-only GinIndex."""

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        if schema_editor.connection.vendor != "sqlite":
            return super().database_forwards(
                app_label, schema_editor, from_state, to_state
            )
        from django.contrib.postgres.indexes import GinIndex

        from_model = from_state.apps.get_model(app_label, self.model_name)
        to_model = to_state.apps.get_model(app_label, self.model_name)
        saved_from = list(from_model._meta.indexes)
        saved_to = list(to_model._meta.indexes)
        from_model._meta.indexes = [
            i for i in saved_from if not isinstance(i, GinIndex)
        ]
        to_model._meta.indexes = [i for i in saved_to if not isinstance(i, GinIndex)]
        try:
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        finally:
            from_model._meta.indexes = saved_from
            to_model._meta.indexes = saved_to
