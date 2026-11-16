# Separate project-plan Lists

Owner: Codex. Branch: `feature/slack-project-routing`. Scope: worker routing,
configuration example and fake-boundary tests. This task deliberately leaves
`docs/STATE.md` to the concurrent context-migration owner. No live credentials,
Slack configuration or timer settings are changed by this implementation.

Keep the root `list_id` (`F0CHWFG1BD4` in the existing installation) as the
operational bug/feature intake. Register each project-plan phase List under the
optional `project_lists` array in the private worker configuration. P1 through P8
and Later can be separate Lists. GitHub issues, PRs, CI failures and bug records
are imported only into the root List. The worker never copies those reports into
project Lists.

Each project entry accepts exactly `list_id`, `columns` and optional
`execution_enabled`. Copy the ten-column mapping shape from
[the example configuration](../config/slack-worker.example.json), replacing every
column ID with that List's actual IDs. All ten keys are required: `title`, `kind`,
`status`, `executor`, `details`, `acceptance`, `source`, `branch`, `pr`, `result`.
Columns support text and select mappings as described in
[Slack automation](SLACK_AUTOMATION.md). Map select labels to actual Slack values;
do not reuse another List's column IDs.

For example, add an entry with this structure (the columns below are placeholders):

```json
{
  "project_lists": [
    {
      "list_id": "REPLACE_PHASE_LIST_ID",
      "execution_enabled": false,
      "columns": {
        "title": {"id": "REPLACE_TITLE", "type": "text"},
        "kind": {"id": "REPLACE_KIND", "type": "text"},
        "status": {"id": "REPLACE_STATUS", "type": "text"},
        "executor": {"id": "REPLACE_EXECUTOR", "type": "text"},
        "details": {"id": "REPLACE_DETAILS", "type": "text"},
        "acceptance": {"id": "REPLACE_ACCEPTANCE", "type": "text"},
        "source": {"id": "REPLACE_SOURCE", "type": "text"},
        "branch": {"id": "REPLACE_BRANCH", "type": "text"},
        "pr": {"id": "REPLACE_PR", "type": "text"},
        "result": {"id": "REPLACE_RESULT", "type": "text"}
      }
    }
  ]
}
```

Project execution defaults to disabled. Both root `execution_enabled: true` and
an explicit per-project `execution_enabled: true` are needed to execute project
work. Ready/agy assignment, supported task kind, details, acceptance criteria,
14 baseline skills, isolated worktrees and independent PR verification remain
required. Root execution false stops implementation in every List. Project
entries cannot override credentials, repository, workspace, channels, executable,
timeouts or permission flags. They inherit these from the root worker.

`doctor` verifies read access and configured live schemas for every registered
List. `sync` imports reports into the root and reconciles merged PRs across all
Lists. `once` additionally executes at most one eligible unclaimed item across
all Lists, in root-first registration order. Existing claims are skipped, so
later Lists remain eligible on following polls. A continuous supply of new root
Ready work can delay project work; this scheduler does not promise fairness.

Claims use `list_id:row_id`, keeping identical row IDs in different Lists
independent. Pending execution results retain `task.list_id`; retries update that
List even when execution is disabled. Old saved results without `list_id` retain
the root destination. Removing a registered List with pending results blocks
those deliveries with an error instead of writing to the root. Restore the
registration to retry delivery safely. Merged-row reconciliation also rejects
rows that identify a different List from the one being read.

Validation: routing tests use fake Slack/GitHub boundaries and the real SQLite
ledger; `make check` runs the complete suite. Live phase List registration,
permissions and execution require separate operational verification after this
change is reviewed. No live activation is claimed. Slack milestone delivery is
left to the existing CI/app integration because this task has no Slack posting
tool; the parent task owns the live project-plan update.

Local evidence (2026-11-16): `make check` passed 56 tests, all 14 skill-package
checks, staged-secret scanning and Python/JSON syntax checks. OpenAPI explicitly
skipped because the backend scaffold is absent. The routing and reconciliation
regressions were observed failing before their implementation and passing after.
