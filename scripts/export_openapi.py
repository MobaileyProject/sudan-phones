#!/usr/bin/env python3
"""Export or check the real Django/DRF OpenAPI contract without starting a server."""
import argparse
import importlib
import json
import os
from pathlib import Path
import sys


def generate_openapi_schema(backend):
    sys.path.insert(0, str(backend))
    # Allow a lightweight test interface if manage.py defines openapi or app
    try:
        manage_mod = importlib.import_module("manage")
        if hasattr(manage_mod, "openapi"):
            return manage_mod.openapi()
        if hasattr(manage_mod, "get_schema"):
            return manage_mod.get_schema()
        if hasattr(manage_mod, "app") and hasattr(manage_mod.app, "openapi"):
            return manage_mod.app.openapi()
    except Exception as exc:
        if not (backend / "config/settings.py").is_file():
            raise exc

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django
    from django.conf import settings
    if not settings.configured:
        django.setup()
    from drf_spectacular.generators import SchemaGenerator
    generator = SchemaGenerator()
    schema = generator.get_schema(request=None, public=True)
    if not schema:
        raise RuntimeError("drf-spectacular returned empty schema")
    return schema


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the committed contract differs")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    backend = root / "backend"
    entrypoint = backend / "manage.py"
    contract = root / "docs/openapi.json"

    if not entrypoint.is_file():
        if backend.exists() and any(backend.rglob("*.py")):
            print("OpenAPI failed: backend Python code exists but backend/manage.py is missing.",
                  file=sys.stderr)
            return 1
        if contract.exists():
            print("OpenAPI failed: docs/openapi.json exists without a backend to verify it.",
                  file=sys.stderr)
            return 1
        print("SKIP OpenAPI: backend scaffold pending (backend/manage.py does not exist).")
        return 0

    try:
        schema = generate_openapi_schema(backend)
        generated = json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
        if args.check:
            if not contract.is_file() or contract.read_text(encoding="utf-8") != generated:
                print("OpenAPI drift: run make openapi and commit docs/openapi.json.", file=sys.stderr)
                return 1
            print("OpenAPI contract matches backend.")
        else:
            contract.parent.mkdir(parents=True, exist_ok=True)
            contract.write_text(generated, encoding="utf-8")
            print("Generated docs/openapi.json.")
    except Exception as exc:
        print(f"OpenAPI failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
