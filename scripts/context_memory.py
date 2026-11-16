#!/usr/bin/env python3
"""Small trusted-base memory loader. No cache, network, or executable record fields."""
from __future__ import annotations
import datetime as dt
import re
import subprocess
import tomllib
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from check_secrets import FORBIDDEN_PATTERNS

ID = re.compile(r'^(DEC|BLK|HND)-[0-9a-f]{16}$')
FIELDS = {'id','title','created','topic','critical','paths','supersedes','revokes','resolves','status','task','refs','observed','aliases'}
RELATIONS = ('supersedes','revokes','resolves')
MAX_FILE = 16384

@dataclass
class Record:
    id: str
    kind: str
    path: str
    title: str
    created: str
    meta: dict
    body: str
    raw: str

@dataclass
class View:
    records: dict[str, Record] = field(default_factory=dict)
    statuses: dict[str,str] = field(default_factory=dict)
    conflicts: dict[str,list[str]] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    base: str | None = None


def git(root, *args, binary=False, timeout=10):
    try:
        result = subprocess.run(['git', '-c', f'safe.directory={Path(root).resolve()}', *args], cwd=root,
                                capture_output=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError('Git unavailable or timed out') from exc
    if result.returncode:
        raise ValueError('Git command failed: '+str(args[0]))
    return result.stdout if binary else result.stdout.decode('utf-8').strip()


def resolve_base(root, requested=None):
    import os
    value = requested or os.environ.get('CTX_BASE')
    if value:
        # Restrict input to object IDs; options/ref expressions cannot become authority.
        if not re.fullmatch(r'[0-9a-fA-F]{7,64}', value):
            raise ValueError('Base must be a commit SHA')
        sha=git(root,'rev-parse','--verify',value+'^{commit}')
    else:
        sha=git(root,'merge-base','HEAD','origin/main')
    git(root,'merge-base','--is-ancestor',sha,'origin/main')
    return sha


def scope_matches(pattern, path):
    if pattern == '*' or path == '*': return True
    def components(s):
        return tuple(PurePosixPath(s.rstrip('/')).parts)
    a,b=components(pattern),components(path)
    return a[:len(b)]==b or b[:len(a)]==a


def safe_path(value):
    return (isinstance(value,str) and value and '\\' not in value and
            not any(ord(c)<32 for c in value) and not value.startswith('/') and
            '..' not in PurePosixPath(value).parts and value not in ('.',''))


def parse_record(path, content):
    if len(content.encode('utf-8')) > MAX_FILE: raise ValueError('record exceeds file limit')
    if any(p.search(content) or p.search(str(path)) for p,_ in FORBIDDEN_PATTERNS):
        raise ValueError('secret-pattern hit (content withheld)')
    lines=content.splitlines(keepends=True)
    if not lines or lines[0].strip()!='+++': raise ValueError('missing front matter')
    end=next((i for i in range(1,len(lines)) if lines[i].strip()=='+++'),None)
    if end is None: raise ValueError('unterminated front matter')
    try: meta=tomllib.loads(''.join(lines[1:end]))
    except tomllib.TOMLDecodeError as exc: raise ValueError('invalid TOML') from exc
    if set(meta)-FIELDS: raise ValueError('unknown metadata fields')
    rid=meta.get('id','')
    if not isinstance(rid,str) or not ID.fullmatch(rid): raise ValueError('invalid record ID')
    if not Path(path).name.startswith(rid+'-') or not str(path).endswith('.md'):
        raise ValueError('filename and ID mismatch')
    title=meta.get('title')
    if not isinstance(title,str) or not title.strip() or len(title)>100 or any(ord(c)<32 for c in title):
        raise ValueError('invalid title')
    created=meta.get('created')
    if isinstance(created,dt.date) and not isinstance(created,dt.datetime): created=created.isoformat()
    if not isinstance(created,str): raise ValueError('missing created date')
    try: dt.date.fromisoformat(created)
    except ValueError as exc: raise ValueError('invalid created date') from exc
    kind=rid[:3]
    for key in ('paths','aliases','refs','observed',*RELATIONS):
        if key in meta and (not isinstance(meta[key],list) or any(not isinstance(v,str) for v in meta[key])):
            raise ValueError('invalid list field '+key)
    for key in RELATIONS:
        if any(not ID.fullmatch(v) for v in meta.get(key,[])): raise ValueError('invalid relation ID')
    if 'critical' in meta and (kind!='DEC' or type(meta['critical']) is not bool):
        raise ValueError('critical is a decision boolean')
    if kind=='DEC':
        if not isinstance(meta.get('topic'),str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}',meta['topic']):
            raise ValueError('missing or invalid decision topic')
        if meta.get('revokes') and meta.get('supersedes'): raise ValueError('retraction cannot supersede')
    elif any(k in meta for k in ('topic','supersedes','revokes')):
        raise ValueError('decision-only field')
    if kind=='HND':
        if meta.get('status') not in ('open','done'): raise ValueError('handoff status required')
    elif 'status' in meta or 'task' in meta: raise ValueError('handoff-only field')
    if 'task' in meta and (not isinstance(meta['task'],str) or len(meta['task'])>120 or not re.fullmatch(r'[A-Za-z0-9_.-]+',meta['task'])):
        raise ValueError('invalid task')
    paths=meta.get('paths',[])
    if (kind=='BLK' or meta.get('critical')) and not paths: raise ValueError('paths required')
    if any(v!='*' and not safe_path(v) for v in paths): raise ValueError('invalid scope path')
    if any(not re.fullmatch(r'(pr|commit|bug|run|file):[^\s]+',v) for v in meta.get('refs',[])):
        raise ValueError('invalid reference')
    if any(not re.search(r'@[0-9a-fA-F]{7,64}$',v) for v in meta.get('observed',[])):
        raise ValueError('observation requires revision')
    body=''.join(lines[end+1:])
    if len(body.encode('utf-8'))>3072: raise ValueError('body exceeds 3 KiB')
    return Record(rid,kind,str(path),title,created,meta,body,content)


def derive(records, errors=(), base=None):
    view=View(errors=list(errors),base=base)
    duplicate=set()
    for record in records:
        if record.id in view.records:
            duplicate.add(record.id); view.errors.append('duplicate ID: '+record.id)
        else: view.records[record.id]=record
    # Keep a representative visible; duplicate IDs cannot close anything.
    edges=[]
    for r in view.records.values():
        for field_name in RELATIONS:
            for target_id in r.meta.get(field_name,[]):
                target=view.records.get(target_id)
                valid=target is not None and target_id!=r.id and r.id not in duplicate and target_id not in duplicate
                if field_name in ('supersedes','revokes'):
                    valid=valid and r.kind=='DEC' and target.kind=='DEC' and r.meta.get('topic')==target.meta.get('topic')
                else: valid=valid and target.kind in ('BLK','HND')
                if valid: edges.append((r.id,target_id,field_name))
                else: view.errors.append(f'invalid {field_name} relation: {r.id} -> {target_id}')
    # Identify cyclic SCCs; invalid cycle edges close nothing, with no recursion depth limit.
    adjacency={rid:[] for rid in view.records}
    for a,b,_ in edges: adjacency[a].append(b)
    cyclic=set()
    for start in adjacency:
        stack=list(adjacency[start]); seen=set()
        while stack:
            node=stack.pop()
            if node==start: cyclic.add(start); break
            if node not in seen:
                seen.add(node); stack.extend(adjacency[node])
    if cyclic: view.errors.append('relation cycle: '+', '.join(sorted(cyclic)))
    closed={b for a,b,_ in edges if a not in cyclic and b not in cyclic}
    for rid,r in view.records.items():
        if r.kind=='DEC' and r.meta.get('revokes'): status='retracted'
        elif rid in closed: status='closed'
        elif r.kind=='DEC': status='active'
        elif r.kind=='BLK': status='open'
        else: status=r.meta['status']
        view.statuses[rid]=status
    topics={}
    for rid,r in view.records.items():
        if r.kind=='DEC' and view.statuses[rid]=='active': topics.setdefault(r.meta['topic'],[]).append(rid)
    view.conflicts={t:sorted(ids) for t,ids in topics.items() if len(ids)>1}
    return view


def _error(path, exc):
    # Avoid rendering attacker-controlled or credential-bearing names.
    label=path if re.fullmatch(r'docs/memory/[A-Za-z0-9_.-]+\.md',str(path)) and not any(p.search(str(path)) for p,_ in FORBIDDEN_PATTERNS) else '<unsafe record path>'
    return f'UNPARSED {label}: {exc}'


def load_proposed(root):
    root=Path(root); directory=root/'docs/memory'; records=[]; errors=[]
    if not directory.exists() and not directory.is_symlink(): return derive([])
    if directory.is_symlink() or (root/'docs').is_symlink(): raise ValueError('memory directory is a symlink')
    try: paths=sorted(directory.iterdir())
    except OSError as exc: raise ValueError('memory directory unreadable') from exc
    for path in paths:
        if path.name=='README.md': continue
        rel='docs/memory/'+path.name
        if path.suffix!='.md':
            errors.append(_error(rel,'unsupported memory entry')); continue
        try:
            if path.is_symlink() or not path.is_file(): raise ValueError('not a regular record')
            if path.stat().st_size>MAX_FILE: raise ValueError('record exceeds file limit')
            records.append(parse_record(rel,path.read_text(encoding='utf-8')))
        except (ValueError,OSError,UnicodeError) as exc:
            errors.append(_error(rel, 'unreadable record' if not isinstance(exc,ValueError) else exc))
    return derive(records,errors)


def load_effective(root, base=None):
    sha=resolve_base(root,base)
    entries=git(root,'ls-tree','-rlz',sha,'--','docs/memory',binary=True)
    requests=[]; records=[]; errors=[]
    for entry in entries.split(b'\0'):
        if not entry: continue
        attrs,path_bytes=entry.split(b'\t',1); path=path_bytes.decode('utf-8','replace')
        if path=='docs/memory/README.md': continue
        mode,kind,oid,size=attrs.split()
        if mode not in (b'100644',b'100755') or kind!=b'blob' or int(size)>MAX_FILE:
            errors.append(_error(path,'invalid record object')); continue
        requests.append((path,oid.decode()))
    if requests:
        try:
            proc=subprocess.run(['git','-c',f'safe.directory={Path(root).resolve()}','cat-file','--batch'],cwd=root,
                input=('\n'.join(oid for _,oid in requests)+'\n').encode(),capture_output=True,timeout=10)
            if proc.returncode: raise ValueError('Git object read failed')
        except (OSError,subprocess.TimeoutExpired) as exc: raise ValueError('Git object read unavailable') from exc
        data=proc.stdout; offset=0
        for path,_ in requests:
            header_end=data.find(b'\n',offset); header=data[offset:header_end].split()
            if len(header)!=3 or header[1]!=b'blob': raise ValueError('incomplete Git object read')
            size=int(header[2]); raw=data[header_end+1:header_end+1+size]; offset=header_end+size+2
            try: records.append(parse_record(path,raw.decode('utf-8')))
            except (ValueError,UnicodeError) as exc: errors.append(_error(path,'invalid encoding' if isinstance(exc,UnicodeError) else exc))
    return derive(records,errors,sha)


def main():
    """Direct-source fallback: independent of ctx CLI and search cache."""
    import argparse
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--base'); args=p.parse_args()
    try:
        root=Path(git(Path.cwd(),'rev-parse','--show-toplevel')); view=load_effective(root,args.base)
        print('BASE',view.base,'VIEW effective')
        for rid,r in sorted(view.records.items()):
            print(rid,view.statuses[rid],r.title,r.meta.get('paths',[]),r.path,sep=' | ')
        for topic,ids in view.conflicts.items(): print('CONFLICT',topic,', '.join(ids))
        for error in view.errors: print(error)
        print('END fallback')
        return 3 if view.errors or view.conflicts else 0
    except (ValueError,OSError):
        print('FALLBACK INCOMPLETE: trusted context unavailable; affected work is blocked')
        return 4

if __name__=='__main__': raise SystemExit(main())
