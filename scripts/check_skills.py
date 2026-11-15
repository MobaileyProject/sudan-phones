#!/usr/bin/env python3
"""Validate this repository's portable skill entries and pinned upstream payloads."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


def payload_digest(directory):
    digest = hashlib.sha256()
    for path in sorted(directory.rglob('*')):
        if path.is_file():
            digest.update(path.relative_to(directory).as_posix().encode() + b'\0')
            digest.update(path.read_bytes() + b'\0')
    return digest.hexdigest()


def scalar(frontmatter, key):
    match = re.search(rf'^{key}:[ \t]*([^\r\n]*)$', frontmatter, re.MULTILINE)
    if not match:
        return ''
    value = match[1].strip()
    if value.startswith('"'):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, str) else ''
        except json.JSONDecodeError:
            return ''
    if (not value or value[0] in "'[]{}|>!*&%@`" or ': ' in value or
            ' #' in value or value.lower() in {'null', '~', 'true', 'false'} or
            re.fullmatch(r'[-+]?\d+(?:\.\d+)?', value)):
        return ''
    return value


def validate(root):
    directory = root / '.agents/skills'
    manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('version') != 1 or not isinstance(manifest.get('skills'), list):
        raise ValueError('Unsupported skills manifest format')
    errors, names = [], set()
    for record in manifest['skills']:
        name = record.get('name', '')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name) or len(name) > 64:
            errors.append(f'Invalid skill name: {name!r}')
            continue
        if name in names:
            errors.append(f'Duplicate skill name: {name}')
        names.add(name)
        package = directory / name
        entry = package / 'SKILL.md'
        if not entry.is_file():
            errors.append(f'{name}: missing SKILL.md')
            continue
        symlinks = [path for path in [package, *package.rglob('*')] if path.is_symlink()]
        if symlinks:
            errors.append(f'{name}: symlink resources are not permitted')
            continue
        text = entry.read_text(encoding='utf-8')
        match = re.match(r'\A---\n(.*?)\n---\n', text, re.DOTALL)
        metadata = match[1] if match else ''
        if scalar(metadata, 'name') != name:
            errors.append(f'{name}: frontmatter name must match folder')
        description = scalar(metadata, 'description')
        if not isinstance(description, str) or not 1 <= len(description) <= 1024:
            errors.append(f'{name}: missing/invalid description')
        # Entries deliberately use simple portable scalar metadata; upstream copies
        # are references and are not parsed as additional discoverable skills.
        for target in re.findall(r'\[[^\]]*\]\(([^\s)]+)\)', text):
            url = urlsplit(target)
            if url.scheme or url.netloc or not url.path:
                continue
            path = (package / unquote(url.path)).resolve()
            if not path.is_relative_to(root) or not path.is_file():
                errors.append(f'{name}: missing or escaping reference {target}')
        if record.get('kind') == 'upstream':
            source = record.get('source', {})
            if not re.fullmatch(r'[0-9a-f]{40}', source.get('revision', '')):
                errors.append(f'{name}: upstream revision must be a fixed commit SHA')
            if not source.get('repo') or not source.get('path'):
                errors.append(f'{name}: missing upstream source')
            payload = package / 'upstream'
            if not payload.is_dir() or payload_digest(payload) != record.get('payload_sha256'):
                errors.append(f'{name}: upstream integrity check failed')
            licenses = record.get('license_files', [])
            if not licenses or any(
                not (package / item).resolve().is_relative_to(package.resolve()) or
                not (package / item).is_file() for item in licenses
            ):
                errors.append(f'{name}: missing or invalid license file')
            if not (payload / 'GUIDE.md').is_file():
                errors.append(f'{name}: missing upstream GUIDE.md')
        elif record.get('kind') != 'custom':
            errors.append(f'{name}: unknown package kind')
    actual = {p.parent.name for p in directory.glob('*/SKILL.md')}
    for name in sorted(actual - names):
        errors.append(f'Unlisted skill package: {name}')
    for nested in directory.glob('*/**/SKILL.md'):
        if nested.parent.parent != directory:
            errors.append(f'Duplicate nested discovery entry: {nested.relative_to(root)}')
    return errors, len(names)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        errors, count = validate(args.root.resolve())
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        errors, count = [f'Cannot validate skill packages: {exc}'], 0
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'Validated {count} skill packages: discovery, local entry links, pinned sources and payload integrity.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
