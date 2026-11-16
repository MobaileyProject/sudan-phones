"""Slack transport. Tokens stay in the worker environment, never in prompts."""
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import uuid


def rich_text(value):
    return [{"type": "rich_text", "elements": [{"type": "rich_text_section", "elements": [
        {"type": "text", "text": value}]}]}]


def encode(column, value):
    cell = {"column_id": column["id"]}
    if column["type"] == "select":
        if value not in column["values"]:
            raise ValueError("List select option is not configured")
        cell["select"] = [column["values"][value]]
    elif column["type"] == "text":
        cell["rich_text"] = rich_text(str(value))
    else:
        raise ValueError("Only text and select automation columns are supported")
    return cell


def decode(column, field):
    if column["type"] == "select":
        values = field.get("select", [])
        reverse = {v: k for k, v in column["values"].items()}
        return reverse.get(values[0], "") if len(values) == 1 else ""
    def flatten(node):
        if isinstance(node, list):
            return "".join(flatten(x) for x in node)
        if isinstance(node, dict):
            return node.get("text", "") if node.get("type") == "text" else flatten(node.get("elements", []))
        return ""
    return field.get("text") or flatten(field.get("rich_text", []))


class Slack:
    def __init__(self, token):
        if not token:
            raise RuntimeError("SLACK_BOT_TOKEN is missing; configure it outside the repository")
        self.token = token

    def call(self, method, **payload):
        request = Request("https://slack.com/api/" + method,
                          data=json.dumps(payload).encode(), method="POST",
                          headers={"Authorization": "Bearer " + self.token,
                                   "Content-Type": "application/json; charset=utf-8"})
        try:
            with urlopen(request, timeout=30) as response:
                result = json.loads(response.read())
        except HTTPError as error:
            raise RuntimeError(f"Slack HTTP {error.code}; delivery may be uncertain, inspect before retry") from None
        except (URLError, TimeoutError):
            raise RuntimeError("Slack network failure; inspect remote state before retry") from None
        if not result.get("ok"):
            code = result.get("error", "unknown_error")
            safe_code = code if isinstance(code, str) and re.fullmatch(r"[a-z_]+", code) else "unknown_error"
            raise RuntimeError("Slack rejected request: " + safe_code)
        return result

    def rows(self, list_id):
        rows, cursor, seen = [], "", set()
        while True:
            result = self.call("slackLists.items.list", list_id=list_id, limit=100, cursor=cursor)
            rows.extend(result["items"])
            cursor = result.get("response_metadata", {}).get("next_cursor", "")
            if not cursor:
                return rows
            if cursor in seen:
                raise RuntimeError("Slack repeated a pagination cursor")
            seen.add(cursor)

    def tasks(self, config):
        tasks = []
        for row in self.rows(config["list_id"]):
            fields = {f.get("column_id", f.get("key")): f for f in row.get("fields", [])}
            task = {name: decode(column, fields.get(column["id"], {}))
                    for name, column in config["columns"].items()}
            task.update(id=row["id"], list_id=row.get("list_id", config["list_id"]))
            tasks.append(task)
        return tasks

    def create(self, config, fields):
        return self.call("slackLists.items.create", list_id=config["list_id"], initial_fields=[
            encode(config["columns"][name], value) for name, value in fields.items()
            if name in config["columns"] and value != ""])

    def update(self, config, item, fields):
        cells = [dict(encode(config["columns"][name], value), row_id=item)
                 for name, value in fields.items() if name in config["columns"]]
        if cells:
            self.call("slackLists.items.update", list_id=config["list_id"], cells=cells)

    def post(self, channel, text, key):
        # Stable client message ID reduces duplicate messages after ambiguous delivery.
        result = self.call("chat.postMessage", channel=channel, text=text,
                           client_msg_id=str(uuid.uuid5(uuid.NAMESPACE_URL, key)),
                           parse="none", unfurl_links=False, unfurl_media=False)
        if not result.get("ts"):
            raise RuntimeError("Slack did not return message delivery evidence")
        return result["ts"]
