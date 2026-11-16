"""Opt-in, content-free run measurements; never persist child diagnostics."""
import fcntl
import json
import math
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import time


def _number(value, integer=False):
    if type(value) not in ((int,) if integer else (int, float)):
        return None
    if value < 0 or (type(value) is float and not math.isfinite(value)):
        return None
    return value


def initial_base(root, config):
    """Capture the starting commit, never a commit produced by the child."""
    if "_base_sha" in config:
        return config["_base_sha"]
    if config.get("_branch"):
        try:
            result = subprocess.run(["git", "-c", "safe.directory=" + str(Path(root).resolve()),
                                     "-C", str(root), "rev-parse", "HEAD"],
                                    capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return result.stdout.strip()
        except (OSError, subprocess.SubprocessError):
            pass
    return None


def _record(config, output, elapsed, base):
    try:
        payload = json.loads(output)
    except (ValueError, TypeError):
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    task = config.get("_task_id")
    version = config.get("_prompt_version", 1)
    usage = payload.get("usage")
    usage = usage if isinstance(usage, dict) else {}
    return {
        "task_id": task if isinstance(task, str) and re.fullmatch(r"Rec[A-Za-z0-9]{1,100}", task) else None,
        "prompt_version": version if type(version) is int and version in (1, 2) else None,
        "base_sha": base if isinstance(base, str) and re.fullmatch(r"[a-fA-F0-9]{40}|[a-fA-F0-9]{64}", base) else None,
        "status": payload.get("status") if payload.get("status") in ("SUCCESS", "ERROR", "CANCELLED", "TIMEOUT") else "UNKNOWN",
        "duration_seconds": _number(payload.get("duration_seconds")),
        "num_turns": _number(payload.get("num_turns"), integer=True),
        "usage": {key: usage[key] for key in ("input_tokens", "output_tokens", "thinking_tokens", "cache_read_tokens", "total_tokens")
                  if _number(usage.get(key), integer=True) is not None},
        "worker_wall_seconds": _number(elapsed),
        "brief_exit": _number(config.get("_brief_exit"), integer=True),
        "brief_bytes": _number(config.get("_brief_bytes"), integer=True),
        "brief_ms": _number(config.get("_brief_ms")),
    }


def _protected(root, config):
    paths = [Path(root) / ".slack-worker" / "jobs.db"]
    for key in ("ledger_path", "_ledger_path"):
        if config.get(key):
            path = Path(config[key])
            paths.append(path if path.is_absolute() else Path(root) / path)
    result = subprocess.run(["git", "-c", "safe.directory=" + str(Path(root).resolve()),
                             "-C", str(root), "ls-files", "-z"],
                            capture_output=True, timeout=5)
    if result.returncode == 0:
        paths.extend(Path(root) / os.fsdecode(path) for path in result.stdout.split(b"\0") if path)
    elif (Path(root) / ".git").exists():
        raise ValueError("tracked destinations unavailable")
    return paths


def _checkout_roots(root):
    roots = [Path(root).resolve()]
    result = subprocess.run(["git", "-c", "safe.directory=" + str(roots[0]),
                             "-C", str(root), "worktree", "list", "--porcelain", "-z"],
                            capture_output=True, timeout=5)
    if result.returncode:
        if (Path(root) / ".git").exists():
            raise ValueError("checkout destinations unavailable")
        return roots
    entries = [field[len(b"worktree "):] for field in result.stdout.split(b"\0")
               if field.startswith(b"worktree ")]
    if not entries:
        raise ValueError("checkout destinations unavailable")
    for entry in entries:
        checkout = Path(os.fsdecode(entry))
        if not checkout.is_absolute():
            raise ValueError("invalid checkout destination")
        roots.append(checkout.resolve())
    return roots


def append_metrics(root, config, output, elapsed, base):
    """Best effort: even an unusable destination must not change agent execution."""
    if config.get("metrics_path") is None:
        return
    try:
        path = Path(config["metrics_path"])
        if not path.is_absolute():
            path = Path(root) / path
        protected = _protected(root, config)
        resolved = path.resolve()
        if any(resolved.is_relative_to(checkout) for checkout in _checkout_roots(root)):
            raise ValueError("repository destination")
        for other in protected:
            if resolved == other.resolve() or (path.exists() and other.exists() and path.samefile(other)):
                raise ValueError("protected destination")
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if path.parent.stat().st_mode & 0o077:
            raise ValueError("parent is not private")
        descriptor = os.open(path, os.O_WRONLY | os.O_APPEND | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600)
        with os.fdopen(descriptor, "a", encoding="utf-8") as target:
            deadline = time.monotonic() + 0.05
            while True:
                try:
                    fcntl.flock(target, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise
                    time.sleep(0.002)
            info = os.fstat(target.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise ValueError("not a private regular file")
            for other in protected:
                if other.exists() and os.path.samestat(info, other.stat()):
                    raise ValueError("protected inode")
            os.fchmod(target.fileno(), 0o600)
            target.write(json.dumps(_record(config, output, elapsed, base), allow_nan=False) + "\n")
            target.flush()
    except Exception:
        # No paths, exception text, or child content in a notice.
        try:
            print("Run metrics unavailable; execution continues.", file=sys.stderr)
        except Exception:
            pass
