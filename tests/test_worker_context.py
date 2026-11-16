"""Worker v2 gate pins accepted migration and preserves complete briefs."""
import importlib
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))


class WorkerContextTest(unittest.TestCase):
    def module(self):
        self.assertTrue((Path(__file__).resolve().parents[1] / 'scripts/slack_automation/context.py').exists(),
                        'Worker context preparation is not implemented')
        return importlib.import_module('slack_automation.context')

    def gate(self, module):
        return patch.multiple(module.cm, git=lambda *a, **k: 'a' * 40,
                              resolve_base=lambda *a, **k: 'a' * 40)

    def migration(self, module, *, manifests=True, protocol=True, errors=()):
        return patch.multiple(module.migration,
            Source=lambda *a: SimpleNamespace(manifests=lambda: ['coverage'] if manifests else [],
                read=lambda path: b'## Context protocol\n' if protocol else b'## Other\n'),
            validate=lambda *a: list(errors))

    def test_default_and_explicit_v1_do_not_load_context(self):
        module = self.module()
        for config in ({}, {'context_prompt_version': 1}):
            self.assertEqual(module.prepare_context(Path('/unused'), config), (None, {'_prompt_version': 1}))

    def test_v2_cannot_use_absent_invalid_or_unaccepted_migration(self):
        module = self.module()
        for options in ({'manifests': False}, {'protocol': False}, {'errors': ['fake-secret']}):
            with self.gate(module), self.migration(module, **options):
                with self.assertRaises(RuntimeError) as raised:
                    module.prepare_context(Path('/unused'), {'context_prompt_version': 2})
                self.assertNotIn('fake-secret', str(raised.exception))

    def test_untrusted_head_is_rejected_with_sanitized_error(self):
        module = self.module()
        with patch.object(module.cm, 'git', return_value='a' * 40), \
                patch.object(module.cm, 'resolve_base', side_effect=ValueError('fake-secret')):
            with self.assertRaises(RuntimeError) as raised:
                module.prepare_context(Path('/unused'), {'context_prompt_version': 2})
            self.assertNotIn('fake-secret', str(raised.exception))

    def test_complete_brief_has_no_output_cap_and_pins_child_environment(self):
        module = self.module()
        full = 'BASE ' + 'a' * 40 + ' | VIEW effective\n' + 'required blocker\n' * 2000 + 'END brief\n'
        with self.gate(module), self.migration(module), \
                patch.object(module.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout=full)) as run:
            context, metadata = module.prepare_context(Path('/fixture'), {'context_prompt_version': 2})
        self.assertEqual(context['brief'], full)
        self.assertEqual(context['base'], 'a' * 40)
        self.assertEqual(metadata['_brief_bytes'], len(full.encode()))
        self.assertEqual(metadata['_brief_exit'], 0)
        self.assertEqual(metadata['_prompt_version'], 2)
        self.assertEqual(metadata['_base_sha'], 'a' * 40)
        self.assertGreaterEqual(metadata['_brief_ms'], 0)
        args, kwargs = run.call_args
        self.assertEqual(kwargs['timeout'], 10)
        self.assertIn('--base', args[0])
        self.assertEqual(kwargs['env']['CTX_BASE'], 'a' * 40)
        self.assertIn('/fixture', kwargs['env'].values())

    def test_zero_exit_requires_pinned_header_and_final_end_marker(self):
        module = self.module()
        outputs = ['', 'BASE ' + 'a' * 40 + ' | VIEW effective\npartial blocker\n',
                   'BASE ' + 'b' * 40 + ' | VIEW effective\npartial blocker\nEND brief\n',
                   'partial blocker\nEND brief\n',
                   'BASE ' + 'a' * 40 + '\nEND brief\ntrailing partial blocker\n']
        for partial in outputs:
            with self.subTest(partial=partial), self.gate(module), self.migration(module), \
                    patch.object(module.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout=partial)):
                context, metadata = module.prepare_context(Path('/fixture'), {'context_prompt_version': 2})
            self.assertTrue(context['brief'].startswith(partial))
            self.assertIn('INCOMPLETE', context['brief'])
            self.assertEqual(metadata['_brief_exit'], 4)

    def test_brief_failure_and_timeout_are_explicit_incomplete_context(self):
        module = self.module()
        failures = [SimpleNamespace(returncode=4, stdout='partial blocker\n'),
                    subprocess.TimeoutExpired(['ctx'], 10, output=b'partial blocker\n')]
        for failure in failures:
            options = {'side_effect': failure} if isinstance(failure, Exception) else {'return_value': failure}
            with self.gate(module), self.migration(module), patch.object(module.subprocess, 'run', **options):
                context, metadata = module.prepare_context(Path('/fixture'), {'context_prompt_version': 2})
            self.assertIn('INCOMPLETE', context['brief'])
            self.assertIn('partial blocker', context['brief'])
            self.assertNotEqual(metadata['_brief_exit'], 0)

    def test_real_accepted_coverage_ignores_proposed_files_and_rejects_unaccepted_head(self):
        module = self.module()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-C', directory, '-c', 'user.name=Test',
                    '-c', 'user.email=test@example.invalid', *args], text=True).strip()
            git('init', '-q')
            (root / 'docs/archive').mkdir(parents=True)
            (root / 'scripts').mkdir()
            state = root / 'docs/STATE.md'
            state.write_text('Pending task\n')
            git('add', 'docs'); git('commit', '-qm', 'source')
            source_commit = git('rev-parse', 'HEAD')
            source_blob = git('rev-parse', 'HEAD:docs/STATE.md')
            archive = 'docs/archive/STATE-source.md'
            (root / archive).write_bytes(state.read_bytes())
            state.write_text(f'Pending task (archive: {archive}:L1) paths: scripts/\n')
            coverage = root / 'docs/archive/COVERAGE-source.toml'
            coverage.write_text(f'source_commit = "{source_commit}"\nsource_blob = "{source_blob}"\n'
                f'archive = "{archive}"\n[[item]]\nlines = "1"\nkind = "unfinished"\ndisposition = "legacy"\n')
            (root / 'AGENTS.md').write_text('## Context protocol\n')
            (root / 'scripts/ctx.py').write_text('import os\nprint("BASE " + os.environ["CTX_BASE"] + " | VIEW effective\\nAccepted fixture brief\\nEND brief")\n')
            git('add', 'docs', 'AGENTS.md', 'scripts'); git('commit', '-qm', 'migration')
            base = git('rev-parse', 'HEAD')
            git('update-ref', 'refs/remotes/origin/main', base)
            # Current proposed files do not decide whether cutover is accepted.
            coverage.unlink()
            (root / 'AGENTS.md').write_text('proposed edit\n')
            context, metadata = module.prepare_context(root, {'context_prompt_version': 2})
            self.assertEqual(context['base'], base)
            self.assertIn('END brief', context['brief'])
            self.assertEqual(metadata['_brief_exit'], 0)
            git('add', 'AGENTS.md'); git('commit', '-qm', 'unmerged')
            with self.assertRaises(RuntimeError):
                module.prepare_context(root, {'context_prompt_version': 2})



class PromptIntegrationTest(unittest.TestCase):
    def test_v1_defers_startup_and_handoff_to_accepted_contract(self):
        from slack_automation.agent import implementation_prompt
        prompt=implementation_prompt({'kind':'feature'},'feature/test')
        self.assertIn('If the base has a Context protocol',prompt)
        self.assertIn('do not append task logs to STATE',prompt)
        self.assertNotIn("Update only this task's STATE",prompt)

    def test_v2_uses_brief_whole_skills_and_does_not_require_legacy_reads(self):
        from slack_automation.agent import implementation_prompt
        context={'base':'a'*40,'brief':'BASE a\nEND brief'}
        prompt=implementation_prompt({'id':'Rec1','kind':'bug','details':'repair'},'fix/test',context)
        self.assertIn('END brief',prompt)
        self.assertIn('defect-to-regression/SKILL.md',prompt)
        self.assertNotIn('Read AGENTS.md, docs/STATE.md',prompt)
        self.assertIn('CTX_BASE',prompt)
        self.assertIn('Do not merge',prompt)

    def test_v2_agent_receives_pin_and_cannot_inherit_arbitrary_task_pin(self):
        from slack_automation.agent import run_agent
        import json
        from unittest.mock import patch, MagicMock
        process=MagicMock(); process.communicate.return_value=(json.dumps({'status':'SUCCESS','structured_output':{'message':'done'}}),''); process.returncode=0
        with patch('slack_automation.agent.subprocess.Popen',return_value=process) as popen:
            run_agent(Path.cwd(),{'_branch':'fix/test','_prompt_version':2,'_base_sha':'a'*40},'prompt',['message'])
        self.assertEqual(popen.call_args.kwargs['env']['CTX_BASE'],'a'*40)


if __name__ == "__main__":
    unittest.main()
