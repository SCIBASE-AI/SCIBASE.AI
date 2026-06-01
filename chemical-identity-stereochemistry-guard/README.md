# Chemical Identity Stereochemistry Guard

This self-contained module adds a deterministic chemical identity and stereochemistry gate for SCIBASE knowledge graph workflows. It is scoped to issue #17 and focuses on whether compound nodes and compound graph edges are safe to merge or publish in recommendations.

The guard does not call external APIs, payment systems, identity providers, live projects, or private data stores. Fixtures are synthetic and every check runs with Node built-ins.

## What It Checks

- InChIKey format readiness.
- Isomeric SMILES presence.
- Missing stereochemistry for compounds that require stereochemical identity.
- Salt, hydrate, or other form conflation with parent freebase nodes.
- Isotope-label metadata for labeled tracers.
- DOI-backed chemical identity evidence.
- Synonym collisions across unrelated chemical skeletons.
- `same_as` edges that merge different skeletons, forms, or stereochemical records.
- Assay-context completeness before graph recommendations.
- DOI-backed relationship evidence for compound graph edges.

## Local Validation

```sh
npm --prefix chemical-identity-stereochemistry-guard run check
npm --prefix chemical-identity-stereochemistry-guard test
npm --prefix chemical-identity-stereochemistry-guard run demo
npm --prefix chemical-identity-stereochemistry-guard run make-demo-video
npm --prefix chemical-identity-stereochemistry-guard run verify-video
```

## Generated Artifacts

Running the demo writes:

- `reports/clean-chemical-identity-report.json`
- `reports/risky-chemical-identity-report.json`
- `reports/risky-chemical-identity-handoff.md`
- `reports/chemical-identity-dashboard.svg`
- `reports/demo.mp4`

The risky packet intentionally demonstrates release blockers: missing stereochemistry, invalid InChIKeys, missing isotope labels, synonym collisions, `same_as` skeleton mismatch, salt-form conflation, incomplete assay context, missing edge evidence, and missing graph nodes.

## Issue Fit

This is a distinct Scientific Knowledge Graph Integration slice. It complements the existing broad extraction/navigation, ontology drift, aliasing, biological accession crosswalk, measurement harmonization, geospatial provenance, sample custody/cold-chain, protocol deviation/reagent lot, software dependency, image metadata, funding provenance, temporal consistency, and recommendation visibility/diversity work by focusing specifically on chemical identity and stereochemistry before graph merge or recommendation publication.
