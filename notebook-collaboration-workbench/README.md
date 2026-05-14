# Notebook Collaboration Workbench

Self-contained Real-Time Collaborative Editor module for SCIBASE issue #12. It focuses on the embedded Jupyter-style notebook part of the bounty: collaborative code cells, kernel/session leases, deterministic execution queues, output snapshots, inline cell review, tasks, and version manifests.

## Scope

- Typed scientific notebook cells for Markdown, LaTeX, raw text, and executable code.
- Collaborator presence with active kernel and cursor metadata.
- Kernel/session leases with package fingerprints and execution readiness checks.
- Deterministic execution queues that flag stale inputs, missing kernels, expired leases, and section locks.
- Reproducible output snapshots with content hashes.
- Inline cell annotations with note, warning, and blocker severities.
- Review tasks tied to notebook cells and due dates.
- Version manifests that capture cell hashes, output hashes, kernel packages, and open review items.
- Submission package export for reviewers to inspect notebook state without a live kernel.
- Local API endpoints and tests for reviewer validation.

No external Jupyter server, database, model provider, or cloud service is required. The module runs entirely from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4362 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4362/api/health
curl -fsS http://localhost:4362/api/dashboard
curl -fsS http://localhost:4362/api/executions
curl -fsS http://localhost:4362/api/package
curl -fsS http://localhost:4362/api/version
```

Post a review annotation:

```bash
curl -fsS -X POST http://localhost:4362/api/annotate \
  -H 'content-type: application/json' \
  -d '{"cellId":"cell-methods","authorId":"mika","severity":"warning","text":"Add citation for the validation window."}'
```

## Demo Flow

1. Open `/api/dashboard` to inspect collaborator presence, execution readiness, blocker annotations, tasks, and version evidence.
2. Open `/api/executions` to see stale-input and lock-aware execution queue decisions.
3. Open `/api/package` to review the exportable notebook submission manifest with cell, kernel, output, and review evidence.
4. Open `/api/version` to inspect deterministic hashes for a review-ready notebook snapshot.
5. Use `POST /api/annotate` or `POST /api/execution-snapshot` to preview review and execution write paths.

See `docs/requirement-map.md` for issue requirement coverage.
