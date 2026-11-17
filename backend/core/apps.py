"""Core app configuration."""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'Core Infrastructure'

    def ready(self):
        # Python 3.14 copy compatibility for Django BaseContext
        import sys
        if sys.version_info >= (3, 14):
            from django.template.context import BaseContext

            def _base_context_copy(ctx):
                dup = ctx.__class__.__new__(ctx.__class__)
                dup.dicts = ctx.dicts[:]
                return dup

            BaseContext.__copy__ = _base_context_copy
