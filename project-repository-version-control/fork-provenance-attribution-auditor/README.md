# Fork Provenance Attribution Auditor

This prototype audits fork, merge, DOI, citation, and export provenance for scientific project repositories.

It checks synthetic repository records for:

- missing fork parent metadata
- dropped upstream contributor attribution
- ambiguous merge request bases
- unreviewed history rewrites that affect provenance
- DOI metadata drift from tagged repository versions
- export manifest hash mismatches
- derivative license conflicts
- stale citation badges
- orphaned forks without upstream commit anchors

## Run

```sh
node project-repository-version-control/fork-provenance-attribution-auditor/test.js
node project-repository-version-control/fork-provenance-attribution-auditor/demo.js
node project-repository-version-control/fork-provenance-attribution-auditor/make-demo-video.js
```

All fixtures are synthetic. The module performs no private repository, credential, DOI-provider, payment, or external API access.
