"""Run real CLIs in temporary repositories; no application dependencies needed."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SEARCH = ROOT / "scripts/search_codebase.py"
OPENAPI = ROOT / "scripts/export_openapi.py"


class WorkspaceToolsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def search(self, query, *args):
        return subprocess.run(
            [sys.executable, str(SEARCH), query, "--root", str(self.root), *args],
            cwd="/tmp", capture_output=True, text=True,
        )

    def export(self, *args):
        return subprocess.run(
            [sys.executable, str(OPENAPI), "--root", str(self.root), *args],
            cwd="/tmp", capture_output=True, text=True,
        )

    def test_python_symbols_routes_and_numbered_source(self):
        self.write("backend/app/routers/stores.py",
                   '@router.get("/stores")\ndef list_verified_stores():\n    return []\n')
        self.write("backend/app/models/store.py", "class VerifiedStore(Base):\n    pass\n")
        result = self.search("list_verified_stores")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("backend/app/routers/stores.py:1", result.stdout)
        self.assertIn('1: @router.get("/stores")', result.stdout)
        self.assertIn("2: def list_verified_stores():", result.stdout)
        self.assertIn("class VerifiedStore", self.search("VerifiedStore").stdout)
        self.assertIn("stores.py", self.search("/stores").stdout)

    def test_kotlin_and_bug_records_are_searchable(self):
        self.write("android/Store.kt", "class StoreScreen {\n  fun showCatalog() {}\n}\n")
        self.write("docs/bugs/BUG-2026-001.json", json.dumps({
            "id": "BUG-2026-001", "root_cause": "Concurrent stock update loses inventory"
        }))
        self.assertIn("android/Store.kt", self.search("showCatalog").stdout)
        self.assertIn("docs/bugs/BUG-2026-001.json", self.search("concurrent inventory").stdout)

    def test_ignored_hidden_symlink_and_credentials_are_excluded(self):
        self.write(".gitignore", "private/\n")
        self.write("private/auth.py", "def secretmarker(): pass\n")
        self.write(".config/leak.py", "def secretmarker(): pass\n")
        self.write(".env.json", '{"secretmarker": "private"}')
        self.write("credentials.json", '{"secretmarker": "private"}')
        self.write("local.properties", "secretmarker=private")
        (self.root / "linked.py").symlink_to(self.root / "private/auth.py")
        (self.root / "linked-directory").symlink_to(self.root / "private", target_is_directory=True)
        self.write("public.py", "def visiblemarker(): pass\n")
        result = self.search("secretmarker")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("No matches", result.stdout)
        self.assertNotIn("secretmarker", result.stdout)
        self.assertIn("public.py", self.search("visiblemarker").stdout)

    def test_tracked_files_that_become_ignored_are_excluded(self):
        self.write("private/tracked.py", "def trackedsecretmarker(): pass\n")
        subprocess.run(["git", "add", "private/tracked.py"], cwd=self.root, check=True)
        self.write(".gitignore", "private/\n")
        result = self.search("trackedsecretmarker")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("No matches", result.stdout)

    def test_cache_refreshes_changes_deletions_and_new_ignores(self):
        path = self.write("item.py", "def oldmarker(): pass\n")
        self.assertIn("item.py", self.search("oldmarker").stdout)
        path.write_text("def newmarker(): pass\n")
        self.assertIn("No matches", self.search("oldmarker").stdout)
        self.assertIn("item.py", self.search("newmarker").stdout)
        self.write(".gitignore", "item.py\n")
        self.assertIn("No matches", self.search("newmarker").stdout)
        self.write("other.py", "def deletedmarker(): pass\n")
        self.assertIn("other.py", self.search("deletedmarker").stdout)
        (self.root / "other.py").unlink()
        self.assertIn("No matches", self.search("deletedmarker").stdout)

    def test_query_is_literal_and_punctuation_is_handled(self):
        self.write("docs/example.md", "A quoted invoice and OR operator.\n")
        self.assertEqual(self.search('"invoice" OR (').returncode, 0)
        result = self.search('"; DROP TABLE chunks; --')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("example.md", self.search("invoice").stdout)
        self.assertEqual(self.search("!!!").returncode, 2)
        self.assertEqual(self.search("invoice", "--limit", "0").returncode, 2)

    def test_output_is_bounded_and_finds_late_lines(self):
        self.write("huge.py", "def huge():\n" + "    commonmarker = 1\n" * 1500 +
                   "    uniquelatemarker = 2\n")
        for i in range(25):
            self.write(f"file{i}.md", "commonmarker " * 200)
        result = self.search("commonmarker", "--limit", "20")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertLessEqual(len(result.stdout), 5000)
        self.assertIn("1502:     uniquelatemarker = 2", self.search("uniquelatemarker").stdout)

    def test_openapi_explicit_skip_then_incomplete_backend_fails(self):
        result = self.export("--check")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("SKIP", result.stdout)
        self.assertFalse((self.root / "docs/openapi.json").exists())
        self.write("backend/core/models.py", "class Store: pass\n")
        result = self.export("--check")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("manage.py", result.stderr)

    def test_openapi_generation_drift_and_import_errors(self):
        # A tiny app interface exercises the exporter without installing full Django.
        self.write("backend/manage.py", 'class App:\n'
                   '    def openapi(self):\n'
                   '        return {"openapi": "3.1.0", "info": {"title": "Test", "version": "1"}, "paths": {}}\n'
                   'app = App()\n')
        self.assertNotEqual(self.export("--check").returncode, 0)
        result = self.export()
        self.assertEqual(result.returncode, 0, result.stderr)
        contract = self.root / "docs/openapi.json"
        self.assertEqual(json.loads(contract.read_text())["openapi"], "3.1.0")
        self.assertEqual(self.export("--check").returncode, 0)
        contract.write_text("{}\n")
        self.assertNotEqual(self.export("--check").returncode, 0)
        self.write("backend/manage.py", "import nonexistent_workspace_dependency\n")
        self.assertNotEqual(self.export("--check").returncode, 0)


if __name__ == "__main__":
    unittest.main()
