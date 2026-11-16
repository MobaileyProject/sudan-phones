"""Serial task orchestration, source ingestion and independent result delivery."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

from .agent import implementation_prompt, message_prompt, run_agent
from .core import eligible, verify_pr


def command(root, *args):
    try:
        return subprocess.run(args, cwd=root, text=True, capture_output=True,
                              check=True, timeout=120).stdout.strip()
    except subprocess.CalledProcessError:
        raise RuntimeError("Command failed: " + " ".join(args[:3]) + "; inspect locally") from None


def check_skills(root, config):
    remote = command(root, "git", "remote", "get-url", "origin")
    repo = re.escape(config["repo"])
    if not re.fullmatch(r"(?:git@github\.com:|https://github\.com/)" + repo + r"(?:\.git)?", remote):
        raise RuntimeError("origin does not match the configured GitHub repository")
    command(root, "git", "fetch", "origin", "--prune")
    entries = command(root, "git", "ls-tree", "-r", "--name-only", "origin/main", ".agents/skills")
    skills = [line for line in entries.splitlines() if line.endswith("/SKILL.md") and len(line.split("/")) == 4]
    if len(skills) != 14:
        raise RuntimeError("origin/main needs all 14 shared skills; merge skills PR #4 first")


def prepare_worktree(root, config, branch):
    check_skills(root, config)
    command(root, "git", "cat-file", "-e", "origin/main:AGENTS.md")
    ignored = subprocess.run(["git", "check-ignore", "-q", ".worktrees/"], cwd=root).returncode == 0
    if not ignored:
        raise RuntimeError(".worktrees/ must be ignored before execution")
    path = root / ".worktrees" / branch.replace("/", "-")
    command(root, "git", "worktree", "add", str(path), "-b", branch, "origin/main")
    return path


def execute(root, config, ledger, task, launch=None, lists=None):
    if not eligible(task, config):
        return
    key = config["list_id"] + ":" + task["id"]
    digest = hashlib.sha256(key.encode()).hexdigest()[:16]
    branch = ("fix" if task["kind"] == "bug" else "feature") + "/slack-" + digest
    if not ledger.claim(key, branch):
        return
    result = {"outcome": "blocked", "summary": "Execution interrupted; inspect worktree",
              "tests": "Not verified", "pr_url": "", "next_action": "Inspect the saved branch before retrying"}
    try:
        if lists:
            lists.update(config, task["id"], {"status": "In progress", "branch": branch})
        worktree = prepare_worktree(root, config, branch)
        launch = launch or (lambda path, prompt, fields: run_agent(path, dict(config, _branch=branch), prompt, fields))
        result = launch(worktree, implementation_prompt(task, branch),
                        ["outcome", "summary", "pr_url", "tests", "next_action"])
        if result["outcome"] not in {"pr_ready", "blocked"}:
            raise ValueError("agy returned an unsupported outcome")
        if result["outcome"] == "pr_ready":
            # Never pass an agent-supplied URL to gh before restricting the target.
            url = result.get("pr_url", "")
            if not re.fullmatch(r"https://github\.com/" + re.escape(config["repo"]) + r"/pull/[1-9][0-9]*", url):
                raise ValueError("agy returned an invalid PR URL")
            pr = json.loads(command(root, "gh", "pr", "view", url, "--repo", config["repo"],
                                    "--json", "url,headRefName,baseRefName,state"))
            if not verify_pr(pr, config["repo"], branch):
                raise ValueError("GitHub did not verify the PR branch/base/state")
    except Exception as error:
        result = {"outcome": "blocked", "summary": str(error), "pr_url": "",
                  "tests": "Not verified by worker", "next_action": "Inspect branch and agy session before retrying"}
    finally:
        result.update(task=task, branch=branch)
        ledger.finish(key, result)


def publish(config, ledger, lists, writer):
    errors = []
    for job in ledger.pending():
        try:
            _publish_one(config, ledger, lists, writer, job)
            ledger.delivery_error(job["key"], None)
        except Exception as error:
            ledger.delivery_error(job["key"], str(error))
            errors.append(job["key"] + ": " + str(error))
    return errors


def _publish_one(config, ledger, lists, writer, job):
    result = job["result"]
    task = result["task"]
    status = "PR ready" if result["outcome"] == "pr_ready" else "Blocked"
    reported = result["outcome"] == "reported"
    if not reported and not job["list_updated"]:
        fields = {"status": status, "branch": job["branch"], "result": result["summary"][:2500]}
        if result.get("pr_url"):
            fields["pr"] = result["pr_url"]
        lists.update(config, task["id"], fields)
        ledger.list_updated(job["key"])
    if not job["message_ts"]:
        message = writer(message_prompt(result), ["message"])["message"]
        if not message.strip() or len(message) > 3000 or "<!" in message:
            raise ValueError("agy returned an empty, overlong or broadcast message")
        category = ("bugs" if task.get("kind") == "bug" else "updates") if reported else (
            "updates" if status == "PR ready" else "questions")
        ts = lists.post(config["channels"][category], message, job["key"])
        ledger.delivery(job["key"], ts)
    ledger.delivery(job["key"])


def sync_sources(lists, config, reports, ledger=None):
    existing = {task.get("source") for task in lists.tasks(config)}
    count = 0
    for report in reports:
        if report["source"] not in existing:
            lists.create(config, dict(report, status=report.get("status", "Backlog"), executor=""))
            existing.add(report["source"])
            count += 1
        if ledger:
            key = "report:" + config["list_id"] + ":" + report["source"]
            if ledger.claim(key, ""):
                ledger.finish(key, {"outcome": "reported", "summary": "Report recorded in the Slack backlog",
                                    "task": report, "tests": "Not investigated", "pr_url": "",
                                    "next_action": "Add acceptance criteria, assign executor agy, and mark Ready"})
    return count


def collect_sources(root, config):
    reports = []
    for path in sorted((root / "docs/bugs").glob("BUG-*.json")):
        bug = json.loads(path.read_text())
        if bug.get("status") == "resolved":
            continue
        reports.append({"source": "bug:" + bug["id"], "title": bug["id"], "kind": "bug",
                        "details": json.dumps(bug, ensure_ascii=False), "acceptance": ""})
    issues = json.loads(command(root, "gh", "issue", "list", "--repo", config["repo"],
                                "--state", "open", "--limit", "100", "--json", "number,title,body,url,labels"))
    for issue in issues:
        labels = {x["name"].lower() for x in issue["labels"]}
        reports.append({"source": "issue:" + str(issue["number"]), "title": issue["title"],
                        "kind": "bug" if "bug" in labels else "feature",
                        "details": issue["url"] + "\n" + (issue["body"] or "")[:8000], "acceptance": ""})
    runs = json.loads(command(root, "gh", "run", "list", "--repo", config["repo"], "--branch", "main",
                              "--limit", "20", "--json", "databaseId,conclusion,displayTitle,url,workflowName"))
    completed = set()
    for run in runs:
        workflow = run["workflowName"]
        if not run["conclusion"] or workflow in completed:
            continue
        completed.add(workflow)
        if run["conclusion"] == "failure":
            reports.append({"source": "ci:" + str(run["databaseId"]), "title": "CI failure: " + run["displayTitle"],
                            "kind": "bug", "details": run["url"],
                            "acceptance": "Reproduce the failing check and make it pass with a regression test"})
    prs = json.loads(command(root, "gh", "pr", "list", "--repo", config["repo"], "--state", "open",
                            "--limit", "100", "--json", "number,title,url,headRefName,isDraft"))
    for pr in prs:
        if pr["isDraft"]:
            continue
        reports.append({"source": "pr:" + str(pr["number"]), "title": pr["title"],
                        "kind": "bug" if pr["headRefName"].startswith("fix/") else "feature",
                        "status": "PR ready", "pr": pr["url"], "branch": pr["headRefName"],
                        "details": "Implementation is awaiting personal review: " + pr["url"],
                        "acceptance": "Review checks and implementation; merge only with recorded peer approval"})
    return reports


def reconcile_merged(root, config, lists):
    for task in lists.tasks(config):
        if task.get("status") != "PR ready":
            continue
        url = task.get("pr", "")
        if not re.fullmatch(r"https://github\.com/" + re.escape(config["repo"]) + r"/pull/[1-9][0-9]*", url):
            continue
        pr = json.loads(command(root, "gh", "pr", "view", url, "--repo", config["repo"], "--json", "state"))
        if pr["state"] == "MERGED":
            lists.update(config, task["id"], {"status": "Done"})
