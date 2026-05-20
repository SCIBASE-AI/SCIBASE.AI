# Collaborative Task Dependency Deadline Guard

A focused real-time collaborative editor slice for the optional inline task workflow in issue #12. It checks whether manuscript tasks, comments, notebook cells, and section anchors are ready for a publication milestone before a team freezes or submits a collaborative research document.

The module is self-contained, deterministic, dependency-free, and uses synthetic sample data only.

## What It Checks

- Task dependencies and blocked downstream work.
- Due-date and milestone-window risk.
- Assignee availability and overloaded reviewers.
- Section, figure, table, and notebook-cell anchors.
- Blocking comments tied to task anchors.
- Stale notebook outputs that make downstream tasks unsafe.
- Publication milestone readiness and reviewer actions.

## Usage

```bash
node collab-task-dependency-deadline-guard/test.js
node collab-task-dependency-deadline-guard/demo.js
```

The demo writes:

- `reports/task-readiness.json`
- `reports/reviewer-packet.md`
- `reports/task-summary.svg`

The PR includes a short demo video at `reports/demo.mp4`.

## Maintainer-Friendly Notes

- No external services, credentials, network calls, or package installs.
- Sample data is intentionally small and synthetic.
- Findings are explainable and map directly to task workflow requirements.
- The module complements existing collaboration/editor PRs by focusing specifically on inline task dependency and deadline readiness.
