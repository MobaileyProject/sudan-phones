#!/usr/bin/env python3
"""Bounded startup context, append-only record creation and proposed-view lint."""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import context_memory as cm

TARGET=3072


def entry(r,status):
    return f'{r.id} | {status} | {r.title} | paths={",".join(r.meta.get("paths",["*"]))} | {r.path}'


def brief(root,base=None,scope=None,all_items=False):
    if scope is not None and scope != "*" and not cm.safe_path(scope):
        raise ValueError("invalid scope path")
    v=cm.load_effective(root,base)
    text=cm.git(root,'show',f'{v.base}:docs/STATE.md')
    # Focus and legacy notes are from the same accepted snapshot as records.
    focus=re.search(r'^## (?:Current Active Focus|Focus)\s*\n(.*?)(?=^## |\Z)',text,re.M|re.S)
    legacy=re.search(r'^## Legacy notes \(unreviewed\)\s*\n(.*?)(?=^## |\Z)',text,re.M|re.S)
    selected=lambda r: scope is None or any(cm.scope_matches(p,scope) for p in r.meta.get('paths',['*']))
    lines=[f'BASE {v.base} | VIEW effective | records={len(v.records)} unparsed={len(v.errors)}','FOCUS']
    if focus: lines.append(focus.group(1).strip()[:600])
    if legacy and legacy.group(1).strip(): lines+=['LEGACY (treat as open blockers)',legacy.group(1).strip()]
    lines.append('BLOCKERS')
    lines.extend(entry(r,'open') for rid,r in sorted(v.records.items()) if r.kind=='BLK' and v.statuses[rid]=='open' and selected(r))
    lines.append('ACTIVE DECISIONS' if scope else 'CRITICAL DECISIONS')
    lines.extend(entry(r,'active') for rid,r in sorted(v.records.items()) if r.kind=='DEC' and v.statuses[rid]=='active' and (scope or r.meta.get('critical')) and selected(r))
    lines.append('CONFLICTS')
    for topic,ids in sorted(v.conflicts.items()):
        if any(selected(v.records[rid]) for rid in ids): lines.append(f'CONFLICT {topic}: '+', '.join(ids))
    lines.append('UNPARSED / INVALID')
    lines.extend(v.errors)
    lines.append('OPEN HANDOFFS')
    handoffs=sorted((r for rid,r in v.records.items() if r.kind=='HND' and v.statuses[rid]=='open' and selected(r)),key=lambda r:(r.created,r.id),reverse=True)
    cap=len(handoffs) if all_items or scope else 5
    shown=0
    for r in handoffs[:cap]:
        line=entry(r,'open')
        if not all_items and not scope and len(('\n'.join(lines+[line])).encode())>TARGET-400: break
        lines.append(line); shown+=1
    if len(handoffs)>shown: lines.append(f'+{len(handoffs)-shown} open handoffs not shown; run ctx.py brief --all')
    lines.append('LIVE (verify-live)')
    try:
        branch=cm.git(root,'branch','--show-current'); count=len(cm.git(root,'worktree','list','--porcelain').split('worktree '))-1
        lines.append(f'branch={branch or "detached"} worktrees={count}')
    except ValueError: lines.append('LIVE GIT STATE UNAVAILABLE')
    try:
        result=subprocess.run(['gh','pr','list','--state','open','--limit','100','--json','number,url'],cwd=root,capture_output=True,text=True,timeout=3)
        if result.returncode: raise ValueError('unavailable')
        prs=json.loads(result.stdout)
        for pr in prs if all_items else prs[:10]: lines.append(f'PR #{int(pr["number"])} {pr["url"]}')
        if len(prs)>10 and not all_items: lines.append(f'+{len(prs)-10} more open PRs')
    except (OSError,ValueError,KeyError,TypeError,subprocess.TimeoutExpired): lines.append('LIVE PR STATE UNAVAILABLE')
    size=len('\n'.join(lines).encode())
    lines.append(f'{"OVERFLOW " if size>TARGET else ""}size={size} bytes target={TARGET} (advisory; required items never cut)')
    lines.append('END brief')
    return '\n'.join(lines), 3 if v.errors or v.conflicts else 0


def new(root,kind,slug,task=None):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}',slug): raise ValueError('slug must use lowercase letters, digits and hyphens')
    if task is not None and (kind!='HND' or not re.fullmatch(r'[A-Za-z0-9_.-]{1,120}',task)):
        raise ValueError('task must be a safe handoff task ID')
    base=cm.load_effective(root); proposed=cm.load_proposed(root)
    directory=Path(root)/'docs/memory'; directory.mkdir(parents=True,exist_ok=True)
    if directory.is_symlink(): raise ValueError('memory directory is a symlink')
    occupied=set(base.records)|set(proposed.records)
    # Include malformed/renamed base files in collision checks too.
    names=cm.git(root,'ls-tree','-r','--name-only',base.base,'--','docs/memory').splitlines()+[p.name for p in directory.iterdir()]
    for _ in range(32):
        rid=kind+'-'+secrets.token_hex(8)
        if rid in occupied or any(Path(n).name.startswith(rid) for n in names): continue
        path=directory/(rid+'-'+slug+'.md')
        meta=dict(id=rid,title=slug.replace('-',' ').capitalize(),created=dt.date.today().isoformat())
        if kind=='DEC': meta.update(topic=slug,paths=['*'])
        if kind=='BLK': meta.update(paths=['*'])
        if kind=='HND':
            meta.update(status='open',paths=['*'])
            if task: meta['task']=task
        content='+++\n'+'\n'.join(f'{k} = {json.dumps(v)}' for k,v in meta.items())+'\n+++\nDescribe the decision, blocker or follow-up and its evidence.\n'
        try:
            with path.open('x',encoding='utf-8') as f: f.write(content)
        except FileExistsError: continue
        return str(path.relative_to(root))
    raise ValueError('ID allocation exhausted; no file overwritten')


def lint(root,changed=None):
    proposed=cm.load_proposed(root)
    lines=list(proposed.errors); changed_ids=set()
    try:
        effective=cm.load_effective(root,changed)
        changed_paths=set(cm.git(root,'diff','--name-only',effective.base,'--','docs/memory').splitlines())
        changed_paths.update(cm.git(root,'ls-files','--others','--exclude-standard','--','docs/memory').splitlines())
        changed_ids={rid for rid,r in proposed.records.items() if r.path in changed_paths}
        lines.append('PROPOSED CLOSURES')
        for rid,r in proposed.records.items():
            if r.path not in changed_paths: continue
            for relation in cm.RELATIONS:
                for target in r.meta.get(relation,[]):
                    if target in effective.records and effective.statuses[target] in ('active','open'):
                        flag=' CRITICAL' if effective.records[target].meta.get('critical') else ''
                        lines.append(f'{target} <- {rid} ({relation}){flag}')
        lines.append('PROPOSED EDITS')
        for rid,r in effective.records.items():
            other=proposed.records.get(rid)
            if other and other.raw!=r.raw: lines.append(rid)
        lines.append('PROPOSED DELETIONS')
        for rid in effective.records:
            if rid not in proposed.records: lines.append(rid)
    except ValueError:
        if changed: lines.append('ERROR: trusted comparison base unavailable'); return '\n'.join(lines),1
        lines.append('NOTICE: trusted comparison unavailable; structural lint only')
    for topic,ids in proposed.conflicts.items(): lines.append('CONFLICT '+topic+': '+', '.join(ids))
    today=dt.date.today()
    for rid,r in proposed.records.items():
        if len(r.body.encode())>1536: lines.append('WARNING body over 1.5 KiB: '+rid)
        if r.kind=='HND' and proposed.statuses[rid]=='open' and (today-dt.date.fromisoformat(r.created)).days>14:
            lines.append('WARNING old open handoff: '+rid)
        if re.search(r'\b(?:CI is green|PR approved)\b',r.body,re.I): lines.append('WARNING live state claim; verify revision: '+rid)
        for key in cm.RELATIONS:
            for target in r.meta.get(key,[]):
                if target in proposed.records and proposed.records[target].created>r.created: lines.append('WARNING target dated after source: '+rid)
    if sum(r.meta.get('critical',False) and proposed.statuses[rid]=='active' for rid,r in proposed.records.items())>12:
        lines.append('WARNING more than 12 active critical decisions')
    if sum(r.kind=='BLK' and proposed.statuses[rid]=='open' for rid,r in proposed.records.items())>10:
        lines.append('WARNING more than 10 open blockers')
    exit_code=1 if proposed.errors else 2 if changed and any(changed_ids.intersection(ids) for ids in proposed.conflicts.values()) else 0
    lines.append(f'Lint: {len(proposed.records)} records, {len(proposed.errors)} errors, {len(proposed.conflicts)} conflicts')
    return '\n'.join(lines),exit_code


def main():
    p=argparse.ArgumentParser(description=__doc__); commands=p.add_subparsers(dest='command',required=True)
    b=commands.add_parser('brief'); b.add_argument('--base'); b.add_argument('--scope'); b.add_argument('--all',action='store_true')
    n=commands.add_parser('new'); n.add_argument('kind',choices=['decision','blocker','handoff']); n.add_argument('slug'); n.add_argument('--task')
    l=commands.add_parser('lint'); l.add_argument('--changed')
    args=p.parse_args()
    try:
        root=Path(cm.git(Path.cwd(),'rev-parse','--show-toplevel'))
        if args.command=='brief': output,code=brief(root,args.base,args.scope,args.all)
        elif args.command=='lint': output,code=lint(root,args.changed)
        else: output,code=new(root,{'decision':'DEC','blocker':'BLK','handoff':'HND'}[args.kind],args.slug,args.task),0
        print(output); return code
    except (ValueError,OSError,UnicodeError):
        print('CONTEXT INCOMPLETE: trusted source or tooling unavailable; use context_memory.py fallback; block affected work if incomplete')
        return 4 if args.command=='brief' else 1

if __name__=='__main__': raise SystemExit(main())
