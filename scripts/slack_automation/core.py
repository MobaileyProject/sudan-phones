"""Durable execution claims and strict boundaries for external results."""
from contextlib import contextmanager
import fcntl
import json
from pathlib import Path
import re
import sqlite3


class Ledger:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        self.db.execute("""CREATE TABLE IF NOT EXISTS jobs (
            key TEXT PRIMARY KEY, branch TEXT NOT NULL, result TEXT,
            delivered INTEGER NOT NULL DEFAULT 0, message_ts TEXT,
            list_updated INTEGER NOT NULL DEFAULT 0, delivery_error TEXT)""")
        columns = {row[1] for row in self.db.execute("PRAGMA table_info(jobs)")}
        for name, definition in (("list_updated", "INTEGER NOT NULL DEFAULT 0"), ("delivery_error", "TEXT")):
            if name not in columns:
                self.db.execute(f"ALTER TABLE jobs ADD COLUMN {name} {definition}")
        self.db.commit()

    def claim(self, key, branch):
        with self.db:
            return self.db.execute(
                "INSERT OR IGNORE INTO jobs(key, branch) VALUES (?, ?)",
                (key, branch)).rowcount == 1

    def get(self, key):
        row = self.db.execute("SELECT * FROM jobs WHERE key=?", (key,)).fetchone()
        if row is None:
            return None
        row = dict(row)
        row["result"] = json.loads(row["result"]) if row["result"] else None
        return row

    def finish(self, key, result):
        with self.db:
            self.db.execute("UPDATE jobs SET result=? WHERE key=?", (json.dumps(result), key))

    def pending(self):
        return [self.get(row[0]) for row in self.db.execute(
            "SELECT key FROM jobs WHERE delivered=0 AND result IS NOT NULL")]

    def delivery(self, key, ts=None):
        with self.db:
            if ts:
                self.db.execute("UPDATE jobs SET message_ts=? WHERE key=?", (ts, key))
            else:
                self.db.execute("UPDATE jobs SET delivered=1 WHERE key=?", (key,))

    def list_updated(self, key):
        with self.db:
            self.db.execute("UPDATE jobs SET list_updated=1 WHERE key=?", (key,))

    def delivery_error(self, key, error):
        with self.db:
            self.db.execute("UPDATE jobs SET delivery_error=? WHERE key=?", (error, key))


@contextmanager
def lock(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as stream:
        try:
            fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Another Slack worker is running") from None
        try:
            yield
        finally:
            fcntl.flock(stream, fcntl.LOCK_UN)


def eligible(task, config):
    return (config.get("execution_enabled") is True
            and task.get("list_id") == config["list_id"]
            and bool(re.fullmatch(r"[A-Za-z0-9_-]+", task.get("id", "")))
            and task.get("status") == "Ready" and task.get("executor") == "agy"
            and task.get("kind") in {"bug", "feature"}
            and all(isinstance(task.get(k), str) and task[k].strip()
                    for k in ("title", "details", "acceptance")))


def parse_agent(output, required):
    payload = json.loads(output)
    if not isinstance(payload, dict) or payload.get("status") != "SUCCESS":
        raise ValueError("agy did not report a successful structured response")
    result = payload.get("structured_output")
    if not isinstance(result, dict) or any(not isinstance(result.get(k), str) for k in required):
        raise ValueError("agy returned missing or malformed structured fields")
    return result


def verify_pr(pr, repo, branch):
    return (pr.get("state") == "OPEN" and pr.get("headRefName") == branch
            and pr.get("baseRefName") == "main"
            and bool(re.fullmatch(r"https://github\.com/" + re.escape(repo) + r"/pull/[1-9][0-9]*", pr.get("url", ""))))
