"""Catalog generation is deterministic and rejects missing/stale operation lists."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ApiCatalogTest(unittest.TestCase):
    def test_catalog_tracks_additions_removals_and_rejects_drift(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'docs').mkdir()
            contract = {'paths': {'/api/v1/config': {'get': {
                'operationId': 'config', 'x-api-id': 'API-019', 'x-phase': 'P2',
                'responses': {'200': {'description': 'ok'}}}}}}
            schema = root / 'docs/openapi.json'
            schema.write_text(json.dumps(contract))
            command = [sys.executable, str(ROOT / 'scripts/export_api_catalog.py'), '--root', temp]
            self.assertNotEqual(subprocess.run(command + ['--check'], capture_output=True).returncode, 0)
            subprocess.run(command, check=True, capture_output=True)
            subprocess.run(command + ['--check'], check=True, capture_output=True)
            data = json.loads((root / 'docs/api/operations.json').read_text())
            self.assertEqual([(x['method'], x['path'], x['api_id']) for x in data],
                             [('GET', '/api/v1/config', 'API-019')])
            contract['paths'] = {}
            schema.write_text(json.dumps(contract))
            self.assertNotEqual(subprocess.run(command + ['--check'], capture_output=True).returncode, 0)
            subprocess.run(command, check=True, capture_output=True)
            self.assertEqual(json.loads((root / 'docs/api/operations.json').read_text()), [])

    def test_catalog_requires_unique_operation_ids(self):
        from importlib.util import module_from_spec, spec_from_file_location
        spec = spec_from_file_location('catalog_export', ROOT / 'scripts/export_api_catalog.py')
        module = module_from_spec(spec)
        spec.loader.exec_module(module)
        with self.assertRaisesRegex(ValueError, 'API ID'):
            module.operations({'paths': {'/a': {'get': {}}, '/b': {'get': {}}}})
