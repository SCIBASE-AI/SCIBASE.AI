# Acceptance Notes

This slice is intentionally narrow so it does not duplicate existing broad knowledge graph, ontology drift, ontology alias, synonym dedupe, retraction, author affiliation, ethics provenance, evidence freshness, conflict arbiter, artifact reuse, recommendation diversity, claim qualifier, measurement harmonization, or recommendation visibility submissions.

## Reviewer Value

- Catches duplicate award numbers before graph export.
- Prevents funded projects and outputs from becoming orphan graph nodes.
- Flags funding statements that do not match linked awards.
- Checks funder mandates against open-access, data, and reporting metadata.
- Prevents visible recommendations from relying on inactive or missing award lineage.

## Local Verification

Expected commands:

```bash
npm run check
npm test
npm run demo
```

The generated reports can be reviewed without external services.
