"""Unit tests for scripts/sync_slack_api_contracts.py."""
import json
import unittest
from unittest.mock import MagicMock

from scripts.sync_slack_api_contracts import (
    COLUMNS,
    IMPLEMENTED_APIS,
    build_spec_from_openapi,
    check_contracts,
    encode_item_fields,
    get_implemented_apis,
    sync_contracts,
)


class TestSyncSlackApiContracts(unittest.TestCase):
    def setUp(self):
        self.apis = get_implemented_apis()

    def test_encode_item_fields(self):
        spec = IMPLEMENTED_APIS[0]
        fields = encode_item_fields(spec, row_id="RecTest001")
        col_map = {f["column_id"]: f for f in fields}

        self.assertIn(COLUMNS["title"], col_map)
        self.assertIn(COLUMNS["status"], col_map)
        self.assertEqual(col_map[COLUMNS["status"]]["select"], ["Backend ready"])
        self.assertEqual(col_map[COLUMNS["title"]]["row_id"], "RecTest001")
        self.assertEqual(col_map[COLUMNS["owner"]]["user"], [spec["owner"]])

    def test_check_contracts_success(self):
        slack = MagicMock()
        mock_rows = []
        for spec in self.apis:
            mock_rows.append({
                "id": f"Rec_{spec['api_id']}",
                "fields": [
                    {"column_id": COLUMNS["title"], "text": spec["title"]},
                    {"column_id": COLUMNS["status"], "value": "Backend ready"},
                ],
            })
        slack.rows.return_value = mock_rows

        self.assertTrue(check_contracts(slack, list_id="F0CHJB5C939"))

    def test_check_contracts_missing_api(self):
        slack = MagicMock()
        # Only include API-019, missing API-021 and API-061
        slack.rows.return_value = [
            {
                "id": "Rec_API-019",
                "fields": [
                    {"column_id": COLUMNS["title"], "text": "API-019: GET /api/v1/config"},
                    {"column_id": COLUMNS["status"], "value": "Backend ready"},
                ],
            }
        ]
        with self.assertRaises(ValueError) as ctx:
            check_contracts(slack, list_id="F0CHJB5C939")
        self.assertIn("Missing APIs in Slack List", str(ctx.exception))

    def test_check_contracts_status_not_ready(self):
        slack = MagicMock()
        mock_rows = []
        for spec in self.apis:
            mock_rows.append({
                "id": f"Rec_{spec['api_id']}",
                "fields": [
                    {"column_id": COLUMNS["title"], "text": spec["title"]},
                    {"column_id": COLUMNS["status"], "value": "Proposed" if spec["api_id"] == "API-019" else "Backend ready"},
                ],
            })
        slack.rows.return_value = mock_rows

        with self.assertRaises(ValueError) as ctx:
            check_contracts(slack, list_id="F0CHJB5C939")
        self.assertIn("APIs not in 'Backend ready' status", str(ctx.exception))

    def test_sync_contracts_updates_and_creates(self):
        slack = MagicMock()
        # API-019 exists, others missing
        slack.rows.return_value = [
            {
                "id": "Rec_019",
                "fields": [
                    {"column_id": COLUMNS["title"], "text": "API-019: GET /api/v1/config"},
                    {"column_id": COLUMNS["status"], "value": "Proposed"},
                ],
            }
        ]
        slack.call.return_value = {"ok": True, "item": {"id": "Rec_New"}}

        summary = sync_contracts(slack, list_id="F0CHJB5C939", dry_run=False)

        self.assertEqual(len(summary["updated"]), 1)
        self.assertEqual(summary["updated"][0]["api_id"], "API-019")
        self.assertEqual(summary["updated"][0]["row_id"], "Rec_019")

        # The other 2 APIs should be created
        self.assertEqual(len(summary["created"]), len(self.apis) - 1)
        self.assertTrue(slack.call.called)

    def test_build_spec_from_openapi(self):
        openapi = {
            "paths": {
                "/api/v1/auth/register": {
                    "post": {
                        "summary": "Register new account",
                        "tags": ["auth"],
                        "parameters": [
                            {"name": "X-Client", "in": "header", "schema": {"type": "string"}},
                            {"name": "channel", "in": "query", "schema": {"type": "string", "enum": ["web", "mobile"]}},
                        ],
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/RegisterRequest"}
                                }
                            }
                        },
                        "responses": {
                            "201": {"description": "Created"},
                            "400": {"description": "Bad Request"},
                        },
                    }
                }
            }
        }
        spec = build_spec_from_openapi("API-001", "POST", "/api/v1/auth/register", "P3", openapi)
        self.assertEqual(spec["api_id"], "API-001")
        self.assertEqual(spec["title"], "API-001: POST /api/v1/auth/register")
        self.assertEqual(spec["status"], "Backend ready")
        self.assertIn("X-Client", spec["inputs"])
        self.assertIn("channel", spec["inputs"])
        self.assertIn("RegisterRequest", spec["inputs"])
        self.assertIn("Status 201: Created", spec["response"])
        self.assertIn("curl -i -X POST", spec["how_to_use"])

    def test_synthesis_includes_actual_schema_constraints_envelopes_and_session_usage(self):
        stock = {'type':'object','required':['quantity','version'],
                 'properties':{'quantity':{'type':'integer','minimum':0},'version':{'type':'integer','minimum':1}}}
        result = {'type':'object','properties':{'data':{'type':'object','properties':{'quantity':{'type':'integer'}}}}}
        operation = {'security':[{'cookieAuth':[]}],
                     'requestBody':{'content':{'application/json':{'schema':{'$ref':'#/components/schemas/StockRequest'}}}},
                     'responses':{'200':{'content':{'application/json':{'schema':{'$ref':'#/components/schemas/Result'}}}}}}
        schema = {'components':{'schemas':{'StockRequest':stock,'Result':result}},
                  'paths':{'/api/v1/stock':{'patch':operation}}}
        spec = build_spec_from_openapi('API-040','PATCH','/api/v1/stock','P4',schema)
        self.assertIn('"minimum":0',spec['inputs'])
        self.assertIn('"required":["quantity","version"]',spec['inputs'])
        self.assertIn('"data"',spec['response'])
        self.assertIn('X-CSRFToken',spec['how_to_use'])
        schema['paths']['/api/v1/stock']['patch']['security'] = []
        public = build_spec_from_openapi('API-040','PATCH','/api/v1/stock','P4',schema)
        self.assertIn('no authentication',public['auth'])
        operation['x-authorization']='Active founder only'
        specific=build_spec_from_openapi('API-013','PATCH','/api/v1/stock','P4',schema)
        self.assertIn('Active founder only',specific['auth'])

    def test_get_implemented_apis_returns_specs(self):
        apis = get_implemented_apis()
        self.assertGreaterEqual(len(apis), 3)
        ids = {a["api_id"] for a in apis}
        self.assertTrue({"API-019", "API-021", "API-061"}.issubset(ids))


if __name__ == "__main__":
    unittest.main()

class ContractParityTest(unittest.TestCase):
    def test_unimplemented_rows_are_detected_and_removed_without_touching_notes(self):
        class ListBoundary:
            def __init__(self):
                self.items = [
                    {'id':'stale','fields':[{'column_id':COLUMNS['title'],'text':'API-999: proposed'}]},
                    {'id':'note','fields':[{'column_id':COLUMNS['title'],'text':'Manual catalog note'}]},
                ]
            def rows(self,list_id):
                return list(self.items)
            def call(self,method,**kwargs):
                if method != 'slackLists.items.delete':
                    raise AssertionError(method)
                self.items = [item for item in self.items if item['id'] != kwargs['id']]
                return {'ok':True}
        boundary = ListBoundary()
        with self.assertRaisesRegex(ValueError,'Unimplemented APIs'):
            check_contracts(boundary,specs=[])
        summary = sync_contracts(boundary,specs=[],prune=True)
        self.assertEqual([item['id'] for item in boundary.items],['note'])
        self.assertEqual(summary['removed'][0]['api_id'],'API-999')
