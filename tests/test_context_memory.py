"""Trusted-base context and relation regression tests."""
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
import context_memory as cm


def document(kind='DEC', n=1, topic='phones', **fields):
    rid = f'{kind}-{n:016x}'
    meta = dict(id=rid, title=f'Record {n}', created='2026-11-16')
    if kind == 'DEC': meta['topic'] = topic
    if kind == 'BLK': meta['paths'] = ['backend/']
    if kind == 'HND': meta['status'] = 'open'
    meta.update(fields)
    import json
    return rid, '+++\n' + '\n'.join(f'{k} = {json.dumps(v, ensure_ascii=False)}' for k,v in meta.items()) + '\n+++\nA durable observation.\n'


class MemoryFixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self._ctx_base = os.environ.pop('CTX_BASE', None)
        self.addCleanup(self._restore_env)
        self.git('init', '-q'); self.git('config','user.name','Test'); self.git('config','user.email','test@example.invalid')
        (self.root/'docs/memory').mkdir(parents=True)
        (self.root/'docs/STATE.md').write_text('# State\n\n## Current Active Focus\nTest focus.\n')
        self.commit()

    def _restore_env(self):
        if self._ctx_base is not None:
            os.environ['CTX_BASE'] = self._ctx_base

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args], text=True).strip()

    def commit(self):
        self.git('add','.'); self.git('commit','-qm','fixture'); sha=self.git('rev-parse','HEAD'); self.git('update-ref','refs/remotes/origin/main',sha); return sha

    def put(self, kind='DEC', n=1, **fields):
        rid,raw=document(kind,n,**fields); p=self.root/f'docs/memory/{rid}-test.md'; p.write_text(raw); return rid,p



class MemoryTests(MemoryFixture):
    def test_base_ignores_unmerged_closure_edit_and_deletion(self):
        a,p=self.put(critical=True,paths=['backend/']); base=self.commit()
        b,_=self.put(n=2,supersedes=[a]); p.unlink()
        view=cm.load_effective(self.root,base)
        self.assertEqual(view.statuses[a], 'active'); self.assertNotIn(b,view.records)
        self.assertFalse(view.errors)

    def test_permanent_nontransitive_closure_and_current_conflict(self):
        a,_=self.put(); b,_=self.put(n=2,supersedes=[a]); c,_=self.put(n=3,supersedes=[a])
        view=cm.load_proposed(self.root); self.assertEqual(view.conflicts, {'phones':[b,c]})
        d,_=self.put(n=4,supersedes=[b,c]); self.assertFalse(cm.load_proposed(self.root).conflicts)
        self.put(n=5,revokes=[d]); view=cm.load_proposed(self.root)
        self.assertTrue(all(view.statuses[x]=='closed' for x in (a,b,c,d)))
        self.assertEqual(view.statuses['DEC-0000000000000005'],'retracted')

    def test_wrong_relation_closes_nothing_and_cycles_are_errors(self):
        a,_=self.put(); self.put(n=2,topic='other',supersedes=[a])
        v=cm.load_proposed(self.root); self.assertEqual(v.statuses[a],'active'); self.assertTrue(v.errors)
        self.put(n=2,supersedes=[a]); self.put(n=1,supersedes=['DEC-0000000000000002'])
        self.assertTrue(any('cycle' in e.lower() for e in cm.load_proposed(self.root).errors))

    def test_duplicate_resolves_are_idempotent(self):
        a,_=self.put('BLK'); self.put('HND',2,resolves=[a]); self.put('HND',3,resolves=[a])
        v=cm.load_proposed(self.root); self.assertFalse(v.errors); self.assertEqual(v.statuses[a],'closed')

    def test_mentions_do_not_close_and_toml_variants_do(self):
        a,_=self.put(); rid,raw=document(n=2)
        raw=raw.replace('A durable observation.',a+' +++ mention')
        p=self.root/f'docs/memory/{rid}-test.md'; p.write_text(raw)
        self.assertEqual(cm.load_proposed(self.root).statuses[a],'active')
        p.write_text(raw.replace('+++\nA', '+++\nA'))
        raw=raw.replace('topic = "phones"','topic = "phones"\nsupersedes=[\n\''+a+'\',\n]')
        p.write_text(raw); self.assertEqual(cm.load_proposed(self.root).statuses[a],'closed')

    def test_unknown_fields_scope_and_secret_rejected(self):
        for kw in ({'mystery':True},{'critical':True},{'paths':['../outside']},{'observed':['passed']}):
            rid,raw=document(**kw)
            with self.assertRaises(ValueError): cm.parse_record(f'docs/memory/{rid}-test.md',raw)
        rid,raw=document(); raw += 'xox'+'b-'+'a'*30
        with self.assertRaises(ValueError): cm.parse_record(f'docs/memory/{rid}-test.md',raw)
        self.assertTrue(cm.scope_matches('backend/auth','backend'))
        self.assertFalse(cm.scope_matches('backend/auth','backend/author'))
        self.assertTrue(cm.scope_matches('*','anything'))
        self.assertTrue(cm.scope_matches('backend/', '*'))

    def test_base_must_be_trusted_ancestor(self):
        self.put(); self.git('add','.'); self.git('commit','-qm','unmerged'); unmerged=self.git('rev-parse','HEAD')
        with self.assertRaises(ValueError): cm.load_effective(self.root,unmerged)

    def test_symlink_and_duplicate_are_errors(self):
        a,p=self.put(); (p.parent/f'{a}-copy.md').write_bytes(p.read_bytes())
        self.assertTrue(cm.load_proposed(self.root).errors)
        p.unlink(); p.symlink_to(self.root/'docs/STATE.md')
        self.assertTrue(cm.load_proposed(self.root).errors)


class CliTests(MemoryFixture):
    def cli(self,*args):
        return subprocess.run([sys.executable,str(SCRIPTS/'ctx.py'),*args],cwd=self.root,capture_output=True,text=True)

    def test_brief_never_truncates_required_items_and_ignores_worktree(self):
        for n in range(1,26): self.put(n=n,topic=f'topic-{n}',critical=True,paths=['backend/'])
        for n in range(1,16): self.put('BLK',n)
        base=self.commit(); self.put(n=26,critical=True,paths=['backend/'])
        result=self.cli('brief','--base',base)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertIn('END brief',result.stdout); self.assertIn('OVERFLOW',result.stdout)
        for n in range(1,26): self.assertIn(f'DEC-{n:016x}',result.stdout)
        self.assertNotIn(f'DEC-{26:016x}',result.stdout)

    def test_new_collision_checks_base_and_never_overwrites(self):
        a,p=self.put(); self.commit(); p.unlink()
        result=self.cli('new','handoff','testing','--task','Rec123')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        record=cm.load_proposed(self.root)
        self.assertEqual(len(record.records),1)
        self.assertEqual(next(iter(record.records.values())).meta['status'],'open')

    def test_new_retries_base_collision_and_simultaneous_names(self):
        import ctx
        a,p=self.put(); self.commit(); p.unlink()
        with patch('ctx.secrets.token_hex',side_effect=['0000000000000001','0000000000000002']):
            first=ctx.new(self.root,'DEC','same')
        second=ctx.new(self.root,'DEC','same')
        self.assertIn('0000000000000002',first)
        self.assertNotEqual(first,second)
        self.assertTrue((self.root/first).is_file())

    def test_changed_conflict_exit_and_proposed_review_summary(self):
        a,_=self.put(); base=self.commit()
        self.put(n=2,supersedes=[a]); self.put(n=3,supersedes=[a])
        self.git('add','.')
        result=self.cli('lint','--changed',base)
        self.assertEqual(result.returncode,2,result.stdout+result.stderr)
        self.assertIn('PROPOSED CLOSURES',result.stdout)
        self.put(n=4,supersedes=['DEC-0000000000000002','DEC-0000000000000003'])
        self.assertEqual(self.cli('lint','--changed',base).returncode,0)

    def test_unsafe_scope_is_incomplete(self):
        self.put('BLK'); base=self.commit()
        result=self.cli('brief','--base',base,'--scope','../backend')
        self.assertEqual(result.returncode,4)

    def test_missing_or_untrusted_base_is_incomplete(self):
        self.git('update-ref','-d','refs/remotes/origin/main')
        result=self.cli('brief'); self.assertEqual(result.returncode,4)
        self.assertNotIn('END brief',result.stdout)


if __name__ == "__main__": unittest.main()
