#!/usr/bin/env python3
"""Poll Slack Lists, execute one ready task, and deliver contextual results."""
import argparse
import json
import os
from pathlib import Path
import shutil
import sys

from slack_automation.agent import run_agent
from slack_automation.core import Ledger, eligible, lock
from slack_automation.slack import Slack
from slack_automation.setup import credential, create_backlog
from slack_automation.worker import check_skills, collect_sources, command, execute, publish, reconcile_merged, sync_sources

ROOT = Path(__file__).resolve().parents[1]


def load_config(path):
    config = json.loads(path.read_text())
    if config.get("repo") != "MobaileyProject/sudan-phones" or config.get("workspace") != "T0CJRU4RSUQ":
        raise ValueError("Configuration must target the Sudan Phones repository and Slack workspace")
    if config.get("execution_enabled", False) not in (True, False):
        raise ValueError("execution_enabled must be a boolean")
    return config


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["doctor", "sync", "once", "status", "retry-delivery", "schema", "create-list"])
    parser.add_argument("--config", type=Path, default=ROOT / ".slack-worker.json")
    args = parser.parse_args()
    state = ROOT / ".slack-worker"
    with lock(state / "lock"):
        config = load_config(args.config)
        ledger = Ledger(state / "jobs.db")
        try:
            if args.action == "status":
                rows = ledger.db.execute("SELECT key,branch,result IS NOT NULL,delivered FROM jobs").fetchall()
                print(json.dumps([dict(key=r[0], branch=r[1], has_result=bool(r[2]), delivered=bool(r[3])) for r in rows], indent=2))
                return
            if args.action == "doctor":
                print("agy available:", bool(shutil.which(config.get("agy", "agy"))))
                print("gh available:", bool(shutil.which("gh")))
                print("Execution enabled:", config.get("execution_enabled") is True)
            slack = Slack(credential(config))
            if slack.call("auth.test").get("team_id") != config["workspace"]:
                raise RuntimeError("Slack credential belongs to a different workspace")
            if args.action == "create-list":
                print("Created and shared List:", create_backlog(slack, config, args.config))
                return
            if not config.get("list_id"):
                raise ValueError("Set the existing Slack list_id in local configuration")
            if args.action == "schema":
                response = slack.call("slackLists.items.list", list_id=config["list_id"], limit=1, include_list=True)
                parent = response.get("list", {})
                print(json.dumps({"id": parent.get("id"), "title": parent.get("title"),
                                  "schema": parent.get("schema") or parent.get("list_metadata", {}).get("schema")}, indent=2))
                return
            required = {"title", "kind", "status", "executor", "details", "acceptance", "source", "branch", "pr", "result"}
            if not required.issubset(config.get("columns", {})):
                raise ValueError("Map all required automation columns first; see docs/SLACK_AUTOMATION.md")
            writer = lambda prompt, fields: run_agent(ROOT, config, prompt, fields)
            if args.action == "doctor":
                slack.tasks(config)
                command(ROOT, "gh", "repo", "view", config["repo"], "--json", "nameWithOwner")
                print("Slack workspace/List read and GitHub access verified; writes/agy execution not tested")
                return
            if args.action == "retry-delivery":
                errors = publish(config, ledger, slack, writer)
                if errors:
                    raise RuntimeError("Pending deliveries: " + "; ".join(errors))
                return
            count = sync_sources(slack, config, collect_sources(ROOT, config), ledger)
            print("New backlog reports:", count)
            reconcile_merged(ROOT, config, slack, ledger)
            errors = publish(config, ledger, slack, writer)
            if args.action == "once":
                for task in slack.tasks(config):
                    key = config["list_id"] + ":" + task["id"]
                    if eligible(task, config) and ledger.get(key) is None:
                        # Missing baseline skills must not consume a Ready item's claim.
                        check_skills(ROOT, config)
                        execute(ROOT, config, ledger, task, lists=slack)
                        errors.extend(publish(config, ledger, slack, writer))
                        break
            if errors:
                raise RuntimeError("Pending deliveries: " + "; ".join(errors))
        finally:
            ledger.db.close()


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError, KeyError) as error:
        print("Slack worker blocked:", error, file=sys.stderr)
        raise SystemExit(1)
