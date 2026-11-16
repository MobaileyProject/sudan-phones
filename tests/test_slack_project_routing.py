"""Project Lists share a worker without sharing intake or execution authority."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import slack_worker
from slack_automation.core import Ledger, eligible
from slack_automation.worker import publish, reconcile_merged

REQUIRED = ('title', 'kind', 'status', 'executor', 'details', 'acceptance', 'source', 'branch', 'pr', 'result')


class Lists:
    def __init__(self):
        self.updates, self.created, self.reads = [], [], []
        self.items = {}

    def tasks(self, config):
        self.reads.append(config['list_id'])
        return self.items.get(config['list_id'], [])

    def update(self, config, row, fields):
        self.updates.append((config['list_id'], row, fields))

    def create(self, config, fields):
        self.created.append((config['list_id'], fields))

    def post(self, *args):
        return '123.4'


class ProjectRoutingTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.ledger = Ledger(self.root / 'jobs.db')
        self.addCleanup(self.ledger.db.close)
        self.columns = {key: {'id': key, 'type': 'text'} for key in REQUIRED}
        self.config = dict(repo='MobaileyProject/sudan-phones', workspace='T0CJRU4RSUQ',
                           list_id='FROOT', columns=self.columns, execution_enabled=True,
                           agy_skip_permissions=False, channels=dict(updates='C1', bugs='C2', questions='C3'),
                           project_lists=[dict(list_id='FPLAN', columns=self.columns, execution_enabled=True)])
        self.task = dict(id='Rec1', list_id='FPLAN', title='Build search', kind='feature',
                         status='Ready', executor='agy', details='Search catalog', acceptance='Find phones')
        self.lists = Lists()

    def load(self, config):
        path = self.root / 'config.json'
        path.write_text(json.dumps(config))
        return slack_worker.load_config(path)

    def test_config_rejects_duplicate_routes_missing_columns_and_policy_overrides(self):
        for update in (dict(list_id='FROOT'), dict(columns={}), dict(execution_enabled='true'),
                       dict(execution_enabled=1), dict(agy_skip_permissions=True), dict(repo='other/repo')):
            config = copy.deepcopy(self.config)
            config['project_lists'][0].update(update)
            with self.subTest(update=update), self.assertRaises(ValueError):
                self.load(config)
        for value in (1, 'true', None):
            with self.subTest(root=value), self.assertRaises(ValueError):
                self.load(dict(self.config, execution_enabled=value))

    def test_execution_requires_both_root_and_project_opt_in(self):
        from slack_automation.routing import contexts
        for root, project, expected in ((True, True, True), (False, True, False), (True, False, False), (True, None, False)):
            config = copy.deepcopy(self.config)
            config['execution_enabled'] = root
            if project is None:
                config['project_lists'][0].pop('execution_enabled')
            else:
                config['project_lists'][0]['execution_enabled'] = project
            target = contexts(config)[1]
            self.assertEqual(eligible(self.task, target), expected)
            self.assertFalse(target['agy_skip_permissions'])

    def test_pending_results_return_to_own_list_and_legacy_defaults_to_root(self):
        for task, key in ((self.task, 'FPLAN:Rec1'), (dict(self.task, id='Rec2'), 'FROOT:Rec2')):
            task = dict(task)
            if key.startswith('FROOT'):
                task.pop('list_id')
            self.ledger.claim(key, 'feature/test')
            self.ledger.finish(key, dict(outcome='blocked', summary='Need detail', task=task))
        self.assertEqual(publish(self.config, self.ledger, self.lists, lambda *args: {'message': 'Needs detail'}), [])
        self.assertEqual([(x[0], x[1]) for x in self.lists.updates], [('FPLAN', 'Rec1'), ('FROOT', 'Rec2')])

    def test_removed_route_blocks_delivery_without_any_wrong_list_write(self):
        self.ledger.claim('FREMOVED:Rec1', 'feature/test')
        self.ledger.finish('FREMOVED:Rec1', dict(outcome='blocked', summary='Need detail', task=dict(self.task, list_id='FREMOVED')))
        errors = publish(self.config, self.ledger, self.lists, lambda *args: self.fail('Unknown target must not notify'))
        self.assertEqual(len(errors), 1)
        self.assertEqual(self.lists.updates, [])
        self.assertFalse(self.ledger.get('FREMOVED:Rec1')['delivered'])

    def test_poll_imports_only_into_default_list_and_spends_one_execution_slot(self):
        from slack_automation.worker import poll
        self.lists.items = {'FROOT': [dict(self.task, list_id='FROOT')], 'FPLAN': [self.task]}
        reports = [dict(source='issue:1', title='Bug', kind='bug')]
        with patch('slack_automation.worker.collect_sources', return_value=reports), \
             patch('slack_automation.worker.check_skills'), \
             patch('slack_automation.worker.prepare_worktree', return_value=self.root), \
             patch('slack_automation.worker.run_agent', return_value=dict(outcome='blocked', summary='Need detail', tests='', pr_url='', next_action='Ask')):
            poll(self.root, self.config, self.ledger, self.lists, lambda *args: {'message': 'Needs detail'}, execute_ready=True)
        self.assertEqual([x[0] for x in self.lists.created], ['FROOT'])
        self.assertIsNotNone(self.ledger.get('FROOT:Rec1'))
        self.assertIsNone(self.ledger.get('FPLAN:Rec1'))
        # Claimed primary work cannot starve an eligible project on the next poll.
        with patch('slack_automation.worker.collect_sources', return_value=[]), \
             patch('slack_automation.worker.check_skills'), \
             patch('slack_automation.worker.prepare_worktree', return_value=self.root), \
             patch('slack_automation.worker.run_agent', return_value=dict(outcome='blocked', summary='Need detail', tests='', pr_url='', next_action='Ask')):
            poll(self.root, self.config, self.ledger, self.lists, lambda *args: {'message': 'Needs detail'}, execute_ready=True)
        self.assertIsNotNone(self.ledger.get('FPLAN:Rec1'))
        self.assertEqual(self.ledger.get('FPLAN:Rec1')['result']['task']['list_id'], 'FPLAN')

    def test_disabled_project_is_read_and_reconciled_but_never_executed(self):
        from slack_automation.worker import poll
        self.config['project_lists'][0]['execution_enabled'] = False
        self.lists.items = {'FPLAN': [self.task]}
        with patch('slack_automation.worker.collect_sources', return_value=[]), \
             patch('slack_automation.worker.prepare_worktree', side_effect=AssertionError('Must not launch')):
            poll(self.root, self.config, self.ledger, self.lists, lambda *args: {'message': 'OK'}, execute_ready=True)
        self.assertIn('FPLAN', self.lists.reads)
        self.assertIsNone(self.ledger.get('FPLAN:Rec1'))

    def test_project_merge_updates_its_own_row(self):
        from slack_automation.routing import contexts
        self.lists.items = {'FPLAN': [dict(self.task, status='PR ready', pr='https://github.com/MobaileyProject/sudan-phones/pull/42')]}
        with patch('slack_automation.worker.command', return_value='{"state":"MERGED"}'):
            reconcile_merged(self.root, contexts(self.config)[1], self.lists, self.ledger)
        self.assertEqual(self.lists.updates, [('FPLAN', 'Rec1', {'status': 'Done'})])

    def test_doctor_checks_schema_for_every_list(self):
        from slack_automation.routing import verify_lists
        class SchemaLists(Lists):
            def call(inner, method, **payload):
                columns = [{'id': name, 'type': 'text'} for name in REQUIRED]
                if payload['list_id'] == 'FPLAN':
                    columns.pop()
                return {'list': {'id': payload['list_id'], 'schema': columns}}
        lists = SchemaLists()
        with self.assertRaisesRegex(ValueError, 'FPLAN'):
            verify_lists(self.config, lists)
        self.assertIn('FROOT', lists.reads)

    def test_doctor_reads_every_registered_list_with_its_own_schema(self):
        class DoctorLists(Lists):
            def call(inner, method, **payload):
                if method == 'auth.test':
                    return {'team_id': 'T0CJRU4RSUQ'}
                return {'list': {'id': payload['list_id'], 'schema': [
                    {'id': name, 'type': 'text'} for name in REQUIRED]}}
        lists = DoctorLists()
        path = self.root / 'config.json'
        path.write_text(json.dumps(self.config))
        with patch.object(slack_worker, 'ROOT', self.root), \
             patch.object(slack_worker, 'credential', return_value='fake-test-credential'), \
             patch.object(slack_worker, 'Slack', return_value=lists), \
             patch.object(slack_worker, 'command', return_value='{}'), \
             patch.object(sys, 'argv', ['slack_worker.py', 'doctor', '--config', str(path)]):
            slack_worker.main()
        self.assertEqual(lists.reads, ['FROOT', 'FPLAN'])

    def test_malformed_project_registrations_fail_before_credentials_are_read(self):
        for projects in (None, {}, ['FPLAN'], [dict(list_id='', columns=self.columns)],
                         [dict(list_id='FPLAN', columns={'title': {'id': 'x', 'type': 'user'}})]):
            with self.subTest(projects=projects), self.assertRaises(ValueError):
                self.load(dict(self.config, project_lists=projects))

    def test_doctor_refuses_stale_select_options(self):
        from slack_automation.routing import verify_lists
        self.config['columns'] = copy.deepcopy(self.columns)
        self.config['columns']['status'] = dict(id='status', type='select', values={'Ready': 'old'})
        class SchemaLists(Lists):
            def call(inner, method, **payload):
                schema = [{'id': name, 'type': 'text'} for name in REQUIRED if name != 'status']
                schema.append(dict(id='status', type='select', options={'choices': [{'value': 'new', 'label': 'Ready'}]}))
                return {'list': {'schema': schema}}
        with self.assertRaisesRegex(ValueError, 'FROOT'):
            verify_lists(self.config, SchemaLists())

    def test_reconciliation_refuses_a_row_from_an_unexpected_list(self):
        self.lists.items = {'FROOT': [dict(self.task, list_id='FREMOVED', status='PR ready',
                                         pr='https://github.com/MobaileyProject/sudan-phones/pull/42')]}
        with patch('slack_automation.worker.command', return_value='{"state":"MERGED"}'), \
             self.assertRaises(ValueError):
            reconcile_merged(self.root, self.config, self.lists, self.ledger)
        self.assertEqual(self.lists.updates, [])
