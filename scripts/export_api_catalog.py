#!/usr/bin/env python3
"""Export the current API catalog from the actual committed OpenAPI contract."""
import argparse
import json
from pathlib import Path

METHODS = {'get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'}


def operations(schema):
    rows, ids = [], set()
    for path, item in sorted(schema.get('paths', {}).items()):
        for method, operation in sorted(item.items()):
            if method not in METHODS:
                continue
            api_id = operation.get('x-api-id')
            if not api_id or api_id in ids:
                raise ValueError(f'API ID missing or duplicated: {method.upper()} {path}')
            ids.add(api_id)
            rows.append({'api_id': api_id, 'method': method.upper(), 'path': path,
                         'phase': operation.get('x-phase', ''),
                         'operation_id': operation['operationId'],
                         'authentication': 'required' if operation.get('security', schema.get('security')) else 'public'})
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        rows = operations(json.loads((args.root / 'docs/openapi.json').read_text()))
        markdown = ('# Implemented API catalog\n\nGenerated from `docs/openapi.json`; run `make openapi`. '
                    'See [bootstrap contracts](bootstrap.md) for schemas, errors and examples.\n\n'
                    '| ID | Method | Path | Phase | Authentication |\n| --- | --- | --- | --- | --- |\n')
        markdown += ''.join(f"| {r['api_id']} | {r['method']} | `{r['path']}` | {r['phase']} | {r['authentication']} |\n" for r in rows)
        outputs = {'operations.json': json.dumps(rows, indent=2, ensure_ascii=False) + '\n', 'CATALOG.md': markdown}
        target = args.root / 'docs/api'
        for name, content in outputs.items():
            path = target / name
            if args.check:
                if not path.is_file() or path.read_text(encoding='utf-8') != content:
                    raise ValueError(f'API catalog drift: {name}; run make openapi')
            else:
                target.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding='utf-8')
    except (OSError, ValueError, KeyError) as exc:
        print(f'API catalog failed: {exc}')
        return 1
    print('API catalog matches OpenAPI.' if args.check else 'Generated current API catalog.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
