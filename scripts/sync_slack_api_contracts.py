#!/usr/bin/env python3
"""Synchronize implemented backend API contracts to the Slack API Contracts List (F0CHJB5C939).

Whenever an API endpoint is implemented or modified in backend:
- If the API already exists in Slack: update it with full documentation, stage/phase,
  how to use it, input formula (method, path, headers, query/body schema), output formula
  (status codes, response JSON envelope, error envelope, headers), and change status
  from Proposed to 'Backend ready'.
- If the API is not yet listed in Slack: add it as a new row with complete documentation,
  formulas, stage, and set status to 'Backend ready'.
"""
import argparse
import json
import os
from pathlib import Path
import sys

# Ensure repository root is on sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from slack_automation.setup import credential
from slack_automation.slack import Slack, rich_text

LIST_ID = "F0CHJB5C939"

COLUMNS = {
    "title": "Col0CHUDNAL4V",      # Text: API operation, e.g. API-019: GET /api/v1/config
    "domain": "Col0CHZGSKWTC",     # Text: Backend work, e.g. Step 2 (P2) · BE-02: Configuration & Localization
    "owner": "Col0CJ3DH185S",      # User: Backend owner
    "frontend": "Col0CHXP92ZU6",   # Text: Frontend consumer
    "status": "Col0CJ1K2DPQ9",     # Select: Proposed | Agreed | Backend ready | Integrated | Deferred | Blocked
    "priority": "Col0CJU3V4XT2",   # Text: Scope / Stage & Purpose
    "screens": "Col0CHTFHFNTV",    # Text: Screen consumers
    "inputs": "Col0CHJB5JBHV",     # Text: Inputs to agree (Input formula)
    "response": "Col0CHUDNFYCD",   # Text: Response content to agree (Output formula)
    "auth": "Col0CHZGSR6PL",       # Text: Access / authorization
    "query": "Col0CJ3DH7LF6",      # Text: How to use it / Curl example
    "gate": "Col0CHXP99WMC",       # Text: Implementation notes & links
    "source": "Col0CJ1K2NE9F",     # Text: Source key
}

# Canonical specifications of implemented backend APIs (with detailed overrides)
KNOWN_SPECS = {
    "API-019": {
        "api_id": "API-019",
        "method": "GET",
        "path": "/api/v1/config",
        "title": "API-019: GET /api/v1/config",
        "stage": "Step 2 (P2: Foundation)",
        "domain": "Step 2 (P2) · BE-02: Configuration & Localization",
        "owner": "U0CHXBNE6F4",
        "frontend": "Flutter Customer App, React Portal",
        "screens": "C-00, C-09",
        "status": "Backend ready",
        "scope": (
            "Step 2 (P2: Foundation) · Bootstrap configuration API. "
            "Returns system API version, minimum app version, SDG currency precision (2 decimals), "
            "default and supported locales (ar, en) with RTL/LTR layout direction, three pilot cities "
            "(Port Sudan, Khartoum, Omdurman), and MVP feature flags."
        ),
        "inputs": (
            "Input formula:\n"
            "Method: GET\n"
            "Canonical path: /api/v1/config (no trailing slash)\n"
            "Headers:\n"
            "  - Accept-Language: ar-SD | en-US (optional; negotiated fallback to ar)\n"
            "Query parameters:\n"
            "  - locale: string (optional, enum: [\"ar\", \"en\"]). Explicit query overrides Accept-Language.\n"
            "Request body: None\n"
            "Validation rules:\n"
            "  - Unknown, empty, or duplicate query parameters return 400 VALIDATION_ERROR."
        ),
        "response": (
            "Output formula:\n"
            "Status 200 OK:\n"
            "{\n"
            "  \"data\": {\n"
            "    \"api_version\": \"1.0.0\",\n"
            "    \"minimum_app_version\": \"1.0.0\",\n"
            "    \"currency\": {\"code\": \"SDG\", \"decimal_places\": 2},\n"
            "    \"default_locale\": \"ar\",\n"
            "    \"supported_locales\": [\"ar\", \"en\"],\n"
            "    \"locale\": \"ar\",\n"
            "    \"direction\": \"rtl\",\n"
            "    \"cities\": [\n"
            "      {\"id\": \"port_sudan\", \"name\": \"بورتسودان\"},\n"
            "      {\"id\": \"khartoum\", \"name\": \"الخرطوم\"},\n"
            "      {\"id\": \"omdurman\", \"name\": \"أم درمان\"}\n"
            "    ],\n"
            "    \"features\": {\n"
            "      \"customer_accounts\": false,\n"
            "      \"payments\": false,\n"
            "      \"paid_ads\": false\n"
            "    }\n"
            "  }\n"
            "}\n"
            "Error envelopes:\n"
            "  - 400 VALIDATION_ERROR: {\"error\": {\"code\": \"VALIDATION_ERROR\", \"message\": \"...\", \"details\": [{\"field\": \"locale\", \"code\": \"invalid_choice\", \"message\": \"Invalid value\"}]}}\n"
            "  - 404 NOT_FOUND: Unknown versioned path or trailing slash\n"
            "  - 405 METHOD_NOT_ALLOWED: Method not in (GET, HEAD, OPTIONS)\n"
            "  - 500 INTERNAL_ERROR: Generic server error\n"
            "Headers:\n"
            "  - X-Request-ID: UUID\n"
            "  - Content-Language: ar | en\n"
            "  - Cache-Control: public, max-age=300\n"
            "  - Vary: Accept-Language"
        ),
        "auth": "Public — no authentication required.",
        "how_to_use": (
            "How to use:\n"
            "Fetch on app entry (Screen C-00) before presenting UI to configure currency, language layout direction, supported cities, and feature flags.\n"
            "Curl:\n"
            "curl -i 'http://127.0.0.1:8000/api/v1/config?locale=ar'"
        ),
        "gate": "Implemented in PR #19 (BE-02 / Step 2). OpenAPI: docs/openapi.json #/paths/~1api~1v1~1config. Tests: backend/core/tests/test_bootstrap.py",
        "source": "souq-blueprint:v1:api:438189941e90976a",
    },
    "API-021": {
        "api_id": "API-021",
        "method": "GET",
        "path": "/api/v1/i18n/bundle",
        "title": "API-021: GET /api/v1/i18n/bundle",
        "stage": "Step 2 (P2: Foundation)",
        "domain": "Step 2 (P2) · BE-02: Configuration & Localization",
        "owner": "U0CHXBNE6F4",
        "frontend": "Flutter Customer App, React Portal",
        "screens": "C-00, C-09",
        "status": "Backend ready",
        "scope": (
            "Step 2 (P2: Foundation) · Bootstrap localization bundle API. "
            "Returns server bootstrap translation dictionary for Arabic (RTL) and English (LTR) "
            "with bundle versioning, loading states, offline retry, and error messages."
        ),
        "inputs": (
            "Input formula:\n"
            "Method: GET\n"
            "Canonical path: /api/v1/i18n/bundle (no trailing slash)\n"
            "Headers:\n"
            "  - Accept-Language: ar-SD | en-US (optional; negotiated fallback to ar)\n"
            "Query parameters:\n"
            "  - locale: string (optional, enum: [\"ar\", \"en\"]). Overrides Accept-Language.\n"
            "Request body: None\n"
            "Validation rules:\n"
            "  - Unknown, empty, or duplicate query parameters return 400 VALIDATION_ERROR."
        ),
        "response": (
            "Output formula:\n"
            "Status 200 OK:\n"
            "{\n"
            "  \"data\": {\n"
            "    \"locale\": \"ar\",\n"
            "    \"direction\": \"rtl\",\n"
            "    \"version\": \"1\",\n"
            "    \"strings\": {\n"
            "      \"common.retry\": \"حاول مرة أخرى\",\n"
            "      \"network.offline\": \"لا يوجد اتصال بالإنترنت\",\n"
            "      \"error.server\": \"حدث خطأ غير متوقع\",\n"
            "      \"loading.default\": \"جاري التحميل...\"\n"
            "    }\n"
            "  }\n"
            "}\n"
            "Error envelopes:\n"
            "  - 400 VALIDATION_ERROR: {\"error\": {\"code\": \"VALIDATION_ERROR\", \"message\": \"...\", \"details\": [{\"field\": \"locale\", \"code\": \"invalid_choice\", \"message\": \"Invalid value\"}]}}\n"
            "  - 404 NOT_FOUND: Unknown versioned path or trailing slash\n"
            "  - 405 METHOD_NOT_ALLOWED: Method not in (GET, HEAD, OPTIONS)\n"
            "  - 500 INTERNAL_ERROR: Generic server error\n"
            "Headers:\n"
            "  - X-Request-ID: UUID\n"
            "  - Content-Language: ar | en\n"
            "  - Cache-Control: public, max-age=300\n"
            "  - Vary: Accept-Language"
        ),
        "auth": "Public — no authentication required.",
        "how_to_use": (
            "How to use:\n"
            "Fetch on app entry (Screen C-00) or on locale toggle to populate localized UI labels and error messages.\n"
            "Curl:\n"
            "curl -i -H 'Accept-Language: ar-SD' 'http://127.0.0.1:8000/api/v1/i18n/bundle'"
        ),
        "gate": "Implemented in PR #19 (BE-02 / Step 2). OpenAPI: docs/openapi.json #/paths/~1api~1v1~1i18n~1bundle. Tests: backend/core/tests/test_bootstrap.py",
        "source": "souq-blueprint:v1:api:1054e739dce05b5d",
    },
    "API-061": {
        "api_id": "API-061",
        "method": "GET",
        "path": "/api/v1/health",
        "title": "API-061: GET /api/v1/health",
        "stage": "Step 2 (P2: Foundation)",
        "domain": "Step 2 (P2) · BE-02: Configuration & Localization",
        "owner": "U0CHXBNE6F4",
        "frontend": "Infrastructure, Reverse Proxy, Mobile / Web clients",
        "screens": "C-00, Infrastructure",
        "status": "Backend ready",
        "scope": (
            "Step 2 (P2: Foundation) · Service liveness probe. "
            "Verifies process liveness, HTTP stack responsiveness, and core runtime availability without database dependencies."
        ),
        "inputs": (
            "Input formula:\n"
            "Method: GET\n"
            "Canonical path: /api/v1/health (no trailing slash)\n"
            "Headers: None required\n"
            "Query parameters: None\n"
            "Request body: None\n"
            "Validation rules: No query or body parameters accepted."
        ),
        "response": (
            "Output formula:\n"
            "Status 200 OK:\n"
            "{\n"
            "  \"data\": {\n"
            "    \"status\": \"ok\"\n"
            "  }\n"
            "}\n"
            "Error envelopes:\n"
            "  - 405 METHOD_NOT_ALLOWED: Method not in (GET, HEAD, OPTIONS)\n"
            "  - 500 INTERNAL_ERROR: Internal server error\n"
            "Headers:\n"
            "  - X-Request-ID: UUID\n"
            "  - Cache-Control: no-store"
        ),
        "auth": "Public — no authentication required.",
        "how_to_use": (
            "How to use:\n"
            "Used by load balancers, uptime monitors, Docker/k8s probes, and clients to check server liveness.\n"
            "Curl:\n"
            "curl -i 'http://127.0.0.1:8000/api/v1/health'"
        ),
        "gate": "Implemented in PR #19 (BE-02 / Step 2). OpenAPI: docs/openapi.json #/paths/~1api~1v1~1health. Tests: backend/core/tests/test_bootstrap.py",
        "source": "souq-blueprint:v1:api:API-061",
    },
}

IMPLEMENTED_APIS = list(KNOWN_SPECS.values())


def build_spec_from_openapi(api_id, method, path, phase, openapi, blueprint_manifest=None):
    """Automatically synthesize a 10-field API contract spec directly from OpenAPI."""
    op = openapi.get("paths", {}).get(path, {}).get(method.lower(), {})
    summary = op.get("summary") or op.get("description") or f"{method.upper()} {path} operation"
    tags = op.get("tags", [])
    tag_name = tags[0] if tags else "API"

    blueprint_api = {}
    if blueprint_manifest and "apis" in blueprint_manifest:
        for b_api in blueprint_manifest["apis"]:
            if b_api.get("key") == api_id or (b_api.get("method") == method.upper() and b_api.get("path") == path):
                blueprint_api = b_api
                break

    screens = ", ".join(blueprint_api.get("screen_consumers", [])) or "All clients"
    auth_req = "Public — no authentication required." if op.get("security") is None else "Authenticated endpoint."

    inputs_lines = [
        "Input formula:",
        f"Method: {method.upper()}",
        f"Canonical path: {path} (no trailing slash)",
    ]
    headers, queries = [], []
    for param in op.get("parameters", []):
        p_in = param.get("in")
        p_name = param.get("name")
        p_type = param.get("schema", {}).get("type", "string")
        p_enum = param.get("schema", {}).get("enum")
        enum_str = f", enum: {p_enum}" if p_enum else ""
        req_str = "required" if param.get("required") else "optional"
        if p_in == "header":
            headers.append(f"  - {p_name}: {p_type} ({req_str}{enum_str})")
        elif p_in == "query":
            queries.append(f"  - {p_name}: {p_type} ({req_str}{enum_str})")

    if headers:
        inputs_lines.append("Headers:")
        inputs_lines.extend(headers)
    else:
        inputs_lines.append("Headers: None required")

    if queries:
        inputs_lines.append("Query parameters:")
        inputs_lines.extend(queries)
    else:
        inputs_lines.append("Query parameters: None")

    if "requestBody" in op:
        content = op["requestBody"].get("content", {}).get("application/json", {})
        schema_ref = content.get("schema", {}).get("$ref", "")
        inputs_lines.append(f"Request body: JSON ({schema_ref.split('/')[-1] if schema_ref else 'object'})")
    else:
        inputs_lines.append("Request body: None")

    resp_lines = ["Output formula:"]
    for code, resp in op.get("responses", {}).items():
        desc = resp.get("description", "")
        content = resp.get("content", {}).get("application/json", {})
        schema_ref = content.get("schema", {}).get("$ref", "")
        ref_name = f" ({schema_ref.split('/')[-1]})" if schema_ref else ""
        resp_lines.append(f"Status {code}: {desc or 'Response'}{ref_name}")

    resp_headers = []
    for code, resp in op.get("responses", {}).items():
        for h_name in resp.get("headers", {}):
            if f"  - {h_name}" not in resp_headers:
                resp_headers.append(f"  - {h_name}")
    if resp_headers:
        resp_lines.append("Response headers:")
        resp_lines.extend(resp_headers)

    how_to_use = (
        f"How to use:\n"
        f"Call {method.upper()} {path} for {tag_name} operations.\n"
        f"Curl:\n"
        f"curl -i -X {method.upper()} 'http://127.0.0.1:8000{path}'"
    )

    stage_str = f"Step {phase} ({phase})" if phase else "Backend"

    return {
        "api_id": api_id,
        "method": method.upper(),
        "path": path,
        "title": f"{api_id}: {method.upper()} {path}",
        "stage": stage_str,
        "domain": f"{stage_str} · {tag_name.capitalize()}",
        "owner": "U0CHXBNE6F4",
        "frontend": "Flutter Customer App, React Portal",
        "screens": screens,
        "status": "Backend ready",
        "scope": f"{stage_str} · {summary}",
        "inputs": "\n".join(inputs_lines),
        "response": "\n".join(resp_lines),
        "auth": auth_req,
        "how_to_use": how_to_use,
        "gate": f"Implemented in backend. OpenAPI: docs/openapi.json #/paths/~1{path.replace('/', '~1')}",
        "source": blueprint_api.get("source") or f"souq-blueprint:v1:api:{api_id}",
    }


def get_implemented_apis(root=ROOT):
    """Retrieve all implemented API specs, synthesizing any new endpoints from OpenAPI."""
    ops_file = root / "docs/api/operations.json"
    if not ops_file.is_file():
        return list(KNOWN_SPECS.values())

    operations = json.loads(ops_file.read_text(encoding="utf-8"))
    openapi_file = root / "docs/openapi.json"
    openapi = json.loads(openapi_file.read_text(encoding="utf-8")) if openapi_file.is_file() else {}

    manifest_file = root / "docs/plans/slack-plan-manifest.json"
    manifest = json.loads(manifest_file.read_text(encoding="utf-8")) if manifest_file.is_file() else {}

    specs = []
    for op in operations:
        api_id = op["api_id"]
        if api_id in KNOWN_SPECS:
            specs.append(KNOWN_SPECS[api_id])
        else:
            specs.append(build_spec_from_openapi(
                api_id=api_id,
                method=op["method"],
                path=op["path"],
                phase=op.get("phase", ""),
                openapi=openapi,
                blueprint_manifest=manifest,
            ))
    return specs


def load_worker_config(root=ROOT):
    candidates = [
        root / ".slack-worker.json",
        root / ".worktrees/slack-agent-automation/.slack-worker.json",
        root.parent.parent / ".worktrees/slack-agent-automation/.slack-worker.json" if len(root.parents) >= 2 else None,
        root.parent / ".worktrees/slack-agent-automation/.slack-worker.json" if len(root.parents) >= 1 else None,
        root / "config/slack-worker.example.json",
    ]
    for path in candidates:
        if path and path.is_file():
            try:
                cfg = json.loads(path.read_text(encoding="utf-8"))
                if cfg.get("credential_source") or cfg.get("list_id"):
                    return cfg
            except Exception:
                continue
    # Default to agy-mcp credential source if mcp_config.json exists
    mcp_config = Path.home() / ".gemini/config/mcp_config.json"
    if mcp_config.is_file():
        return {"credential_source": "agy-mcp", "workspace": "T0CJRU4RSUQ"}
    return {}


def encode_item_fields(spec, row_id=None):
    """Encode an API contract spec into Slack List cells or initial_fields."""
    fields = [
        {"column_id": COLUMNS["title"], "rich_text": rich_text(spec["title"])},
        {"column_id": COLUMNS["domain"], "rich_text": rich_text(spec["domain"])},
        {"column_id": COLUMNS["owner"], "user": [spec["owner"]]},
        {"column_id": COLUMNS["frontend"], "rich_text": rich_text(spec["frontend"])},
        {"column_id": COLUMNS["status"], "select": [spec["status"]]},
        {"column_id": COLUMNS["priority"], "rich_text": rich_text(spec["scope"])},
        {"column_id": COLUMNS["screens"], "rich_text": rich_text(spec["screens"])},
        {"column_id": COLUMNS["inputs"], "rich_text": rich_text(spec["inputs"])},
        {"column_id": COLUMNS["response"], "rich_text": rich_text(spec["response"])},
        {"column_id": COLUMNS["auth"], "rich_text": rich_text(spec["auth"])},
        {"column_id": COLUMNS["query"], "rich_text": rich_text(spec["how_to_use"])},
        {"column_id": COLUMNS["gate"], "rich_text": rich_text(spec["gate"])},
        {"column_id": COLUMNS["source"], "rich_text": rich_text(spec["source"])},
    ]
    if row_id:
        for f in fields:
            f["row_id"] = row_id
    return fields


def sync_contracts(slack, list_id=LIST_ID, dry_run=False, specs=None):
    """Synchronize implemented API contracts to Slack List F0CHJB5C939."""
    if specs is None:
        specs = get_implemented_apis()
    rows = slack.rows(list_id)
    title_to_row = {}
    id_to_row = {}

    for row in rows:
        fields = {f.get("column_id"): f for f in row.get("fields", [])}
        title_val = fields.get(COLUMNS["title"], {}).get("text", "")
        if title_val:
            title_to_row[title_val.strip()] = row
            # Also key by API-xxx if found
            for part in title_val.split():
                if part.startswith("API-"):
                    id_to_row[part.rstrip(":")] = row

    summary = {"updated": [], "created": [], "unchanged": []}

    for spec in specs:
        api_id = spec["api_id"]
        title = spec["title"]
        existing_row = id_to_row.get(api_id) or title_to_row.get(title)

        if existing_row:
            row_id = existing_row["id"]
            if not dry_run:
                cells = encode_item_fields(spec, row_id=row_id)
                slack.call("slackLists.items.update", list_id=list_id, cells=cells)
            summary["updated"].append({"api_id": api_id, "row_id": row_id, "title": title})
        else:
            if not dry_run:
                initial_fields = encode_item_fields(spec)
                res = slack.call("slackLists.items.create", list_id=list_id, initial_fields=initial_fields)
                new_id = res.get("item", {}).get("id")
            else:
                new_id = "dry-run-new"
            summary["created"].append({"api_id": api_id, "row_id": new_id, "title": title})

    return summary


def check_contracts(slack, list_id=LIST_ID, specs=None):
    """Verify that all implemented API contracts in docs/api/operations.json are synced to Slack."""
    if specs is None:
        specs = get_implemented_apis()
    rows = slack.rows(list_id)
    id_to_row = {}

    for row in rows:
        fields = {f.get("column_id"): f for f in row.get("fields", [])}
        title_val = fields.get(COLUMNS["title"], {}).get("text", "")
        for part in title_val.split():
            if part.startswith("API-"):
                id_to_row[part.rstrip(":")] = (row, fields)

    missing = []
    not_ready = []

    for spec in specs:
        api_id = spec["api_id"]
        if api_id not in id_to_row:
            missing.append(api_id)
            continue
        row, fields = id_to_row[api_id]
        status_val = fields.get(COLUMNS["status"], {}).get("value")
        if status_val != "Backend ready":
            not_ready.append({"api_id": api_id, "status": status_val, "expected": "Backend ready"})

    if missing or not_ready:
        errors = []
        if missing:
            errors.append(f"Missing APIs in Slack List: {missing}")
        if not_ready:
            errors.append(f"APIs not in 'Backend ready' status: {not_ready}")
        raise ValueError("; ".join(errors))

    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sync", action="store_true", help="Sync implemented API contracts to Slack list")
    parser.add_argument("--check", action="store_true", help="Verify implemented APIs are synced in Slack list")
    parser.add_argument("--dry-run", action="store_true", help="Perform dry run without calling Slack write APIs")
    parser.add_argument("--allow-skip-no-token", action="store_true", help="Exit 0 if Slack token is not available")
    parser.add_argument("--list-id", default=LIST_ID, help="Slack List ID")
    parser.add_argument("--config", type=Path, default=None, help="Path to .slack-worker.json")
    parser.add_argument("--json", action="store_true", help="Output summary in JSON format")

    args = parser.parse_args()

    config = load_worker_config(ROOT) if args.config is None else json.loads(args.config.read_text())
    token = credential(config)

    if not token:
        if args.allow_skip_no_token:
            print("SKIP: Slack token not configured; skipping Slack API contract sync check.")
            return 0
        print("ERROR: Slack token not configured in environment or mcp config.", file=sys.stderr)
        return 1

    slack = Slack(token)

    try:
        if args.check:
            check_contracts(slack, list_id=args.list_id)
            print("OK: All implemented API contracts are synced and marked 'Backend ready' in Slack.")
            return 0

        summary = sync_contracts(slack, list_id=args.list_id, dry_run=args.dry_run)
        if args.json:
            print(json.dumps(summary, indent=2))
        else:
            print(f"Sync completed: {len(summary['updated'])} updated, {len(summary['created'])} created.")
            for item in summary["updated"]:
                print(f"  - Updated {item['api_id']} ({item['title']}) -> row {item['row_id']}")
            for item in summary["created"]:
                print(f"  - Created {item['api_id']} ({item['title']}) -> row {item['row_id']}")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
