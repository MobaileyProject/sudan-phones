"""Metadata logging never persists child content or changes agent results."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stderr
import io
import fcntl
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from slack_automation.agent import run_agent


class MetricsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "checkout"
        self.root.mkdir(mode=0o700)
        self.path = Path(self.tmp.name) / "private" / "metrics.jsonl"

    def run_child(self, payload, **config):
        child = self.root / "fake-agy"
        child.write_text("#!/usr/bin/env python3\nprint(" + repr(json.dumps(payload)) + ")\n")
        child.chmod(0o700)
        return run_agent(self.root, dict(agy=str(child), **config), "fake-secret prompt", ["message"])

    def payload(self, **extra):
        return dict(status="SUCCESS", structured_output={"message": "fake-secret response"},
                    duration_seconds=2.5, num_turns=3, usage={"input_tokens": 20, "output_tokens": 4}, **extra)

    def test_child_metadata_is_private_and_content_is_never_copied(self):
        self.assertEqual(self.run_child(self.payload(error="fake-secret error"), metrics_path=str(self.path),
                                       _task_id="Rec123", _base_sha="a" * 40,
                                       _brief_exit=0, _brief_bytes=30, _brief_ms=1.5),
                         {"message": "fake-secret response"})
        text = self.path.read_text()
        row = json.loads(text)
        self.assertNotIn("fake-secret", text)
        self.assertEqual(set(row), {"task_id", "prompt_version", "base_sha", "status", "duration_seconds",
                                   "num_turns", "usage", "worker_wall_seconds", "brief_exit", "brief_bytes", "brief_ms"})
        self.assertEqual(row["usage"], {"input_tokens": 20, "output_tokens": 4})
        self.assertEqual(row["task_id"], "Rec123")
        self.assertEqual(row["prompt_version"], 1)
        self.assertEqual(row["base_sha"], "a" * 40)
        self.assertGreaterEqual(row["worker_wall_seconds"], 0)
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.path.parent.stat().st_mode & 0o777, 0o700)

    def test_default_disabled_and_invalid_scalars_are_not_retained(self):
        self.run_child(self.payload())
        self.assertFalse(self.path.exists())
        payload = self.payload()
        payload.update(duration_seconds=True, num_turns=-1,
                       usage={"input_tokens": "fake-secret", "output_tokens": -1,
                              "thinking_tokens": float("nan"), "cache_read_tokens": True,
                              "total_tokens": 24, "response": "fake-secret"})
        self.run_child(payload, metrics_path=str(self.path), _task_id="fake-secret\n",
                       _prompt_version="fake-secret", _base_sha="fake-secret", _brief_exit="fake-secret")
        row = json.loads(self.path.read_text())
        self.assertEqual(row["usage"], {"total_tokens": 24})
        self.assertIsNone(row["task_id"])
        self.assertIsNone(row["base_sha"])
        self.assertIsNone(row["prompt_version"])
        self.assertNotIn("fake-secret", self.path.read_text())

    def test_ledger_aliases_and_tracked_files_are_not_modified(self):
        ledger = self.root / ".slack-worker" / "jobs.db"
        ledger.parent.mkdir()
        ledger.write_text("original ledger")
        alias = self.root.parent / "alias"
        os.link(ledger, alias)
        symlink = self.root.parent / "symlink"
        symlink.symlink_to(ledger)
        for path in [ledger, alias, symlink]:
            self.run_child(self.payload(), metrics_path=str(path))
            self.assertEqual(ledger.read_text(), "original ledger")
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        tracked = self.root / "tracked.jsonl"
        tracked.write_text("tracked content")
        subprocess.run(["git", "-C", str(self.root), "add", str(tracked)], check=True)
        self.run_child(self.payload(), metrics_path=str(tracked))
        self.assertEqual(tracked.read_text(), "tracked content")

    def test_untracked_repository_destination_is_refused(self):
        destination = self.root / "untracked.jsonl"
        self.run_child(self.payload(), metrics_path=str(destination))
        self.assertFalse(destination.exists())

    def test_all_linked_checkouts_are_excluded_but_external_path_works(self):
        def git(*args):
            subprocess.run(["git", "-C", str(self.root), "-c", "user.name=Test",
                            "-c", "user.email=test@example.invalid", *args], check=True, capture_output=True)
        git("init", "-q")
        git("commit", "-q", "--allow-empty", "-m", "initial")
        linked = self.root.parent / "linked checkout"
        git("worktree", "add", "--detach", str(linked), "HEAD")
        self.run_child(self.payload())
        private = self.root / ".state"
        private.mkdir(mode=0o700)
        destination = private / "metrics.jsonl"
        config = {"agy": str(self.root / "fake-agy"), "metrics_path": str(destination)}
        self.assertEqual(run_agent(linked, config, "Test", ["message"]), {"message": "fake-secret response"})
        self.assertFalse(destination.exists())
        config["metrics_path"] = str(self.path)
        self.assertEqual(run_agent(linked, config, "Test", ["message"]), {"message": "fake-secret response"})
        self.assertEqual(json.loads(self.path.read_text())["status"], "SUCCESS")

    def test_failed_checkout_lookup_skips_metrics_and_sanitizes_notice(self):
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        real_run = subprocess.run
        def unavailable(args, **kwargs):
            if "worktree" in args:
                return subprocess.CompletedProcess(args, 128, b"", b"fake-secret diagnostics")
            return real_run(args, **kwargs)
        notices = io.StringIO()
        with patch("slack_automation.metrics.subprocess.run", side_effect=unavailable), redirect_stderr(notices):
            self.assertEqual(self.run_child(self.payload(), metrics_path=str(self.path)),
                             {"message": "fake-secret response"})
        self.assertFalse(self.path.exists())
        self.assertIn("metrics unavailable", notices.getvalue())
        self.assertNotIn("fake-secret", notices.getvalue())

    def test_busy_metrics_lock_has_a_bounded_wait(self):
        self.path.parent.mkdir(mode=0o700)
        with self.path.open("w") as held:
            fcntl.flock(held, fcntl.LOCK_EX)
            code = "from slack_automation.metrics import append_metrics; import sys; append_metrics(sys.argv[1], {'metrics_path':sys.argv[2]}, '{}', 0.1, None)"
            env = dict(os.environ, PYTHONPATH=str(Path(__file__).resolve().parents[1] / "scripts"))
            started = time.monotonic()
            child = subprocess.Popen([sys.executable, "-c", code, str(self.root), str(self.path)],
                                     env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                _, stderr = child.communicate(timeout=1)
            except subprocess.TimeoutExpired:
                child.kill()
                child.communicate()
                self.fail("metrics append blocked on a busy lock")
        self.assertLess(time.monotonic() - started, 1)
        self.assertIn("metrics unavailable", stderr)
        self.assertEqual(self.path.read_text(), "")

    def test_failure_and_unavailable_destination_preserve_agent_behavior(self):
        blocked = self.root / "file"
        blocked.write_text("not a directory")
        notices = io.StringIO()
        with redirect_stderr(notices):
            self.assertEqual(self.run_child(self.payload(), metrics_path=str(blocked / "fake-secret")),
                             {"message": "fake-secret response"})
        self.assertIn("metrics unavailable", notices.getvalue())
        self.assertNotIn("fake-secret", notices.getvalue())
        with self.assertRaises(ValueError):
            self.run_child({"status": "fake-secret", "error": "fake-secret"}, metrics_path=str(self.path))
        self.assertEqual(json.loads(self.path.read_text())["status"], "UNKNOWN")
        self.assertNotIn("fake-secret", self.path.read_text())

    def test_initial_head_is_captured_before_child_commits(self):
        def git(*args):
            return subprocess.check_output(["git", "-C", str(self.root), "-c", "user.name=Test",
                                            "-c", "user.email=test@example.invalid", *args], text=True).strip()
        git("init", "-q")
        git("commit", "-q", "--allow-empty", "-m", "initial")
        initial = git("rev-parse", "HEAD")
        child = self.root / "fake-agy"
        child.write_text("#!/usr/bin/env python3\nimport subprocess\n"
                         "subprocess.run(['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', "
                         "'commit', '-q', '--allow-empty', '-m', 'child'], check=True)\n"
                         "print(" + repr(json.dumps(self.payload())) + ")\n")
        child.chmod(0o700)
        run_agent(self.root, {"agy": str(child), "metrics_path": str(self.path), "_branch": "feature/test"},
                  "Test", ["message"])
        self.assertNotEqual(git("rev-parse", "HEAD"), initial)
        self.assertEqual(json.loads(self.path.read_text())["base_sha"], initial)

    def test_processes_append_complete_independent_json_rows(self):
        code = "\n".join([
            "from slack_automation.metrics import append_metrics",
            "import sys",
            "for n in range(25):",
            "    append_metrics(sys.argv[1], {'metrics_path': sys.argv[2], '_task_id': 'Rec123'}, '{}', 0.1, None)",
        ])
        env = dict(os.environ, PYTHONPATH=str(Path(__file__).resolve().parents[1] / "scripts"))
        processes = [subprocess.Popen([sys.executable, "-c", code, str(self.root), str(self.path)], env=env)
                     for _ in range(4)]
        for process in processes:
            self.assertEqual(process.wait(timeout=20), 0)
        rows = [json.loads(line) for line in self.path.read_text().splitlines()]
        self.assertEqual(len(rows), 100)
        self.assertTrue(all(row["task_id"] == "Rec123" for row in rows))


if __name__ == "__main__":
    unittest.main()
