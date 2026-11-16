"""Tests verifying Django layer separation invariants (views -> serializers -> services -> models)."""
import importlib
from django.test import TestCase


class LayerSeparationTest(TestCase):
    """Enforce architectural layer independence across core modules."""

    def test_services_layer_does_not_import_views(self):
        """Services must not depend on HTTP views or presentation layers."""
        services_mod = importlib.import_module('core.services')
        services_dict = vars(services_mod)
        for name, obj in services_dict.items():
            mod_name = getattr(obj, '__module__', '')
            self.assertFalse(
                'core.views' in mod_name,
                f"Service {name} illegally references view module {mod_name}"
            )

    def test_models_layer_does_not_import_views_or_serializers(self):
        """Models must not depend on views or serializers."""
        models_mod = importlib.import_module('core.models')
        models_dict = vars(models_mod)
        for name, obj in models_dict.items():
            mod_name = getattr(obj, '__module__', '')
            self.assertFalse(
                'core.views' in mod_name or 'core.serializers' in mod_name,
                f"Model {name} illegally references {mod_name}"
            )

    def test_atomic_operation_context_manager_available(self):
        """Services provide atomic transaction boundaries."""
        from core.services import atomic_operation
        with atomic_operation():
            pass  # Verifies context manager protocol
