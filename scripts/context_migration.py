#!/usr/bin/env python3
"""Validate byte preservation and explicit STATE migration line coverage.

Committed manifests are immutable historical migration proofs. Their record
targets and legacy stubs are assessed at introduction, permitting later reviewed
resolution or archival. Archives retain byte integrity in the checked view.
New uncommitted manifests must preserve records/stubs in the proposed view.
"""
from pathlib import Path
import re
import tomllib

import context_memory as cm

KINDS = {"blocker", "unfinished", "constraint", "milestone", "evidence", "duplicate", "other"}
LIVE = {"blocker", "unfinished", "constraint"}


def _snapshot_read(root, revision, path):
    entry = cm.git(root, "ls-tree", revision, "--", path)
    if not re.match(r"100(?:644|755) blob [0-9a-f]+\t", entry):
        raise ValueError("file unavailable")
    return cm.git(root, "show", revision + ":" + path, binary=True)


class Source:
    def __init__(self, root, base):
        self.root = Path(root)
        self.base = cm.resolve_base(root, base) if base is not None else None

    def read(self, path):
        if not cm.safe_path(path):
            raise ValueError("unsafe path")
        if self.base:
            return _snapshot_read(self.root, self.base, path)
        target = self.root
        for component in Path(path).parts:
            target /= component
            if target.is_symlink():
                raise ValueError("symlink path")
        if not target.is_file():
            raise ValueError("file unavailable")
        return target.read_bytes()

    def manifests(self):
        if self.base:
            paths = cm.git(self.root, "ls-tree", "-rz", "--name-only", self.base,
                           "--", "docs/archive", binary=True).split(b"\0")
            return [path.decode("utf-8") for path in paths if path and
                    re.fullmatch(rb"docs/archive/COVERAGE-[^/]+\.toml", path)]
        directory = self.root / "docs/archive"
        if (self.root / "docs").is_symlink() or directory.is_symlink():
            raise ValueError("symlink archive directory")
        if not directory.exists():
            return []
        return ["docs/archive/" + path.name for path in sorted(directory.glob("COVERAGE-*.toml"))]


def _introduction_view(source, path, raw, current):
    """Assess migration choices when introduced, permitting later record closure."""
    commits = cm.git(source.root, "log", "--diff-filter=A", "--format=%H", "--reverse",
                     source.base or "HEAD", "--", path).splitlines()
    if not commits:
        return current, None
    revision = commits[0]
    if _snapshot_read(source.root, revision, path) != raw:
        raise ValueError("introduced coverage is immutable")
    # This snapshot validates proposed history too; it is never an authority view.
    entries = cm.git(source.root, "ls-tree", "-rlz", revision, "--", "docs/memory", binary=True)
    records = []
    for entry in entries.split(b"\0"):
        if not entry:
            continue
        attrs, name = entry.split(b"\t", 1)
        record_path = name.decode("utf-8")
        if record_path == "docs/memory/README.md":
            continue
        mode, kind, oid, size = attrs.split()
        if mode not in (b"100644", b"100755") or kind != b"blob" or int(size) > cm.MAX_FILE:
            raise ValueError("invalid introduction record")
        records.append(cm.parse_record(record_path, cm.git(source.root, "cat-file", "blob", oid.decode(), binary=True).decode("utf-8")))
    view = cm.derive(records)
    if view.errors or view.conflicts:
        raise ValueError("invalid introduction view")
    return view, revision


def _validate_manifest(source, path, current):
    raw = source.read(path)
    meta = tomllib.loads(raw.decode("utf-8"))
    view, introduction = _introduction_view(source, path, raw, current)
    if set(meta) - {"source_commit", "source_blob", "archive", "item"}:
        raise ValueError("unknown manifest field")
    commit = meta.get("source_commit")
    blob = meta.get("source_blob")
    if not isinstance(commit, str) or not re.fullmatch(r"[a-fA-F0-9]{40}|[a-fA-F0-9]{64}", commit):
        raise ValueError("invalid source commit")
    if not isinstance(blob, str) or not re.fullmatch(r"[a-fA-F0-9]{40}|[a-fA-F0-9]{64}", blob):
        raise ValueError("invalid source blob")
    commit = cm.resolve_base(source.root, commit)
    archive = meta.get("archive")
    if not cm.safe_path(archive) or not archive.startswith("docs/archive/"):
        raise ValueError("invalid archive path")
    entry = cm.git(source.root, "ls-tree", commit, "--", "docs/STATE.md")
    if not re.match(r"100(?:644|755) blob " + re.escape(blob.lower()) + r"\t", entry):
        raise ValueError("source blob mismatch")
    original = cm.git(source.root, "show", commit + ":docs/STATE.md", binary=True)
    if source.read(archive) != original:
        raise ValueError("archive differs from source")
    lines = original.decode("utf-8").splitlines()
    nonblank = {number for number, text in enumerate(lines, 1) if text.strip()}
    covered = set()
    items = meta.get("item", [])
    if not isinstance(items, list):
        raise ValueError("invalid items")
    for item in items:
        if not isinstance(item, dict) or set(item) - {"lines", "kind", "disposition", "target", "refs", "reason", "accepted"}:
            raise ValueError("invalid item fields")
        value = item.get("lines")
        match = re.fullmatch(r"([1-9][0-9]*)(?:-([1-9][0-9]*))?", value) if isinstance(value, str) else None
        if not match:
            raise ValueError("invalid line range")
        start, end = int(match[1]), int(match[2] or match[1])
        if start > end or end > len(lines):
            raise ValueError("line range out of bounds")
        claimed = set(range(start, end + 1)) & nonblank
        if claimed & covered:
            raise ValueError("overlapping line dispositions")
        covered |= claimed
        kind, disposition = item.get("kind"), item.get("disposition")
        if kind not in KINDS or disposition not in ("record", "legacy", "historical"):
            raise ValueError("invalid kind or disposition")
        if "accepted" in item and type(item["accepted"]) is not bool:
            raise ValueError("invalid acceptance")
        refs = item.get("refs", [])
        if not isinstance(refs, list) or any(not isinstance(ref, str) or not re.fullmatch(r"(pr|commit|run|file|bug):[^\s]+", ref) for ref in refs):
            raise ValueError("invalid references")
        if disposition == "historical":
            if not isinstance(item.get("reason"), str) or not item["reason"].strip() or not refs:
                raise ValueError("historical item requires reason and references")
            if kind in LIVE and not any(ref.startswith(("pr:", "commit:", "run:")) for ref in refs):
                raise ValueError("live historical item requires execution evidence")
        elif disposition == "legacy":
            marker = "(archive: " + archive + ":L" + str(start) + ")"
            state = (_snapshot_read(source.root, introduction, "docs/STATE.md")
                     if introduction else source.read("docs/STATE.md"))
            state_lines = state.decode("utf-8").splitlines()
            if not any(marker in line and re.search(r"\bpaths:\s*\S", line) for line in state_lines):
                raise ValueError("legacy stub requires archive marker and scope on one line")
        else:
            target = item.get("target")
            if not isinstance(target, str) or not cm.ID.fullmatch(target) or target not in view.records:
                raise ValueError("record target unavailable")
            record = view.records[target]
            required = "active" if record.kind == "DEC" else "open"
            if view.statuses.get(target) != required:
                raise ValueError("record target is not active or open")
            if record.kind == "DEC" and item.get("accepted") is not True:
                raise ValueError("decision requires explicit acceptance")
    if covered != nonblank:
        raise ValueError("nonblank source lines are uncovered")


def validate(root, base=None):
    """Return sanitized findings; absence of migration manifests is valid."""
    try:
        source = Source(root, base)
        paths = source.manifests()
        if not paths:
            return []
        view = cm.load_effective(root, source.base) if source.base else cm.load_proposed(root)
        if view.errors or view.conflicts:
            return ["Migration record view is invalid or conflicting"]
    except (OSError, ValueError, UnicodeError):
        return ["Migration source is unavailable or unsafe"]
    errors = []
    for index, path in enumerate(paths, 1):
        try:
            _validate_manifest(source, path, view)
        except (OSError, ValueError, UnicodeError, TypeError):
            errors.append("Migration coverage " + str(index) + " is invalid or incomplete")
    return errors


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    errors = validate(args.root, args.base)
    for error in errors:
        print(error)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
