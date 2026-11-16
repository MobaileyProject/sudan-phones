"""List contexts inherit worker authority; only identity/schema are per List."""
import re

REQUIRED_COLUMNS = {"title", "kind", "status", "executor", "details", "acceptance",
                    "source", "branch", "pr", "result"}


def validate_columns(columns, list_id):
    if not isinstance(columns, dict) or not REQUIRED_COLUMNS.issubset(columns):
        raise ValueError(f"Map all required automation columns for List {list_id}")
    ids = set()
    for column in columns.values():
        if (not isinstance(column, dict) or not isinstance(column.get("id"), str)
                or not column["id"] or column["id"] in ids
                or column.get("type") not in {"text", "select"}):
            raise ValueError(f"Invalid automation column mapping for List {list_id}")
        ids.add(column["id"])
        if column["type"] == "select":
            values = column.get("values")
            if (not isinstance(values, dict) or not values
                    or any(not isinstance(k, str) or not isinstance(v, str) or not v for k, v in values.items())
                    or len(set(values.values())) != len(values)):
                raise ValueError(f"Invalid select mapping for List {list_id}")


def validate_routes(config):
    if type(config.get("execution_enabled", False)) is not bool:
        raise ValueError("execution_enabled must be a boolean")
    projects = config.get("project_lists", [])
    if not isinstance(projects, list):
        raise ValueError("project_lists must be an array")
    seen = {config.get("list_id")}
    for project in projects:
        if not isinstance(project, dict) or set(project) - {"list_id", "columns", "execution_enabled"}:
            raise ValueError("Project Lists accept only list_id, columns and execution_enabled")
        list_id = project.get("list_id")
        if not isinstance(list_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", list_id) or list_id in seen:
            raise ValueError("Project List IDs must be nonempty and unique")
        seen.add(list_id)
        if type(project.get("execution_enabled", False)) is not bool:
            raise ValueError("Project execution_enabled must be a boolean")
        validate_columns(project.get("columns"), list_id)


def contexts(config):
    """Root first, then registered projects; root execution is a global stop."""
    primary = {key: value for key, value in config.items() if key != "project_lists"}
    result = [primary]
    for project in config.get("project_lists", []):
        result.append(dict(primary, list_id=project["list_id"], columns=project["columns"],
                           execution_enabled=(config.get("execution_enabled") is True
                                              and project.get("execution_enabled") is True)))
    return result


def task_context(config, task):
    target = task.get("list_id", config["list_id"])
    for context in contexts(config):
        if context["list_id"] == target:
            return context
    raise ValueError(f"Task targets an unregistered List: {target}")


def verify_lists(config, lists):
    """Doctor verifies live column identity/types/options and row read access."""
    for context in contexts(config):
        list_id = context["list_id"]
        validate_columns(context.get("columns"), list_id)
        parent = lists.call("slackLists.items.list", list_id=list_id, limit=1, include_list=True).get("list", {})
        schema = parent.get("schema") or parent.get("list_metadata", {}).get("schema") or []
        actual = {column["id"]: column for column in schema}
        for column in context["columns"].values():
            live = actual.get(column["id"], {})
            if live.get("type") != column["type"]:
                raise ValueError(f"List {list_id} schema does not match configured columns")
            if column["type"] == "select":
                choices = {choice["value"] for choice in live.get("options", {}).get("choices", [])}
                if not set(column["values"].values()).issubset(choices):
                    raise ValueError(f"List {list_id} select options do not match configuration")
        lists.tasks(context)
