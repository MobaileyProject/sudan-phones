"""Prepare opt-in worker context only after an accepted migration gate."""
import os
from pathlib import Path
import subprocess
import sys
import time

import context_memory as cm
import context_migration as migration


def _text(value):
    return value.decode('utf-8', errors='replace') if isinstance(value, bytes) else (value or '')


def prepare_context(root, config):
    """Return a complete pinned brief and metadata, or the unchanged v1 selection."""
    version = config.get('context_prompt_version', 1)
    if type(version) is int and version == 1:
        return None, {'_prompt_version': 1}
    if type(version) is not int or version != 2:
        raise RuntimeError('Context prompt version must be 1 or 2')
    root = Path(root).resolve()
    try:
        # HEAD must itself be accepted: its ancestor alone cannot authorize cutover.
        base = cm.resolve_base(root, cm.git(root, 'rev-parse', 'HEAD'))
        source = migration.Source(root, base)
        if not source.manifests() or '## Context protocol' not in source.read('AGENTS.md').decode('utf-8'):
            raise ValueError('Accepted migration missing')
        if migration.validate(root, base):
            raise ValueError('Accepted migration incomplete')
    except (ValueError, OSError, UnicodeError, subprocess.SubprocessError):
        raise RuntimeError('Context v2 unavailable: accepted HEAD requires validated coverage and context protocol') from None
    env = {key: value for key, value in os.environ.items() if not key.startswith('SLACK_')}
    env['CTX_BASE'] = base
    try:
        index = int(env.get('GIT_CONFIG_COUNT', '0'))
    except ValueError:
        raise RuntimeError('Context v2 unavailable: invalid session Git configuration') from None
    env['GIT_CONFIG_KEY_' + str(index)] = 'safe.directory'
    env['GIT_CONFIG_VALUE_' + str(index)] = str(root)
    env['GIT_CONFIG_COUNT'] = str(index + 1)
    started = time.monotonic()
    try:
        process = subprocess.run([sys.executable, str(root / 'scripts/ctx.py'), 'brief', '--base', base],
                                 cwd=root, env=env, capture_output=True, text=True, timeout=10)
        brief = process.stdout
        brief_exit = process.returncode
        lines = brief.strip().splitlines()
        if brief_exit == 0 and (not lines or lines[0].partition(' | ')[0] != 'BASE ' + base
                                or lines[-1].strip() != 'END brief'):
            brief_exit = 4
            brief += '\nINCOMPLETE CONTEXT: brief pin or completion marker invalid; follow blocked-task rules.\n'
        elif brief_exit:
            brief += '\nINCOMPLETE CONTEXT: brief failed; follow blocked-task rules.\n'
    except subprocess.TimeoutExpired as exc:
        brief = _text(exc.stdout) + '\nINCOMPLETE CONTEXT: brief timed out; follow blocked-task rules.\n'
        brief_exit = 124
    except (OSError, UnicodeError):
        brief = 'INCOMPLETE CONTEXT: brief unavailable; follow blocked-task rules.\n'
        brief_exit = 127
    metadata = {'_prompt_version': 2, '_base_sha': base, '_brief_exit': brief_exit,
                '_brief_bytes': len(brief.encode('utf-8')),
                '_brief_ms': round((time.monotonic() - started) * 1000, 3)}
    return {'base': base, 'brief': brief}, metadata
