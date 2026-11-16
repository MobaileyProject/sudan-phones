"""Explicit one-time List setup and credential transport, without secret output."""
import json
import os
from pathlib import Path

from .slack import rich_text


def credential(config):
    token = os.environ.get("SLACK_BOT_TOKEN")
    if token:
        return token
    if config.get("credential_source") == "agy-mcp":
        # Consume only the configured server environment, never a skill/transcript.
        # The value stays in this process and is never returned to an AI prompt.
        path = Path.home() / ".gemini/config/mcp_config.json"
        data = json.loads(path.read_text())
        return data.get("mcpServers", {}).get("slack", {}).get("env", {}).get("SLACK_BOT_TOKEN")
    return None


def save_config(path, config):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(config, indent=2) + "\n")
    temporary.chmod(0o600)
    temporary.replace(path)


def create_backlog(slack, config, path):
    if config.get("list_id") and not config.get("creation_pending"):
        raise RuntimeError("A List is already configured; refusing to create a duplicate")
    if config.get("creation_pending") and not config.get("list_id"):
        raise RuntimeError("Previous List creation is uncertain; inspect Slack before clearing creation_pending")
    labels = {"title": "Task", "kind": "Type", "priority": "Priority", "status": "Status",
              "owner": "Owner", "executor": "Executor", "details": "Details / reproduction",
              "acceptance": "Acceptance criteria", "source": "Source key", "branch": "Branch",
              "pr": "Pull request", "result": "Latest result"}
    selections = {
        "kind": [("bug", "bug", "red"), ("feature", "feature", "blue")],
        "priority": [("critical", "Critical", "red"), ("high", "High", "orange"),
                     ("medium", "Medium", "yellow"), ("low", "Low", "gray")],
        "status": [("backlog", "Backlog", "gray"), ("ready", "Ready", "blue"),
                   ("in_progress", "In progress", "yellow"), ("blocked", "Blocked", "red"),
                   ("pr_ready", "PR ready", "purple"), ("done", "Done", "green")],
    }
    schema = []
    for key, label in labels.items():
        column = {"key": key, "name": label, "type": "user" if key == "owner" else "text"}
        if key == "title":
            column["is_primary_column"] = True
        if key in selections:
            column.update(type="select", options={"choices": [
                {"value": value, "label": text, "color": color} for value, text, color in selections[key]]})
        schema.append(column)
    result = {}
    if not config.get("list_id"):
        config.update(creation_pending=True, execution_enabled=False)
        save_config(path, config)
        result = slack.call("slackLists.create", name="Sudan Phones Backlog", schema=schema,
                            description_blocks=rich_text("Bugs and features for Sudan Phones. Add details and acceptance criteria; set Executor to agy and Status to Ready to authorize one implementation. PR ready means awaiting personal review; Done means merged."))
        config["list_id"] = result["list_id"]
        # Persist the returned ID before schema discovery/sharing can fail.
        save_config(path, config)
    columns = result.get("list_metadata", {}).get("schema")
    if not columns:
        parent = slack.call("slackLists.items.list", list_id=config["list_id"], limit=1,
                            include_list=True)["list"]
        columns = parent.get("schema") or parent["list_metadata"]["schema"]
    config["columns"] = {}
    for column in columns:
        key = column.get("key")
        if key in labels and key != "owner":
            mapped = {"id": column["id"], "type": column["type"]}
            if column["type"] == "select":
                mapped["values"] = {x["label"]: x["value"] for x in column["options"]["choices"]}
            config["columns"][key] = mapped
    save_config(path, config)
    slack.call("slackLists.access.set", list_id=config["list_id"], access_level="write",
               channel_ids=[config["channels"]["bugs"]])
    if config.get("founder_user_ids"):
        slack.call("slackLists.access.set", list_id=config["list_id"], access_level="write",
                   user_ids=config["founder_user_ids"])
    config.pop("creation_pending", None)
    save_config(path, config)
    return config["list_id"]
