# Repository Release Signature Review

Generated: 2026-05-28T00:00:00.000Z

## Summary

- Releases reviewed: 4
- Publishable: 1
- Re-sign before publication: 0
- Held: 3
- Average signature score: 47

## Requirement Map

- File and metadata versioning: verifies immutable signed tags and commit targets.
- Repository identifiers and citation: blocks DOI/citation publication when tag or commit evidence drifts.
- Programmatic access and export: binds export bundle manifests to signed release attestations.
- Collaboration and forking: preserves upstream fork attribution inside the signed provenance packet.

## Release Decisions

### rel-clean-preprint-v2

- Decision: publish
- Signature score: 100
- Tag: preprint-v2.0.0
- Commit: 9f41c2a7
- Issues: 0
- Action: Publish release, DOI metadata, citation badge, and export bundle from the signed target.

### rel-unsigned-tag

- Decision: hold-release
- Signature score: 64
- Tag: v1.0.0
- Commit: 11aa22bb
- Issues: 3
- Action: Create a trusted tag signature before publishing v1.0.0.

### rel-attestation-drift

- Decision: hold-release
- Signature score: 24
- Tag: v1.4.1
- Commit: abc123ef
- Issues: 5
- Action: Update citation metadata before DOI publication.
- Action: Rebuild or re-sign the export bundle attestation.
- Action: Add notebooks hash evidence to the release attestation.
- Action: Add results hash evidence to the release attestation.

### rel-expired-untrusted-signer

- Decision: hold-release
- Signature score: 0
- Tag: release-2026-06
- Commit: ffee1122
- Issues: 5
- Action: Rotate tag signing identity to an approved project signer.
- Action: Re-sign release-2026-06 with a current trusted key.
- Action: Rotate commit signing identity to an approved project signer.
- Action: Generate a release attestation that covers the tag, commit, bundle, and component hashes.
