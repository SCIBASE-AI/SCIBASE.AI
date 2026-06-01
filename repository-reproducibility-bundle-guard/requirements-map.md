# Requirements Map

Issue #10 asks for project repositories that support structured scientific components, versioning, integrity, collaboration, metadata, reproducibility, and export readiness.

This slice covers a focused release gate:

- Repository structure: validates that manuscript, data, code, notebooks, results, protocols, and metadata are all present in the release manifest.
- File and metadata versioning: requires each component to be versioned and carry a stable SHA-256 digest.
- Reproducibility: requires executable code and notebooks to include lockfile evidence and digest-pinned runtime images.
- Provenance: requires datasets and results to reference upstream inputs, instruments, notebooks, or commits.
- Metadata export: requires DOI, schema.org, DataCite, license, author attribution, and metadata export targets.
- Publication/export readiness: requires the release archive to have its own digest and include every manifest path.

Out of scope by design: branch protection, merge requests, release signatures, Git LFS pointer integrity, restore rehearsals, credential rotation, and review-decision provenance, because those are already covered by separate same-issue slices.
