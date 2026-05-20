# Requirements Map

Issue #14 asks for scientific and engineering data/code hosting, including metadata, access, versioning, reproducibility, storage, and export workflows.

| Requirement area | Coverage in this slice |
| --- | --- |
| Hosted artifact lifecycle | Reviews deletion requests for datasets, model caches, notebooks, and derived tables. |
| Metadata continuity | Requires DOI, title, type, checksum, license, and replacement URI in tombstone records. |
| Integrity | Blocks disposal when checksum manifests are missing. |
| Retention and compliance | Enforces IRB, legal, funder, citation, and retention-window holds. |
| Public repository trust | Prevents destructive deletion of DOI-backed or cited artifacts. |
| Export readiness | Emits deterministic JSON/Markdown/SVG/MP4 evidence packets for reviewers. |
