# Repository Release Signature Guard

Focused slice for SCIBASE issue #10, Project Repository and Version Control.

This module validates signed commit, tag, and release attestation evidence before a scientific repository version is published, cited, or exported. It is narrower than broad repository ledgers, fork provenance, semantic tag governance, component-owner approval, merge queue governance, sensitive-artifact scanning, external reference pinning, compute sandbox policy, restore rehearsal, and DOI tombstone guards.

## What it checks

- Release tags cannot be published when tag or target commit signatures are missing, expired, or untrusted.
- DOI/citation metadata must reference the same immutable tag and commit digest as the export bundle.
- Attestation subjects must match the release tag, commit, and export manifest hash.
- Component hashes for manuscript, data, code, notebooks, protocols, results, and metadata must be covered by the signed release packet.
- Fork-derived releases must preserve upstream attribution in the signed provenance packet.
- Reviewer packets receive deterministic publish, hold, or re-sign decisions.

## Local verification

```bash
node repository-release-signature-guard/test.js
node repository-release-signature-guard/demo.js
node repository-release-signature-guard/make-demo-video.js
```

Generated reviewer artifacts are written to `repository-release-signature-guard/reports/`.

## Safety

Fixtures are synthetic. The module does not call GitHub, GPG, Sigstore, DataCite, Crossref, package registries, wallets, credential stores, or external services.
