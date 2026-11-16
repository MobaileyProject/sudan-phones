"""Migration preserves source bytes and accounts for every live STATE line."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import context_migration as migration


class MigrationTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / "docs/archive").mkdir(parents=True)
        self.state = self.root / "docs/STATE.md"
        self.state.write_bytes(b"# State\n\nUnfinished task\n")
        self.git("init", "-q")
        self.git("add", "docs/STATE.md")
        self.git("commit", "-qm", "source")
        self.sha = self.git("rev-parse", "HEAD")
        self.blob = self.git("rev-parse", "HEAD:docs/STATE.md")
        self.git("update-ref", "refs/remotes/origin/main", self.sha)
        self.archive = "docs/archive/STATE-source.md"
        (self.root / self.archive).write_bytes(self.state.read_bytes())
        self.items = [dict(lines="1-3", kind="unfinished", disposition="legacy")]
        self.state.write_text(f"Pending task (archive: {self.archive}:L1) paths: scripts/\n")
        self.manifest = self.root / "docs/archive/COVERAGE-source.toml"

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), "-c", "user.name=Test",
                                        "-c", "user.email=test@example.invalid", *args], text=True).strip()

    def coverage(self, **changes):
        meta = dict(source_commit=self.sha, source_blob=self.blob, archive=self.archive)
        meta.update(changes)
        lines = [key + " = " + json.dumps(value) for key, value in meta.items()]
        for item in self.items:
            lines.append("[[item]]")
            lines.extend(key + " = " + ("true" if value is True else "false" if value is False else json.dumps(value))
                         for key, value in item.items())
        self.manifest.write_text("\n".join(lines) + "\n")

    def test_no_manifest_and_complete_legacy_coverage_pass(self):
        self.assertEqual(migration.validate(self.root), [])
        self.coverage()
        self.assertEqual(migration.validate(self.root), [])

    def test_archive_bytes_and_source_blob_must_match(self):
        self.coverage()
        (self.root / self.archive).write_bytes(b"# State\n\nUnfinished task\r\n")
        self.assertTrue(migration.validate(self.root))
        (self.root / self.archive).write_bytes(b"# State\n\nUnfinished task\n")
        self.blob = "a" * 40
        self.coverage()
        self.assertTrue(migration.validate(self.root))

    def test_nonblank_lines_require_exactly_one_valid_disposition(self):
        for items in [[dict(lines="1", kind="other", disposition="legacy")],
                      [*self.items, dict(lines="3", kind="other", disposition="legacy")],
                      [dict(lines="0-3", kind="unfinished", disposition="legacy")],
                      [dict(lines="1-4", kind="unfinished", disposition="legacy")]]:
            with self.subTest(items=items):
                self.items = items
                self.coverage()
                self.assertTrue(migration.validate(self.root))

    def test_historical_live_items_require_evidence_not_just_reason(self):
        self.items = [dict(lines="1-3", kind="blocker", disposition="historical", reason="Resolved", refs=["file:notes"])]
        self.coverage()
        self.assertTrue(migration.validate(self.root))
        self.items[0]["refs"] = ["pr:123"]
        self.coverage()
        self.assertEqual(migration.validate(self.root), [])

    def test_legacy_marker_and_scope_must_share_a_line(self):
        self.coverage()
        self.state.write_text(f"Pending (archive: {self.archive}:L1)\npaths: scripts/\n")
        self.assertTrue(migration.validate(self.root))

    def test_record_target_open_status_and_decision_acceptance(self):
        directory = self.root / "docs/memory"
        directory.mkdir()
        rid = "DEC-0123456789abcdef"
        target = directory / (rid + "-policy.md")
        target.write_text('+++\nid = "' + rid + '"\ntitle = "Policy"\ncreated = "2026-11-16"\ntopic = "policy"\n+++\nBody\n')
        self.items = [dict(lines="1-3", kind="constraint", disposition="record", target=rid)]
        self.coverage()
        self.assertTrue(migration.validate(self.root))
        self.items[0]["accepted"] = True
        self.coverage()
        self.assertEqual(migration.validate(self.root), [])
        target.unlink()
        self.assertTrue(migration.validate(self.root))

    def test_closed_blocker_cannot_replace_live_source_items(self):
        directory = self.root / "docs/memory"
        directory.mkdir()
        rid = "BLK-0123456789abcdef"
        (directory / (rid + "-blocked.md")).write_text(
            '+++\nid = "' + rid + '"\ntitle = "Blocked"\ncreated = "2026-11-16"\npaths = ["scripts/"]\n+++\nBody\n')
        self.items = [dict(lines="1-3", kind="blocker", disposition="record", target=rid)]
        self.coverage()
        self.assertEqual(migration.validate(self.root), [])
        (directory / "HND-fedcba9876543210-done.md").write_text(
            '+++\nid = "HND-fedcba9876543210"\ntitle = "Done"\ncreated = "2026-11-16"\n'
            'status = "done"\nresolves = ["' + rid + '"]\n+++\nResolved\n')
        self.assertTrue(migration.validate(self.root))

    def test_cli_errors_are_sanitized(self):
        self.coverage(source_blob="fake-secret")
        result = subprocess.run([sys.executable, str(Path(migration.__file__)), "--root", str(self.root)],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertNotIn("fake-secret", result.stdout + result.stderr)
        self.assertNotIn("Traceback", result.stdout + result.stderr)

    def test_record_may_close_after_manifest_introduction(self):
        directory = self.root / "docs/memory"
        directory.mkdir()
        rid = "BLK-0123456789abcdef"
        (directory / (rid + "-blocked.md")).write_text(
            '+++\nid = "' + rid + '"\ntitle = "Blocked"\ncreated = "2026-11-16"\npaths = ["scripts/"]\n+++\nBody\n')
        self.items = [dict(lines="1-3", kind="blocker", disposition="record", target=rid)]
        self.coverage()
        self.git("add", "docs")
        self.git("commit", "-qm", "introduce migration")
        (directory / "HND-fedcba9876543210-done.md").write_text(
            '+++\nid = "HND-fedcba9876543210"\ntitle = "Done"\ncreated = "2026-11-16"\n'
            'status = "done"\nresolves = ["' + rid + '"]\n+++\nResolved\n')
        self.assertEqual(migration.validate(self.root), [])
        self.git("add", "docs")
        self.git("commit", "-qm", "resolve blocker")
        head = self.git("rev-parse", "HEAD")
        self.git("update-ref", "refs/remotes/origin/main", head)
        self.assertEqual(migration.validate(self.root, head), [])
        self.items[0]["kind"] = "other"
        self.coverage()
        self.assertTrue(migration.validate(self.root))

    def test_introduction_proof_survives_later_legacy_stub_removal(self):
        self.coverage()
        self.git("add", "docs")
        self.git("commit", "-qm", "introduce legacy migration")
        self.state.write_text("# State\nLegacy task resolved\n")
        self.assertEqual(migration.validate(self.root), [])
        self.git("add", "docs/STATE.md")
        self.git("commit", "-qm", "resolve legacy task")
        head = self.git("rev-parse", "HEAD")
        self.git("update-ref", "refs/remotes/origin/main", head)
        self.assertEqual(migration.validate(self.root, head), [])

    def test_introduction_proof_survives_later_record_archival(self):
        directory = self.root / "docs/memory"
        directory.mkdir()
        rid = "BLK-0123456789abcdef"
        record = directory / (rid + "-blocked.md")
        record.write_text('+++\nid = "' + rid + '"\ntitle = "Blocked"\ncreated = "2026-11-16"\npaths = ["scripts/"]\n+++\nBody\n')
        self.items = [dict(lines="1-3", kind="blocker", disposition="record", target=rid)]
        self.coverage()
        self.git("add", "docs")
        self.git("commit", "-qm", "introduce record migration")
        record.unlink()
        self.assertEqual(migration.validate(self.root), [])
        self.git("add", "docs/memory")
        self.git("commit", "-qm", "archive reviewed record")
        head = self.git("rev-parse", "HEAD")
        self.git("update-ref", "refs/remotes/origin/main", head)
        self.assertEqual(migration.validate(self.root, head), [])

    def test_pinned_git_view_ignores_proposed_deletion_and_rejects_unsafe_paths(self):
        self.coverage()
        self.git("add", "docs")
        self.git("commit", "-qm", "migration")
        base = self.git("rev-parse", "HEAD")
        self.git("update-ref", "refs/remotes/origin/main", base)
        self.state.unlink()
        self.assertEqual(migration.validate(self.root, base), [])
        self.assertEqual(migration.validate(self.root), [])
        self.coverage(archive="../fake-secret")
        self.assertTrue(migration.validate(self.root))
        self.coverage()
        archived = self.root / self.archive
        archived.unlink()
        archived.symlink_to(self.manifest)
        self.assertTrue(migration.validate(self.root))


if __name__ == "__main__":
    unittest.main()
