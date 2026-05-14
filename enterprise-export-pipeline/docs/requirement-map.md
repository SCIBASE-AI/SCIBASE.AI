# Requirement Map

| Issue #19 requirement | Implementation |
| --- | --- |
| Admin dashboards | `buildEnterpriseDashboard` summarizes target readiness, blockers, warnings, package counts, and integration topics. |
| API & webhooks | `src/server.js` exposes `/api/*` endpoints and `buildIntegrationEvent` creates signed webhook payloads with retry metadata. |
| Institutional repository integrations | `TARGET_PROFILES["institutional-repository"]` and export packages include DSpace/Invenio-style persistent links and audit manifests. |
| Preprint repositories | `TARGET_PROFILES.arxiv` selects manuscript, source, references, and version history artifacts. |
| Indexed repositories | `TARGET_PROFILES["pubmed-central"]` and `TARGET_PROFILES.zenodo` produce JATS, dataset, code, license, DOI, and metadata evidence. |
| Journal submission platforms | `TARGET_PROFILES["journal-submission"]` adds manuscript, figures, cover letter, JATS/LaTeX formatting plugin hints, and citation tracking. |
| Grant and funder portals | `TARGET_PROFILES["nih-reporter"]` and `TARGET_PROFILES["horizon-eu"]` generate compliance evidence, deliverable manifests, and funder reporting metadata. |
| Formatting plugins | Export packages include deterministic plugin selections for JATS, LaTeX, citation styles, repository bundles, and funder reports. |
| Metadata and version history preservation | Package manifests include DOI, ORCID, citation graph, repository version, release tag, content hashes, and provenance. |
| Reviewer-ready local validation | `npm run check`, `npm test`, and the local API smoke commands validate the module without external credentials. |
