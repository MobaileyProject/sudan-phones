"""Serial task orchestration, source ingestion and independent result delivery."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

from .routing import contexts, task_context
from .agent import implementation_prompt, message_prompt, run_agent
from .core import eligible, extract_effort, verify_pr
from .context import prepare_context


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
        context, metadata = prepare_context(worktree, config)
        effort = extract_effort(task.get("executor")) or config.get("effort")
        run_config = dict(config, _branch=branch, _task_id=task["id"],
                          _executor=task.get("executor"), _effort=effort, **metadata)
        launch = launch or (lambda path, prompt, fields: run_agent(path, run_config, prompt, fields))
        result = launch(worktree, implementation_prompt(task, branch, context),
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
            if pr["state"] == "MERGED":
                # The user can merge while the agent is returning its result.
                result.update(outcome="done", merged_verified=True,
                              next_action="Task is Done; continue dependent work when its prerequisites are satisfied")
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
    config = task_context(config, task)
    status = {"pr_ready": "PR ready", "done": "Done"}.get(result["outcome"], "Blocked")
    reported = result["outcome"] == "reported"
    if not reported and not job["list_updated"]:
        fields = {"status": status, "branch": job["branch"], "result": result["summary"][:2500]}
        if result.get("pr_url"):
            fields["pr"] = result["pr_url"]
        lists.update(config, task["id"], fields)
        ledger.list_updated(job["key"])
    message = writer(message_prompt(result), ["message"])["message"]
    if not message.strip() or len(message) > 3000 or "<!" in message:
        raise ValueError("agy returned an empty, overlong or broadcast message")
    channel = job.get("message_channel") or notification_channel(config, result)
    if job["message_ts"]:
        lists.edit(channel, job["message_ts"], message)
    else:
        ts = lists.post(channel, message, job["key"])
        ledger.delivery(job["key"], ts, channel)
    ledger.delivery(job["key"])


def notification_channel(config, result):
    if result["outcome"] == "reported":
        category = "bugs" if result["task"].get("kind") == "bug" else "updates"
    else:
        category = "updates" if result["outcome"] in {"pr_ready", "done"} else "questions"
    return config["channels"][category]


def sync_sources(lists, config, reports, ledger=None):
    existing = {task.get("source"): task for task in lists.tasks(config)}
    count = 0
    for report in reports:
        if report["source"] in existing and not report["source"].startswith("pr:"):
            current = existing[report["source"]]
            report = dict(report, **{field: current[field] for field in ("status", "executor", "pr", "branch", "kind") if current.get(field)})
        if report["source"] not in existing:
            lists.create(config, dict(report, status=report.get("status", "Backlog"), executor=""))
            existing[report["source"]] = report
            count += 1
        if ledger:
            key = "report:" + config["list_id"] + ":" + report["source"]
            result = source_result(report)
            if ledger.claim(key, ""):
                ledger.finish(key, result)
            elif ledger.get(key)["result"] != result:
                previous = ledger.get(key)
                if previous["message_ts"] and not previous.get("message_channel") and previous["result"]:
                    ledger.delivery(key, previous["message_ts"], notification_channel(config, previous["result"]))
                ledger.refresh(key, result)
    return count


def source_result(report):
    status = report.get("status", "Backlog")
    action = "Add acceptance criteria, assign executor agy, and mark Ready"
    if status == "PR ready":
        action = "Review the existing PR personally; merge only after approval and passing checks"
    elif status == "Done":
        action = "Task is Done; no review or requeue needed. Track follow-up work separately"
    elif status == "In progress":
        action = "Follow the assigned worker and existing branch; do not start duplicate implementation"
    elif status == "Ready":
        action = "Item is Ready; confirm its executor and let the worker claim it once"
    elif status == "Blocked":
        action = "Resolve the recorded blocker with the founders before authorizing implementation"
    summary = {"PR ready": "PR awaiting personal review", "Done": "Task marked Done"}.get(status, "Report recorded in the Slack backlog")
    if status == "Done" and report.get("merged_verified"):
        summary = "PR merged"
    return {"outcome": "reported", "summary": summary,
            "task": report, "tests": report.get("tests", "No investigation recorded"),
            "limitations": "Only the recorded evidence is verified; additional runtime behavior is not independently checked",
            "pr_url": report.get("pr", ""), "next_action": action}


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
                            "--limit", "100", "--json", "number,title,url,headRefName,isDraft,statusCheckRollup"))
    for pr in prs:
        if pr["isDraft"]:
            continue
        checks = pr.get("statusCheckRollup") or []
        evidence = "; ".join((check.get("name") or check.get("context") or "Check") + ": " +
                             (check.get("conclusion") or check.get("state") or check.get("status") or "UNKNOWN")
                             for check in checks) or "No GitHub checks reported yet"
        reports.append({"source": "pr:" + str(pr["number"]), "title": pr["title"],
                        "kind": "bug" if pr["headRefName"].startswith("fix/") else "feature",
                        "status": "PR ready", "pr": pr["url"], "branch": pr["headRefName"],
                        "tests": evidence,
                        "details": "Implementation is awaiting personal review: " + pr["url"],
                        "acceptance": "Review checks and implementation; merge only with recorded peer approval"})
    return reports


def reconcile_merged(root, config, lists, ledger=None):
    for task in lists.tasks(config):
        if task.get("list_id", config["list_id"]) != config["list_id"]:
            raise ValueError("Reconciliation row belongs to a different List")
        if task.get("status") not in {"PR ready", "Done"}:
            continue
        url = task.get("pr", "")
        if not re.fullmatch(r"https://github\.com/" + re.escape(config["repo"]) + r"/pull/[1-9][0-9]*", url):
            continue
        key = "report:" + config["list_id"] + ":pr:" + url.rsplit("/", 1)[1]
        job = ledger.get(key) if ledger else None
        if task["status"] == "Done" and (not job or not job["result"] or job["result"]["task"].get("status") == "Done"):
            continue
        pr = json.loads(command(root, "gh", "pr", "view", url, "--repo", config["repo"], "--json", "state,statusCheckRollup"))
        if pr["state"] == "MERGED":
            if ledger:
                if job and job["result"]:
                    report = dict(job["result"]["task"], status="Done", merged_verified=True, details="Merged PR: " + url)
                    checks = pr.get("statusCheckRollup") or []
                    report["tests"] = "; ".join((c.get("name") or c.get("context") or "Check") + ": " +
                                                (c.get("conclusion") or c.get("state") or c.get("status") or "UNKNOWN") for c in checks) or "No GitHub checks reported"
                    ledger.refresh(key, source_result(report))
            if task["status"] != "Done":
                lists.update(config, task["id"], {"status": "Done"})


def poll(root, config, ledger, lists, writer, execute_ready=False):
    """Default-only source intake, all-List reconciliation, one execution slot."""
    count = sync_sources(lists, config, collect_sources(root, config), ledger)
    for context in contexts(config):
        reconcile_merged(root, context, lists, ledger)
    errors = publish(config, ledger, lists, writer)
    if execute_ready:
        for context in contexts(config):
            for task in lists.tasks(context):
                key = context["list_id"] + ":" + task["id"]
                if eligible(task, context) and ledger.get(key) is None:
                    # Baseline failure must not consume the durable claim.
                    check_skills(root, context)
                    execute(root, context, ledger, task, lists=lists)
                    errors.extend(publish(config, ledger, lists, writer))
                    return count, errors
    return count, errors
