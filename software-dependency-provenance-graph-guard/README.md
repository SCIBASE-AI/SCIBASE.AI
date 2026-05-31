# Software Dependency Provenance Graph Guard

This module adds a focused Knowledge Graph Integration control for SCIBASE issue #17. It evaluates synthetic notebook, code, runtime, and dependency evidence before software-library graph edges are shown on entity pages or used in public recommendations.

The guard is intentionally narrow. It does not call package registries, container registries, private repositories, payment systems, identity systems, or external services. It only reviews local synthetic evidence for dependency version provenance, lockfile/runtime parity, SBOM references, container digest pinning, license/access metadata, deprecation state, advisory state, and recommendation safety.

## What It Catches

- Public graph recommendations that depend on private or restricted-license packages.
- Dependency versions that drift between manifests, lockfiles, and executed runtimes.
- Runtime containers or lockfiles that are not pinned with SHA-256 evidence.
- Dependency graph edges with stale resolution evidence or missing SBOM references.
- Deprecated software edges that need replacement routing before recommendation.
- High-risk dependency advisories that should suppress public graph publication.
- Recommendation paths that reference missing, blocked, or review-needed dependency nodes.

## Outputs

- Project-level release decisions: `clear`, `hold_recommendations`, or `block_publication`.
- Dependency-edge statuses: `publishable`, `review`, or `block`.
- Public recommendation statuses: `publishable`, `hold_for_review`, or `suppress`.
- Deterministic findings with severity, evidence, and remediation.
- A reviewer packet digest for repeatable audit comparison.
- JSON, Markdown, SVG, and MP4 demo artifacts under `reports/`.

## Usage

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/dependency-provenance-packet.json`
- `reports/dependency-provenance-report.md`
- `reports/summary.svg`
- `reports/demo.mp4` when `ffmpeg` is available

## Scope Boundaries

This is separate from existing issue #17 work on broad extraction/navigation, ontology drift, relationship conflict, author-affiliation disambiguation, artifact reuse lineage, evidence freshness, multilingual aliases, geospatial sample provenance, temporal consistency, organism/strain boundaries, funding-award provenance, and image metadata provenance. The guard focuses only on scientific software dependency provenance before knowledge-graph software edges and recommendations are released.
