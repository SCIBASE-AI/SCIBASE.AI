# Repository External Reference Pin Guard

Self-contained Project Repository & Version Control slice for issue #10.

This module checks whether a scientific repository can safely publish a DOI, citation badge, API view, or export bundle when it depends on external references such as Git submodules, linked datasets, API snapshots, model weights, or external code/data pointers.

## What It Checks

- Git submodules and external code are pinned to immutable commit SHAs, rejecting null all-zero placeholders.
- Linked datasets and model weights have full-length SHA checksum, parseable DOI, or immutable version evidence; placeholders such as `pending` and floating aliases such as `latest` do not count.
- Supplied checksum and DOI metadata must be valid even when another durable identifier is present, so malformed evidence cannot slip into export or citation packets.
- The external-reference manifest itself must be an array, so object-shaped or missing reviewer data cannot be treated as a clean empty audit.
- Malformed top-level repository packets create `MALFORMED_REPOSITORY_PACKET` blocker evidence instead of crashing before reviewer packets are generated.
- Malformed external-reference entries create release-blocking repair actions instead of crashing assessment or disappearing from reviewer packets.
- Blank or missing reference IDs are normalized to stable `unidentified-reference-*` placeholders and blocked with explicit ID-assignment remediation.
- Repository-level assessment timestamps must be present and parseable before otherwise pinned references can release.
- API sources use parseable, non-future dated snapshots with full-length SHA checksum evidence instead of floating "latest" endpoints.
- Export bundles do not require authenticated external references.
- Finding targets redact embedded credentials and token query parameters before reviewer packets are emitted.
- License and attribution metadata are present before DOI publication.
- Reference verification evidence is present, fresh enough for release, and not future-dated.

## Commands

```powershell
npm test
npm run demo
npm run video
npm run check
```

The demo writes deterministic JSON, Markdown, SVG, and MP4 reviewer artifacts under `reports/`.

## Safety

All records are synthetic. The module does not call external repositories, APIs, DOI registries, identity providers, storage systems, payment systems, or private research databases.
