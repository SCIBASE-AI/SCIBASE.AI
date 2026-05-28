# Requirements Map

Issue #12 asks for a real-time collaborative research editor with embedded Jupyter notebooks, version history, and shared review workflows.

This slice covers the notebook-output acceptance boundary:

| Issue #12 requirement | Coverage in this module |
| --- | --- |
| Embedded Jupyter notebooks | Validates Jupyter-style cell output packets before manuscript insertion |
| Real-time collaboration | Produces deterministic accept/review/hold lanes for collaborators |
| Version history and autosave | Checks output timestamps against current data, notebook, dependency, and section revisions |
| Inline review workflow | Emits reviewer actions and audit digests for reproducibility remediation |
| Scientific rigor | Requires runtime, dependency, seed, input, and execution-order evidence before acceptance |

Non-overlap: this is focused on notebook output reproducibility. It does not duplicate clipboard/import provenance, local cache privacy, reference merge, data availability, LaTeX macro safety, presence liveness, suggestion provenance, or broad editor scaffolding.
