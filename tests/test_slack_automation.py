"""Exercise worker boundaries without Slack credentials or an AI subscription."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from slack_automation.core import Ledger, eligible, lock, parse_agent, verify_pr
from slack_automation.slack import Slack, encode, decode, slack_mrkdwn
from slack_automation.agent import run_agent
from slack_automation.setup import create_backlog, credential
from slack_automation.worker import execute, publish, sync_sources, prepare_worktree, collect_sources, reconcile_merged


class AutomationTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.ledger = Ledger(self.root / "worker.db")
        self.addCleanup(self.ledger.db.close)
        self.config = {
            "list_id": "F123", "execution_enabled": True,
            "repo": "MobaileyProject/sudan-phones", "workspace": "T0CJRU4RSUQ",
            "channels": {"updates": "C1", "bugs": "C2", "questions": "C3"},
        }
        self.task = {"id": "Rec1", "list_id": "F123", "title": "Fix search",
                     "kind": "bug", "status": "Ready", "executor": "agy",
                     "details": "Quotes crash search", "acceptance": "Quoted search succeeds"}

    def test_only_ready_agy_tasks_in_configured_list_can_execute(self):
        self.assertTrue(eligible(self.task, self.config))
        for key, value in [("list_id", "F999"), ("status", "Backlog"),
                           ("executor", "human"), ("kind", "other"), ("acceptance", "")]:
            self.assertFalse(eligible(dict(self.task, **{key: value}), self.config))
        self.assertFalse(eligible(self.task, dict(self.config, execution_enabled=False)))

    def test_creation_is_checkpointed_and_refuses_duplicate_list(self):
        path = self.root / "worker.json"
        config = dict(self.config, list_id="")
        class Lists:
            def call(self, method, **payload):
                if method == "slackLists.create":
                    return {"ok": True, "list_id": "FNew", "list_metadata": {"schema": [
                        dict(x, id="Col" + x["key"]) for x in payload["schema"]]}}
                return {"ok": True}
        create_backlog(Lists(), config, path)
        saved = json.loads(path.read_text())
        self.assertEqual(saved["list_id"], "FNew")
        self.assertFalse(saved["execution_enabled"])
        self.assertEqual(saved["columns"]["status"]["values"]["PR ready"], "pr_ready")
        with self.assertRaises(RuntimeError):
            create_backlog(Lists(), saved, path)

    def test_ambiguous_creation_cannot_automatically_create_second_list(self):
        path = self.root / "worker.json"
        config = dict(self.config, list_id="")
        class Lists:
            def call(self, *args, **kwargs):
                raise RuntimeError("Network failed after sending create")
        with self.assertRaises(RuntimeError):
            create_backlog(Lists(), config, path)
        saved = json.loads(path.read_text())
        with self.assertRaisesRegex(RuntimeError, "uncertain"):
            create_backlog(Lists(), saved, path)

    def test_setup_resumes_sharing_without_creating_another_list(self):
        path = self.root / "worker.json"
        class Lists:
            creates = 0
            fail = True
            def call(self, method, **payload):
                if method == "slackLists.create":
                    self.creates += 1
                    self.schema = [dict(c, id="Col" + c["key"]) for c in payload["schema"]]
                    return {"ok": True, "list_id": "FNew", "list_metadata": {"schema": self.schema}}
                if method == "slackLists.items.list":
                    return {"ok": True, "list": {"list_metadata": {"schema": self.schema}}}
                if self.fail:
                    raise RuntimeError("Sharing failed")
                return {"ok": True}
        lists = Lists()
        with self.assertRaises(RuntimeError):
            create_backlog(lists, dict(self.config, list_id=""), path)
        lists.fail = False
        create_backlog(lists, json.loads(path.read_text()), path)
        self.assertEqual(lists.creates, 1)
        self.assertNotIn("creation_pending", json.loads(path.read_text()))

    def test_environment_credential_is_used_without_loading_config_file(self):
        with patch.dict("os.environ", {"SLACK_BOT_TOKEN": "test-only-sentinel"}):
            self.assertEqual(credential({"credential_source": "environment"}), "test-only-sentinel")

    def test_claim_survives_restart_and_blocks_duplicate_or_uncertain_run(self):
        self.assertTrue(self.ledger.claim("F123:Rec1", "fix/slack-abc"))
        second = Ledger(self.root / "worker.db")
        self.addCleanup(second.db.close)
        self.assertFalse(second.claim("F123:Rec1", "fix/slack-abc"))
        self.ledger.finish("F123:Rec1", {"outcome": "blocked", "summary": "Timeout"})
        self.assertFalse(second.claim("F123:Rec1", "fix/slack-abc"))
        self.assertEqual(second.get("F123:Rec1")["result"]["summary"], "Timeout")

    def test_process_lock_prevents_two_workers(self):
        with lock(self.root / "lock"):
            with self.assertRaises(RuntimeError):
                with lock(self.root / "lock"):
                    self.fail("Second lock acquired")

    def test_agent_soft_denial_and_malformed_output_are_failures(self):
        for payload in [{"status": "ERROR", "structured_output": {}},
                        {"status": "SUCCESS", "response": "Permission denied"},
                        {"status": "SUCCESS", "structured_output": []}]:
            with self.assertRaises(ValueError):
                parse_agent(json.dumps(payload), ["outcome", "summary"])
        result = parse_agent(json.dumps({"status": "SUCCESS", "structured_output": {
            "outcome": "blocked", "summary": "Needs access"}}), ["outcome", "summary"])
        self.assertEqual(result["outcome"], "blocked")

    def test_real_agent_adapter_keeps_slack_secret_out_of_child_environment(self):
        fake = self.root / "fake-agy"
        fake.write_text("#!/usr/bin/env python3\nimport json, os\n"
                        "value = 'secret inherited' if 'SLACK_BOT_TOKEN' in os.environ else 'draft ready'\n"
                        "print(json.dumps({'status':'SUCCESS','structured_output':{'message':value}}))\n")
        fake.chmod(0o700)
        with patch.dict("os.environ", {"SLACK_BOT_TOKEN": "test-only-sentinel"}):
            result = run_agent(self.root, dict(self.config, agy=str(fake)), "Draft only", ["message"])
        self.assertEqual(result["message"], "draft ready")

    def test_real_agent_adapter_does_not_accept_soft_denied_success(self):
        fake = self.root / "denied-agy"
        fake.write_text("#!/usr/bin/env python3\nimport json, sys\n"
                        "print('tool auto-denied', file=sys.stderr)\n"
                        "print(json.dumps({'status':'SUCCESS','structured_output':{'message':'done'}}))\n")
        fake.chmod(0o700)
        with self.assertRaisesRegex(RuntimeError, "denied tool"):
            run_agent(self.root, dict(self.config, agy=str(fake)), "Draft only", ["message"])

    def test_pr_must_match_repository_branch_and_open_state(self):
        good = {"url": "https://github.com/MobaileyProject/sudan-phones/pull/12",
                "headRefName": "fix/slack-abc", "baseRefName": "main", "state": "OPEN"}
        self.assertTrue(verify_pr(good, self.config["repo"], "fix/slack-abc"))
        for field, value in [("headRefName", "main"), ("baseRefName", "dev"),
                             ("state", "CLOSED"), ("url", "https://evil.test/pull/12")]:
            self.assertFalse(verify_pr(dict(good, **{field: value}), self.config["repo"], "fix/slack-abc"))

    def test_slack_cells_handle_select_and_rich_text_without_eval(self):
        column = {"id": "ColStatus", "type": "select", "values": {"Ready": "Opt1"}}
        self.assertEqual(encode(column, "Ready"), {"column_id": "ColStatus", "select": ["Opt1"]})
        self.assertEqual(decode(column, {"select": ["Opt1"]}), "Ready")
        with self.assertRaises(ValueError):
            encode(column, "Unconfigured")
        text = {"id": "ColText", "type": "text"}
        value = "Arabic العربية $(touch /tmp/nope)"
        self.assertEqual(decode(text, encode(text, value)), value)

    def test_github_bold_and_bullets_render_as_slack_mrkdwn(self):
        source = "Task Update\n\n* **Status / Change:** PR ready.\n* **Next Action:** Review PR."
        self.assertEqual(slack_mrkdwn(source), "Task Update\n\n• *Status / Change:* PR ready.\n• *Next Action:* Review PR.")

    def test_pr_notification_keeps_ci_evidence_and_requests_review(self):
        class Lists:
            def tasks(self, config):
                return []
            def create(self, config, fields):
                pass
        report = {"source": "pr:5", "title": "Automation", "kind": "feature", "status": "PR ready",
                  "pr": "https://github.com/MobaileyProject/sudan-phones/pull/5", "tests": "Validation & Secret Scan: SUCCESS"}
        sync_sources(Lists(), self.config, [report], self.ledger)
        result = self.ledger.get("report:F123:pr:5")["result"]
        self.assertEqual(result["pr_url"], "https://github.com/MobaileyProject/sudan-phones/pull/5")
        self.assertEqual(result["tests"], "Validation & Secret Scan: SUCCESS")
        self.assertNotIn("mark Ready", result["next_action"])
        self.assertIn("review", result["next_action"].lower())

    def test_ci_refresh_edits_the_existing_notification_without_a_duplicate(self):
        class Lists:
            items = []
            messages = {}
            def tasks(self, config):
                return list(self.items)
            def create(self, config, fields):
                self.items.append(fields)
            def post(self, channel, text, key):
                self.messages["123.1"] = text
                return "123.1"
            def edit(self, channel, ts, text):
                self.messages[ts] = text
        lists = Lists()
        report = {"source": "pr:5", "title": "Automation", "kind": "feature", "status": "PR ready",
                  "pr": "https://github.com/MobaileyProject/sudan-phones/pull/5", "tests": "Validation: PENDING"}
        sync_sources(lists, self.config, [report], self.ledger)
        publish(self.config, self.ledger, lists, lambda *args: {"message": "Checks pending; review PR"})
        sync_sources(lists, self.config, [dict(report, tests="Validation: SUCCESS")], self.ledger)
        publish(self.config, self.ledger, lists, lambda *args: {"message": "Checks passed; review PR"})
        self.assertEqual(lists.messages, {"123.1": "Checks passed; review PR"})
        self.assertTrue(self.ledger.get("report:F123:pr:5")["delivered"])

    def test_merged_row_repairs_a_stale_pr_notification(self):
        key = "report:F123:pr:5"
        report = dict(self.task, source="pr:5", status="PR ready", pr="https://github.com/MobaileyProject/sudan-phones/pull/5")
        self.ledger.claim(key, "")
        self.ledger.finish(key, {"task": report, "outcome": "reported", "summary": "PR ready"})
        self.ledger.delivery(key, "123.1")
        self.ledger.delivery(key)
        class Lists:
            def tasks(self, config):
                return [dict(report, status="Done")]
            def update(self, *args):
                raise AssertionError("Already Done row must not be rewritten")
        with patch("slack_automation.worker.command", return_value=json.dumps({"state": "MERGED", "statusCheckRollup": [{"name": "Validation", "conclusion": "SUCCESS"}]})):
            reconcile_merged(self.root, self.config, Lists(), self.ledger)
        result = self.ledger.get(key)
        self.assertFalse(result["delivered"])
        self.assertEqual(result["message_ts"], "123.1")
        self.assertEqual(result["result"]["task"]["status"], "Done")
        self.assertEqual(result["result"]["tests"], "Validation: SUCCESS")

    def test_slack_api_rejections_are_errors_without_echoing_body(self):
        with patch("slack_automation.slack.urlopen") as opened:
            opened.return_value.__enter__.return_value.read.return_value = b'{"ok":false,"error":"missing_scope","secret":"never print"}'
            with self.assertRaisesRegex(RuntimeError, "missing_scope") as error:
                Slack("fake-test-value").call("auth.test")
        self.assertNotIn("never print", str(error.exception))

    def test_pagination_reads_all_rows(self):
        slack = Slack("fake-test-value")
        with patch.object(slack, "call", side_effect=[
            {"ok": True, "items": [{"id": "one"}], "response_metadata": {"next_cursor": "next"}},
            {"ok": True, "items": [{"id": "two"}], "response_metadata": {"next_cursor": ""}},
        ]):
            self.assertEqual([x["id"] for x in slack.rows("F123")], ["one", "two"])

    def test_sync_deduplicates_source_and_never_overwrites_human_status(self):
        class Lists:
            def __init__(self):
                self.items = [{"source": "issue:7", "status": "Ready"}]
            def tasks(self, config):
                return list(self.items)
            def create(self, config, fields):
                self.items.append(fields)
        lists = Lists()
        reports = [{"source": "issue:7", "title": "existing"},
                   {"source": "bug:BUG-2026-001", "title": "new", "kind": "bug"}]
        sync_sources(lists, self.config, reports)
        sync_sources(lists, self.config, reports)
        self.assertEqual(len(lists.items), 2)
        self.assertEqual(lists.items[0]["status"], "Ready")
        self.assertEqual(lists.items[1]["status"], "Backlog")

    def test_timeout_is_saved_and_not_reexecuted(self):
        calls = []
        def launch(*args):
            calls.append(args)
            raise TimeoutError("Agent timed out")
        with patch("slack_automation.worker.prepare_worktree", return_value=self.root):
            execute(self.root, self.config, self.ledger, self.task, launch)
            execute(self.root, self.config, self.ledger, self.task, launch)
        self.assertEqual(len(calls), 1)
        result = self.ledger.get("F123:Rec1")
        self.assertEqual(result["result"]["outcome"], "blocked")
        self.assertFalse(result["delivered"])

    def test_failed_delivery_retries_publication_without_launching_implementation(self):
        self.ledger.claim("F123:Rec1", "fix/slack-abc")
        self.ledger.finish("F123:Rec1", {"outcome": "blocked", "summary": "Needs reproduction", "task": self.task})
        class Lists:
            fail = True
            messages = []
            def update(self, *args):
                pass
            def post(self, channel, text, key):
                if self.fail:
                    raise RuntimeError("Slack unavailable")
                self.messages.append(text)
                return "123.4"
        lists = Lists()
        writer = lambda *args: {"message": "Search needs reproduction steps before agy can fix it."}
        self.assertEqual(len(publish(self.config, self.ledger, lists, writer)), 1)
        self.assertFalse(self.ledger.get("F123:Rec1")["delivered"])
        lists.fail = False
        publish(self.config, self.ledger, lists, writer)
        self.assertTrue(self.ledger.get("F123:Rec1")["delivered"])
        self.assertEqual(len(lists.messages), 1)

    def test_message_retry_never_rewrites_list_status(self):
        self.ledger.claim("F123:Rec1", "fix/slack-abc")
        self.ledger.finish("F123:Rec1", {"outcome": "blocked", "summary": "No reproduction", "task": self.task})
        class Lists:
            updates = 0
            def update(self, *args):
                self.updates += 1
            def post(self, *args):
                raise RuntimeError("Network unavailable")
        lists = Lists()
        writer = lambda *args: {"message": "Need reproduction steps"}
        publish(self.config, self.ledger, lists, writer)
        publish(self.config, self.ledger, lists, writer)
        self.assertEqual(lists.updates, 1)

    def test_bad_pending_row_does_not_block_unrelated_delivery(self):
        for item in ("one", "two"):
            self.ledger.claim(item, "fix/" + item)
            self.ledger.finish(item, {"outcome": "blocked", "summary": "Needs access",
                                      "task": dict(self.task, id=item)})
        class Lists:
            def update(self, config, item, fields):
                if item == "one":
                    raise RuntimeError("Deleted List row")
            def post(self, *args):
                return "123.6"
        errors = publish(self.config, self.ledger, Lists(), lambda *args: {"message": "Needs access"})
        self.assertEqual(len(errors), 1)
        self.assertTrue(self.ledger.get("two")["delivered"])
        self.assertFalse(self.ledger.get("one")["delivered"])

    def test_imported_bug_has_one_durable_channel_notification(self):
        class Lists:
            items = []
            messages = []
            def tasks(self, config):
                return list(self.items)
            def create(self, config, fields):
                self.items.append(fields)
            def update(self, *args):
                raise AssertionError("A report notification must not mutate an existing row")
            def post(self, channel, text, key):
                self.messages.append((channel, text))
                return "123.5"
        lists = Lists()
        reports = [{"source": "bug:BUG-2026-004", "title": "Search fails", "kind": "bug"}]
        sync_sources(lists, self.config, reports, self.ledger)
        publish(self.config, self.ledger, lists, lambda *args: {"message": "Search failure is in the backlog; add reproduction steps."})
        sync_sources(lists, self.config, reports, self.ledger)
        publish(self.config, self.ledger, lists, lambda *args: self.fail("Message was regenerated"))
        self.assertEqual(lists.messages, [("C2", "Search failure is in the backlog; add reproduction steps.")])

    def test_old_ci_failures_are_not_imported_after_newer_success(self):
        runs = [{"databaseId": 20, "conclusion": "success", "workflowName": "CI", "displayTitle": "Latest", "url": "https://example.invalid/20"},
                {"databaseId": 19, "conclusion": "failure", "workflowName": "CI", "displayTitle": "Old", "url": "https://example.invalid/19"},
                {"databaseId": 18, "conclusion": "failure", "workflowName": "Other", "displayTitle": "Current failure", "url": "https://example.invalid/18"}]
        def fixture(root, *args):
            return json.dumps(runs if args[:3] == ("gh", "run", "list") else [])
        with patch("slack_automation.worker.command", side_effect=fixture):
            reports = collect_sources(self.root, self.config)
        self.assertEqual([r["source"] for r in reports], ["ci:18"])

    def test_worktree_executes_on_fresh_main_without_touching_original_branch(self):
        from slack_automation.worker import command as real_command
        def git(*args):
            return subprocess.run(["git", *args], cwd=self.root, text=True,
                                  capture_output=True, check=True).stdout.strip()
        git("init", "-b", "main")
        git("config", "user.email", "test@example.invalid")
        git("config", "user.name", "Worker Test")
        (self.root / ".gitignore").write_text(".worktrees/\nworker.db\n")
        (self.root / "AGENTS.md").write_text("Test contract")
        for i in range(14):
            skill = self.root / ".agents" / "skills" / str(i) / "SKILL.md"
            skill.parent.mkdir(parents=True)
            skill.write_text("Test skill")
        git("add", ".gitignore", "AGENTS.md", ".agents")
        git("commit", "-m", "test baseline")
        git("update-ref", "refs/remotes/origin/main", "HEAD")
        git("switch", "-c", "feature/human")
        (self.root / "untracked.txt").write_text("Preserve me")
        def local_remote(root, *args):
            if args == ("git", "remote", "get-url", "origin"):
                return "git@github.com:MobaileyProject/sudan-phones.git"
            if args == ("git", "fetch", "origin", "--prune"):
                return ""
            return real_command(root, *args)
        with patch("slack_automation.worker.command", side_effect=local_remote):
            worktree = prepare_worktree(self.root, self.config, "fix/slack-test")
        self.assertEqual(git("branch", "--show-current"), "feature/human")
        self.assertEqual((self.root / "untracked.txt").read_text(), "Preserve me")
        self.assertTrue((worktree / "AGENTS.md").exists())
        self.assertEqual(real_command(worktree, "git", "branch", "--show-current"), "fix/slack-test")


if __name__ == "__main__":
    unittest.main()
