"""Search safety, retrieval fallbacks, and accepted context isolation."""
from pathlib import Path
import os
import sqlite3
import io
import json
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import search_codebase as search


class ContextSearchTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        self._ctx_base = os.environ.pop('CTX_BASE', None)
        self.addCleanup(self._restore_env)

    def _restore_env(self):
        if self._ctx_base is not None:
            os.environ['CTX_BASE'] = self._ctx_base

    def write(self, path, content):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        return target

    def cli(self, *args):
        return subprocess.run([sys.executable, str(ROOT / 'scripts/search_codebase.py'),
                               '--root', str(self.root), *args], capture_output=True, text=True)

    def test_or_fallback_and_weak_hits_and_empty_diagnostic(self):
        self.write('docs/example.md', 'alpha only\n')
        result = self.cli('alpha beta gamma')
        self.assertIn('OR fallback', result.stdout)
        self.assertIn('WEAK', result.stdout)
        self.assertIn('example.md', result.stdout)
        empty = self.cli('unfindable')
        self.assertIn('AND', empty.stdout)
        self.assertIn('OR', empty.stdout)
        self.assertIn('git grep', empty.stdout)

    def test_secret_tripwire_evicts_cached_content(self):
        target = self.write('safe.md', 'distinctmarker\n')
        self.assertIn('safe.md', self.cli('distinctmarker').stdout)
        target.write_text('distinctmarker ' + 'ghp_' + 'a' * 36)
        self.assertNotIn('safe.md', self.cli('distinctmarker').stdout)
        with sqlite3.connect(self.root / '.search_index.db') as db:
            self.assertEqual(db.execute('SELECT count(*) FROM chunks').fetchone()[0], 0)

    def test_archives_excluded_unless_history_and_scope_listing(self):
        self.write('docs/archive/old.md', 'oldmarker')
        self.write('backend/app/item.py', 'visiblemarker')
        self.write('backend/application/no.py', 'wrongmarker')
        self.assertNotIn('old.md', self.cli('oldmarker').stdout)
        self.assertIn('old.md', self.cli('oldmarker', '--history').stdout)
        scoped = self.cli('--scope', 'backend/app')
        self.assertEqual(scoped.returncode, 0, scoped.stderr)
        self.assertIn('item.py', scoped.stdout)
        self.assertNotIn('no.py', scoped.stdout)

    def test_unsafe_scope_is_explicit_error(self):
        result = self.cli("--scope", "../outside")
        self.assertEqual(result.returncode, 2)
        self.assertIn("scope", result.stderr)

    def test_corrupt_cache_recovers_without_touching_other_files(self):
        self.write('.search_index.db', 'broken sqlite')
        ledger = self.write('ledger.jsonl', '{"keep":true}')
        self.write('visible.md', 'recoverymarker')
        result = self.cli('recoverymarker')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('visible.md', result.stdout)
        self.assertEqual(ledger.read_text(), '{"keep":true}')

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], text=True).strip()

    def put_record(self, kind, number, body, **meta):
        rid = f"{kind}-{number:016x}"
        fields = dict(id=rid, title="Search fixture", created="2026-11-16", paths=["backend/app"])
        fields.update(meta)
        content = "+++\n" + "\n".join(f"{key} = {json.dumps(value)}" for key, value in fields.items())
        return rid, self.write(f"docs/memory/{rid}-fixture.md", content + "\n+++\n" + body)

    def commit_base(self):
        self.git("config", "user.name", "Search Test")
        self.git("config", "user.email", "test@example.invalid")
        self.git("add", "docs")
        self.git("commit", "-qm", "accepted fixture")
        self.git("update-ref", "refs/remotes/origin/main", self.git("rev-parse", "HEAD"))

    def test_real_pinned_base_survives_proposed_closure_edit_and_deletion(self):
        blocker, target = self.put_record("BLK", 1, "acceptedconstraintmarker")
        self.commit_base()
        self.put_record("HND", 2, "proposedclosuremarker", status="open", resolves=[blocker])
        target.write_text(target.read_text().replace("acceptedconstraintmarker", "editedconstraintmarker"))
        result = self.cli("acceptedconstraintmarker", "--open", "--scope", "backend/app")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ACCEPTED open 2026-11-16", result.stdout)
        self.assertIn("PROPOSED", self.cli("editedconstraintmarker", "--memory").stdout)
        target.unlink()
        self.assertIn("acceptedconstraintmarker", self.cli("acceptedconstraintmarker", "--open").stdout)

    def test_records_without_paths_are_global_under_scoped_search(self):
        _, target = self.put_record("DEC", 1, "globalpolicyneedle", topic="phones")
        target.write_text(target.read_text().replace('paths = ["backend/app"]\n', ''))
        self.commit_base()
        result = self.cli("globalpolicyneedle", "--scope", "android/catalog")
        self.assertIn("globalpolicyneedle", result.stdout)
        self.put_record("HND", 2, "globalhandoffneedle", status="open")
        handoff = self.root / "docs/memory/HND-0000000000000002-fixture.md"
        handoff.write_text(handoff.read_text().replace('paths = ["backend/app"]\n', ''))
        self.assertIn("globalhandoffneedle", self.cli("globalhandoffneedle", "--scope", "android/catalog").stdout)

    def test_real_closed_base_is_hidden_until_history(self):
        blocker, _ = self.put_record("BLK", 1, "closedconstraintmarker")
        self.put_record("HND", 2, "resolutionmarker", status="open", resolves=[blocker])
        self.commit_base()
        self.assertNotIn("closedconstraintmarker", self.cli("closedconstraintmarker", "--memory").stdout)
        self.assertIn("ACCEPTED closed", self.cli("closedconstraintmarker", "--memory", "--history").stdout)

    def record(self, raw="original acceptedmarker", status="open"):
        return SimpleNamespace(id="BLK-0123456789abcdef", kind="BLK",
                               path="docs/memory/BLK-0123456789abcdef-gate.md",
                               created="2026-11-16", meta={"paths": ["backend/app"]},
                               raw=raw)

    def context(self, record, status="open", errors=()):
        return SimpleNamespace(
            load_effective=lambda root: SimpleNamespace(records={record.id: record},
                statuses={record.id: status}, errors=list(errors), base="abc"),
            parse_record=lambda name, content: self.record(content),
            scope_matches=lambda left, right: left == right or left.startswith(right + "/")
                or right.startswith(left + "/"))

    def test_edited_and_deleted_proposals_preserve_original_accepted_record(self):
        record = self.record()
        target = self.write(record.path, "edited proposedmarker")
        with patch.dict(sys.modules, context_memory=self.context(record)):
            sources = list(search.documents(self.root, memory=True))
            self.assertTrue(any("ACCEPTED open 2026-11-16" in name and
                                "acceptedmarker" in body for name, body in sources))
            self.assertTrue(any("PROPOSED" in name and "proposedmarker" in body
                                for name, body in sources))
            target.unlink()
            self.assertTrue(any("acceptedmarker" in body
                                for _, body in search.documents(self.root, open_only=True)))

    def test_closed_suppression_history_and_unknown_failure(self):
        record = self.record()
        context = self.context(record, status="closed")
        with patch.dict(sys.modules, context_memory=context):
            self.assertEqual(list(search.documents(self.root, memory=True)), [])
            self.assertTrue(list(search.documents(self.root, memory=True, history=True)))
        context = self.context(record, status="closed", errors=["base validation failed"])
        with patch.dict(sys.modules, context_memory=context):
            sources = list(search.documents(self.root, open_only=True))
            self.assertIn("UNKNOWN", sources[0][0])
            self.assertIn("acceptedmarker", sources[0][1])

    def test_failed_rebuild_uses_safe_source_fallback_twice_only(self):
        self.write("visible.md", "lastresortmarker")
        context = self.context(self.record())
        output = io.StringIO()
        with patch.dict(sys.modules, context_memory=context), \
                patch.object(sys, "argv", ["search", "lastresortmarker", "--root", str(self.root)]), \
                patch.object(search.sqlite3, "connect", side_effect=sqlite3.DatabaseError("broken")) as connect, \
                patch.object(sys, "stdout", output):
            self.assertEqual(search.main(), 0)
        self.assertEqual(connect.call_count, 2)
        self.assertIn("safe source fallback", output.getvalue())
        self.assertIn("visible.md", output.getvalue())

    def test_memory_filters_regular_files_and_excludes_malformed_records(self):
        record = self.record()
        self.write("visible.md", "regularmarker")
        self.write("docs/memory/broken.md", "malformedmarker")
        context = self.context(record)
        context.parse_record = lambda name, content: (_ for _ in ()).throw(ValueError("invalid"))
        with patch.dict(sys.modules, context_memory=context):
            sources = list(search.documents(self.root, memory=True))
        self.assertEqual(len(sources), 1)
        self.assertNotIn("malformedmarker", repr(sources))
        self.assertNotIn("regularmarker", repr(sources))

    def test_fallback_is_bounded_and_excludes_unsafe_sources(self):
        sources = [("source.md", "alpha " * 2000),
                   ("unsafe.md", "alpha " + "ghp_" + "a" * 36)]
        output = search.source_search(sources, "alpha beta gamma", 20)
        self.assertLessEqual(len(output), 5000)
        self.assertIn("OR fallback", output)
        self.assertIn("WEAK", output)
        self.assertNotIn("unsafe.md", output)


if __name__ == '__main__':
    unittest.main()
