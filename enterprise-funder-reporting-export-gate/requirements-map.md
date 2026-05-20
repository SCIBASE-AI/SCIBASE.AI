# Requirements Map

| Issue 19 area | Implementation coverage | Evidence |
| --- | --- | --- |
| Admin dashboards | Portfolio summary reports ready, blocked, and total projects with blocker and warning counts. | `evaluatePortfolio()` and `demo.js` table output |
| Compliance tracking | Funder mandate, open access, embargo, reproducibility score, DOI, ORCID, and data-use checks are evaluated per project. | `collectBlockers()` and `test.js` |
| API and webhooks | Each evaluation emits a signed webhook-ready event with status, destination, and evidence digest. | `buildWebhookEvent()` |
| Export pipelines | Projects route to supported funder destinations such as PubMed Central, Zenodo, or institutional repositories. | `chooseDestination()` and `buildExportPacket()` |
| Metadata preservation | Export packets include artifact hashes, licenses, mandate id, destination, and reproducibility score. | `buildExportPacket()` |
| Institutional scale | Portfolio digest gives admins one immutable digest for a batch of evaluated projects. | `evaluatePortfolio()` |
| Local verification | Dependency-free tests cover ready, warning, blocked, routing, missing artifact, portfolio, and deterministic digest cases. | `node enterprise-funder-reporting-export-gate/test.js` |
