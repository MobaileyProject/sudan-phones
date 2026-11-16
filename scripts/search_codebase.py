#!/usr/bin/env python3
"""Incremental, local-only code/document search with Git discovery and SQLite FTS5."""
import argparse
import ast
import hashlib
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
from types import SimpleNamespace

from check_secrets import FORBIDDEN_PATTERNS

EXTENSIONS = {".py", ".kt", ".kts", ".java", ".js", ".jsx", ".ts", ".tsx",
              ".md", ".json", ".sql", ".toml", ".yaml", ".yml", ".html", ".css"}
EXCLUDED_NAMES = {"credentials.json", "local.properties", "package-lock.json",
                  "pnpm-lock.yaml", "yarn.lock"}
MAX_FILE_BYTES = 1024 * 1024
MAX_OUTPUT = 5000
CHUNK_LINES = 18


def source_files(root):
    """Use Git's ignore rules and reject hidden paths and all symlink components."""
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=root, check=True, capture_output=True,
    )
    ignored = subprocess.run(
        ["git", "ls-files", "--cached", "--ignored", "--exclude-standard", "-z"],
        cwd=root, check=True, capture_output=True,
    )
    names = set(result.stdout.decode("utf-8").split("\0"))
    excluded = set(ignored.stdout.decode("utf-8").split("\0")) | {""}
    for name in sorted(names - excluded):
        relative = Path(name)
        if (relative.is_absolute() or ".." in relative.parts or
                any(part.startswith(".") for part in relative.parts) or
                relative.suffix.lower() not in EXTENSIONS or
                relative.name.lower() in EXCLUDED_NAMES or
                any(word in relative.name.lower() for word in ("credential", "secret", ".env"))):
            continue
        path = root / relative
        if any(parent.is_symlink() for parent in (path, *path.parents) if parent != root):
            continue
        if path.is_file() and path.stat().st_size <= MAX_FILE_BYTES:
            yield relative.as_posix(), path


def chunks(name, content):
    """Attach Python symbol/route metadata to exact, overlapping source windows."""
    lines = content.splitlines()
    symbols = []
    if name.endswith(".py"):
        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                    start = min([node.lineno] + [d.lineno for d in node.decorator_list])
                    symbols.append((start, node.end_lineno, node.name))
        except (SyntaxError, ValueError, RecursionError):
            pass  # In-progress files remain searchable as plain source.
    # Align a window to each symbol so decorators and definitions stay together.
    starts = set(range(1, len(lines) + 1, CHUNK_LINES - 4))
    starts.update(start for start, _, _ in symbols)
    for start in sorted(starts):
        end = min(start + CHUNK_LINES - 1, len(lines))
        labels = " ".join(symbol for first, last, symbol in symbols
                          if first <= end and last >= start)
        yield (name, start, end, labels, "\n".join(lines[start - 1:end]))


def safe_content(content):
    return not any(pattern.search(content) for pattern, _ in FORBIDDEN_PATTERNS)


def effective_view(root):
    import context_memory as context
    try:
        return context.load_effective(root)
    except (ValueError, OSError, subprocess.SubprocessError):
        return SimpleNamespace(records={}, statuses={}, errors=["Accepted context unavailable"], base=None)


def documents(root, *, memory=False, open_only=False, scope=None, history=False, view=None):
    """Yield validated local sources plus original accepted Git-object records."""
    import context_memory as context
    view = effective_view(root) if view is None else view
    unknown = bool(view.errors) or view.base is None
    accepted = view.records
    for record in accepted.values():
        status = view.statuses.get(record.id, "unknown")
        if not unknown and not history and status in {"closed", "retracted", "done"}:
            continue
        if open_only and not unknown and status not in {"active", "open"}:
            continue
        if scope and scope != "*" and not any(context.scope_matches(pattern, scope)
                             for pattern in record.meta.get("paths", ["*"])):
            continue
        if safe_content(record.raw):
            label = "UNKNOWN" if unknown else "ACCEPTED"
            yield (f"{record.path} [{label} {status} {record.created}]", record.raw)
    for name, path in source_files(root):
        if not history and any(part.lower() in {"archive", "archives"}
                               for part in Path(name).parts):
            continue
        is_memory = name.startswith("docs/memory/")
        if (memory or open_only) and not is_memory:
            continue
        if not is_memory and scope and not context.scope_matches(scope, name):
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        if "\0" in content or not safe_content(content):
            continue
        if is_memory:
            try:
                record = context.parse_record(name, content)
            except ValueError:
                continue
            original = accepted.get(record.id)
            if original and original.path == record.path and original.raw == record.raw:
                continue
            if scope and scope != "*" and not any(context.scope_matches(pattern, scope)
                                 for pattern in record.meta.get("paths", ["*"])):
                continue
            name += f" [PROPOSED {record.created}]"
        yield name, content


def refresh(db, root, rebuild=False, sources=None):
    """Update changed files and remove deleted/ignored records in one transaction."""
    with db:
        if rebuild:
            db.execute("DROP TABLE IF EXISTS chunks")
            db.execute("DROP TABLE IF EXISTS files")
        db.execute("CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, digest TEXT)")
        db.execute("CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5("
                   "path, start UNINDEXED, end UNINDEXED, symbol, body)")
        previous = dict(db.execute("SELECT path, digest FROM files"))
        seen = set()
        if sources is None:
            def local_sources():
                for name, path in source_files(root):
                    try:
                        content = path.read_text(encoding="utf-8")
                    except (OSError, UnicodeError):
                        continue
                    if "\0" not in content and safe_content(content):
                        yield name, content
            sources = local_sources()
        for name, content in sources:
            if not safe_content(content):
                continue
            seen.add(name)
            digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
            if previous.get(name) == digest:
                continue
            db.execute("DELETE FROM chunks WHERE path = ?", (name,))
            db.executemany("INSERT INTO chunks(path, start, end, symbol, body) "
                           "VALUES (?, ?, ?, ?, ?)", chunks(name, content))
            db.execute("INSERT OR REPLACE INTO files VALUES (?, ?)", (name, digest))
        for name in previous.keys() - seen:
            db.execute("DELETE FROM chunks WHERE path = ?", (name,))
            db.execute("DELETE FROM files WHERE path = ?", (name,))


def render(rows, terms, mode):
    if not rows:
        attempted = "scope/open listing" if not terms else "AND and OR"
        return f"No matches (attempted {attempted}). Try fewer terms or git grep for substrings.\n"
    blocks = []
    prefix = "OR fallback\n" if mode == "OR" else ""
    allowance = (MAX_OUTPUT - len(prefix) - 1) // len(rows)
    for name, start, end, body in rows:
        tokens = set(re.findall(r"[^\W_]+", (name + " " + body).casefold(), re.UNICODE))
        hits = sum(term.casefold() in tokens for term in terms)
        weak = " [WEAK]" if terms and hits * 2 < len(terms) else ""
        header = f"{name}:{start}-{end}{weak}\n"
        source = "\n".join(f"{int(start) + i}: {line}" for i, line in enumerate(body.splitlines()))
        block = header + source
        if len(block) > allowance - 2:
            block = block[:max(0, allowance - 18)] + "\n[truncated]"
        blocks.append(block)
    return (prefix + "\n\n".join(blocks) + "\n")[:MAX_OUTPUT]


def search(db, query, limit):
    # Literal quoted terms prevent FTS operators and SQL injection.
    terms = re.findall(r"[^\W_]+", query, flags=re.UNICODE)
    if not terms:
        rows = db.execute("SELECT path, start, end, body FROM chunks ORDER BY path, "
                          "CAST(start AS INTEGER) LIMIT ?", (limit,)).fetchall()
        return render(rows, terms, "listing")
    for mode in ("AND", "OR"):
        expression = f" {mode} ".join('"' + term + '"' for term in terms)
        rows = db.execute(
            "SELECT path, start, end, body FROM chunks WHERE chunks MATCH ? "
            "ORDER BY bm25(chunks), path, CAST(start AS INTEGER) LIMIT ?",
            (expression, limit),
        ).fetchall()
        if rows:
            return render(rows, terms, mode)
    return render([], terms, "OR")


def source_search(sources, query, limit):
    """Safe dependency-free fallback when SQLite cannot rebuild."""
    terms = re.findall(r"[^\W_]+", query, flags=re.UNICODE)
    rows = [row for name, content in sources if safe_content(content)
            for row in chunks(name, content)]
    for mode in ("AND", "OR"):
        hits = []
        for name, start, end, symbol, body in rows:
            words = set(re.findall(r"[^\W_]+", name.casefold() + " " + body.casefold()))
            matches = [term.casefold() in words for term in terms]
            if not terms or (all(matches) if mode == "AND" else any(matches)):
                hits.append((name, start, end, body))
        if hits:
            return render(hits[:limit], terms, mode)
    return render([], terms, "OR")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", nargs="?", default="", help="Literal words to search")
    parser.add_argument("--memory", action="store_true", help="Search memory records only")
    parser.add_argument("--open", dest="open_only", action="store_true", help="List open context")
    parser.add_argument("--scope", help="Filter using component-aware repository scope")
    parser.add_argument("--history", action="store_true", help="Include closed records and archives")
    parser.add_argument("--limit", type=int, default=5, help="Maximum results, 1-20 (default 5)")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--rebuild", action="store_true", help="Rebuild this checkout's cache")
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        parser.error("--limit must be between 1 and 20")
    if not re.search(r"[^\W_]+", args.query, re.UNICODE) and not (not args.query and (args.scope or args.open_only)):
        parser.error("query must contain at least one word or number")
    if args.scope is not None and (not args.scope or Path(args.scope).is_absolute()
            or ".." in Path(args.scope).parts or "\\" in args.scope
            or any(ord(char) < 32 for char in args.scope)):
        parser.error("--scope must be a safe relative repository path")
    root = args.root.resolve()
    try:
        view = effective_view(root)
        notice = "UNKNOWN context: accepted base unavailable or invalid; no status suppression.\n" if view.errors or view.base is None else ""
        sources = list(documents(root, memory=args.memory, open_only=args.open_only,
                                 scope=args.scope, history=args.history, view=view))
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        print(f"Search failed: {type(exc).__name__}", file=sys.stderr)
        return 1
    cache = root / ".search_index.db"
    output = None
    for attempt in range(2):
        try:
            with sqlite3.connect(cache, timeout=30) as db:
                refresh(db, root, args.rebuild or bool(attempt), sources)
                output = search(db, args.query, args.limit)
            break
        except (sqlite3.Error, OSError):
            if attempt == 0:
                try:
                    cache.unlink(missing_ok=True)
                except OSError:
                    pass
    if output is None:
        notice += "SQLite unavailable; safe source fallback.\n"
        output = source_search(sources, args.query, args.limit)
    sys.stdout.write((notice + output)[:MAX_OUTPUT])
    return 0


if __name__ == "__main__":
    sys.exit(main())
