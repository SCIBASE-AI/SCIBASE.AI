# Requirement Map

This module addresses SCIBASE issue #12, with a focused emphasis on embedded Jupyter notebook collaboration inside the broader real-time editor.

| Issue requirement | Implementation evidence |
| --- | --- |
| Markdown and LaTeX scientific formatting | `sampleNotebook.cells` supports typed Markdown, LaTeX-ready, raw, and code cells. Version hashing includes cell type and language so formatted scientific blocks are tracked consistently. |
| Jupyter notebooks in project documents | `sampleNotebook.cells` models notebook cells, and `buildNotebookPackage()` exports a notebook manifest for review. |
| Real-time rendering and execution of code cells | `planExecutionQueue()` evaluates code cell execution readiness against kernels, leases, locks, and source hashes. `recordExecutionSnapshot()` stores deterministic output snapshots. |
| Output display for tables, plots, images, summaries | Output snapshots include `outputType`, `summary`, `contentHash`, and reproducibility status. |
| Kernel management per project or user session | `sampleNotebook.kernels` stores language, owner, status, lease expiry, and packages; queue planning checks kernel availability. |
| Inline cell commenting and annotation | `annotateCell()` validates and creates anchored cell annotations with severity and status. |
| Multi-user editing and presence | Collaborators include active kernel and cursor metadata; `buildReviewDashboard()` exposes presence records. |
| Locking and controlled sections | Cells can be locked by collaborator id; execution planning and dashboard reporting surface locked cells. |
| Version history and autosave | `buildVersionManifest()` creates deterministic review snapshots with cell hashes, output hashes, kernel package evidence, and open review counts. |
| Integrated task workflow | `sampleNotebook.tasks` and dashboard review readiness tie tasks to notebook cells, assignees, due dates, and statuses. |
| Reviewer-ready local demo | `src/server.js` exposes health, notebook, validation, queue, dashboard, package, version, annotation, and execution snapshot endpoints. |
| Tests passing | `test/workbench.test.js` covers validation, execution planning, output snapshotting, annotations, version manifests, and package dashboards. |

## Differentiation From Broader Editor Submissions

This is not a general document editor mock. It isolates the highest-risk notebook collaboration layer: executable cells, kernel leases, output provenance, cell-level review, and snapshot evidence. That gives reviewers a clear, mergeable milestone for the Jupyter integration requirement without requiring a live kernel service.
