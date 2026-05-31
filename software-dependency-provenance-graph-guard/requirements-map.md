# Requirements Map

## SCIBASE Issue #17: Scientific Knowledge Graph Integration

| Issue capability | Implementation coverage |
| --- | --- |
| Entity extraction for software libraries and tools | Normalizes dependency nodes as `ecosystem:name`, validates package-url identifiers, and records dependency graph edges with provenance digests. |
| Cited references and linked metadata | Tracks lockfile hashes, SBOM references, package URLs, repository access, runtime container digests, and optional DOI evidence for software entities. |
| Graph navigation and recommendation safety | Marks dependency edges as `publishable`, `review`, or `block`, then turns public recommendations into `publishable`, `hold_for_review`, or `suppress`. |
| AI recommendation evidence | Requires public recommendation paths to reference normalized dependency nodes and suppresses paths that depend on private, restricted, vulnerable, or missing nodes. |
| Dynamic node filters | Produces project, dependency, recommendation, severity, license/access, deprecation, advisory, and status data suitable for graph filtering. |
| Reviewer-ready artifacts | Generates JSON, Markdown, SVG, MP4, deterministic findings, and an audit digest from synthetic evidence only. |

## Non-Goals

- No live package registry, SBOM service, container registry, or repository calls.
- No vulnerability scanning beyond supplied synthetic advisory data.
- No private source code, credentials, payment, identity, or user data handling.
- No attempt to replace broad knowledge graph ingestion, ontology migration, geospatial sample provenance, funding provenance, image metadata provenance, or general evidence-freshness modules.
