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


def refresh(db, root, rebuild=False):
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
        for name, path in source_files(root):
            try:
                data = path.read_bytes()
                if b"\0" in data:
                    continue
                content = data.decode("utf-8")
            except (OSError, UnicodeError):
                continue
            seen.add(name)
            digest = hashlib.sha256(data).hexdigest()
            if previous.get(name) == digest:
                continue
            db.execute("DELETE FROM chunks WHERE path = ?", (name,))
            db.executemany("INSERT INTO chunks(path, start, end, symbol, body) "
                           "VALUES (?, ?, ?, ?, ?)", chunks(name, content))
            db.execute("INSERT OR REPLACE INTO files VALUES (?, ?)", (name, digest))
        for name in previous.keys() - seen:
            db.execute("DELETE FROM chunks WHERE path = ?", (name,))
            db.execute("DELETE FROM files WHERE path = ?", (name,))


def search(db, query, limit):
    # Quoted literal tokens prevent FTS operators or SQL injection through queries.
    terms = re.findall(r"[^\W_]+", query, flags=re.UNICODE)
    expression = " AND ".join('"' + term + '"' for term in terms)
    rows = db.execute(
        "SELECT path, start, end, body FROM chunks WHERE chunks MATCH ? "
        "ORDER BY bm25(chunks), path, CAST(start AS INTEGER) LIMIT ?",
        (expression, limit),
    ).fetchall()
    if not rows:
        return "No matches. Try fewer terms or use rg for substring searches.\n"
    blocks = []
    # Give each result a fair share of the total output budget, paths included.
    allowance = (MAX_OUTPUT - 1) // len(rows)
    for name, start, end, body in rows:
        header = f"{name}:{start}-{end}\n"
        source = "\n".join(f"{int(start) + i}: {line}" for i, line in enumerate(body.splitlines()))
        block = header + source
        if len(block) > allowance - 2:
            block = block[:allowance - 18] + "\n[truncated]"
        blocks.append(block)
    return ("\n\n".join(blocks) + "\n")[:MAX_OUTPUT]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", help="Literal words; all must match within one source chunk")
    parser.add_argument("--limit", type=int, default=5, help="Maximum results, 1-20 (default 5)")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--rebuild", action="store_true", help="Rebuild this checkout's cache")
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        parser.error("--limit must be between 1 and 20")
    if not re.search(r"[^\W_]+", args.query, re.UNICODE):
        parser.error("query must contain at least one word or number")
    root = args.root.resolve()
    try:
        with sqlite3.connect(root / ".search_index.db", timeout=30) as db:
            refresh(db, root, args.rebuild)
            sys.stdout.write(search(db, args.query, args.limit))
    except (sqlite3.Error, OSError, subprocess.SubprocessError) as exc:
        print(f"Search failed: {exc}. SQLite FTS5 and a Git checkout are required. "
              "Try --rebuild for an incompatible cache.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
