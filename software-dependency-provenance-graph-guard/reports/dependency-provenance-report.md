# Scientific Software Dependency Provenance Graph Review

Decision: **block_publication**
Audit digest: `9d225e0644bd803a63a317f957bfeafe1697e9515a855b6d6db674da43323985`

## Summary

| Metric | Count |
| --- | ---: |
| Projects | 4 |
| Dependency edges | 5 |
| Recommendations | 4 |
| Critical findings | 6 |
| Warnings | 5 |

## Project Decisions

| Project | Status | Critical | Warnings |
| --- | --- | ---: | ---: |
| Neuro CRISPR Single-cell Notebook | clear | 0 | 0 |
| Quantum Cavity Simulation Graph | hold_recommendations | 0 | 5 |
| Clinical Proteomics Cohort Linkage | block_publication | 3 | 0 |
| Legacy Climate Reuse Map | block_publication | 3 | 0 |

## Findings

- **warning / stale_runtime_execution_evidence** (Quantum Cavity Simulation Graph): The runtime execution evidence is older than the allowed freshness window.
  - Remediation: Re-run the notebook or code artifact and refresh the dependency provenance packet.
- **warning / missing_sbom_reference** (Quantum Cavity Simulation Graph): The dependency graph edge has no SBOM reference.
  - Remediation: Attach a CycloneDX or SPDX SBOM reference so curators can audit dependency provenance.
- **warning / stale_dependency_resolution_evidence** (Quantum Cavity Simulation Graph): The dependency resolution evidence is older than the allowed freshness window.
  - Remediation: Refresh the dependency evidence packet and review deprecation or advisory state.
- **warning / deprecated_dependency_edge** (Quantum Cavity Simulation Graph): The dependency is deprecated in the software provenance graph.
  - Remediation: Route recommendations through the replacement dependency and keep the deprecated edge for historical context only.
- **warning / public_recommendation_needs_dependency_review** (Quantum Cavity Simulation Graph): A public recommendation path depends on software edges that require curator review.
  - Remediation: Hold the recommendation until stale, missing, or deprecated dependency evidence is refreshed.
- **critical / private_dependency_in_public_recommendation** (Clinical Proteomics Cohort Linkage): A private dependency is used by a public graph edge or recommendation.
  - Remediation: Suppress the public recommendation or replace the edge with a public, reviewable software dependency.
- **critical / restricted_license_public_recommendation** (Clinical Proteomics Cohort Linkage): A dependency with a restricted or unknown license is exposed through a public recommendation path.
  - Remediation: Hold the recommendation until licensing metadata allows public graph reuse.
- **critical / public_recommendation_uses_blocked_dependency** (Clinical Proteomics Cohort Linkage): A public recommendation path depends on blocked software provenance edges.
  - Remediation: Suppress the recommendation until all dependency edges are publishable.
- **critical / deprecated_dependency_edge** (Legacy Climate Reuse Map): The dependency is deprecated in the software provenance graph.
  - Remediation: Suppress public recommendations until a supported replacement dependency is recorded.
- **critical / high_risk_dependency_advisory** (Legacy Climate Reuse Map): A high-risk dependency advisory affects the graph edge.
  - Remediation: Block public graph publication until a patched or replacement dependency is available.
- **critical / public_recommendation_uses_blocked_dependency** (Legacy Climate Reuse Map): A public recommendation path depends on blocked software provenance edges.
  - Remediation: Suppress the recommendation until all dependency edges are publishable.

## Recommendation Status

| Recommendation | Project | Status |
| --- | --- | --- |
| Recommend the single-cell preprocessing pipeline | project-neuro-crispr | publishable |
| Suggest cavity-operator examples for adjacent projects | project-quantum-cavity | hold_for_review |
| Recommend the cohort-linkage workflow to public labs | project-clinical-proteomics | suppress |
| Recommend the legacy dashboard build chain | project-legacy-climate | suppress |
