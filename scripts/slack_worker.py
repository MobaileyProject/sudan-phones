#!/usr/bin/env python3
"""Poll Slack Lists, execute one ready task, and deliver contextual results."""
import argparse
import json
import os
from pathlib import Path
import shutil
import sys

from slack_automation.agent import run_agent
from slack_automation.core import Ledger, lock
from slack_automation.slack import Slack
from slack_automation.setup import credential, create_backlog
from slack_automation.worker import command, poll, publish
from slack_automation.routing import contexts, validate_columns, validate_routes, verify_lists

ROOT = Path(__file__).resolve().parents[1]


def load_config(path):
    config = json.loads(path.read_text())
    if config.get("repo") != "MobaileyProject/sudan-phones" or config.get("workspace") != "T0CJRU4RSUQ":
        raise ValueError("Configuration must target the Sudan Phones repository and Slack workspace")
    validate_routes(config)
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
            for context in contexts(config):
                validate_columns(context.get("columns"), context["list_id"])
            writer = lambda prompt, fields: run_agent(ROOT, config, prompt, fields)
            if args.action == "doctor":
                verify_lists(config, slack)
                command(ROOT, "gh", "repo", "view", config["repo"], "--json", "nameWithOwner")
                print("Slack workspace/all registered List schemas and reads plus GitHub access verified; writes/agy execution not tested")
                return
            if args.action == "retry-delivery":
                errors = publish(config, ledger, slack, writer)
                if errors:
                    raise RuntimeError("Pending deliveries: " + "; ".join(errors))
                return
            count, errors = poll(ROOT, config, ledger, slack, writer, execute_ready=args.action == "once")
            print("New backlog reports:", count)
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
