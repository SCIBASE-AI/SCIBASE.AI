# Collaborative Clipboard Import Guard

This module adds a focused issue #12 slice for the real-time collaborative research editor: a trust boundary for pasted or imported content before it becomes shared manuscript state.

It evaluates synthetic import batches for:

- untrusted clipboard or file sources
- missing or unsupported import channel metadata
- malformed import payloads that do not provide a valid top-level import batch or block list, contain malformed block entries inside an otherwise valid list, contain malformed table cells or rows, provide malformed existing-anchor metadata, or collide on anchors before source block IDs are available
- missing or unrecognized source trust metadata
- missing, blank, placeholder, or malformed signed source attestations from trusted and partner imports
- hidden instruction-like text that is not visible to collaborators
- spreadsheet formula cells that could execute after import
- notebook output snippets and table cells containing local or private filesystem paths, including lowercase-drive and forward-slash Windows user paths
- source-origin metadata containing local or private filesystem paths, including source-related finding messages for untrusted imports
- stale or malformed collaborator review metadata bound to old section versions or unverifiable expiry evidence
- duplicate anchors that would collide inside the import payload or with existing shared-document anchors, with every colliding block regenerated uniquely before insertion even when source block IDs are missing

The guard emits a deterministic packet with sanitized blocks, reviewer actions, insertion lanes, findings, and a SHA-256 audit digest.

## Usage

```powershell
npm test
npm run demo
npm run video
npm run check
```

The demo writes JSON, Markdown, SVG, and MP4 evidence to `reports/`.

Generated packets include unsafe clipboard, partner-review, trusted-attestation, placeholder-attestation, unsupported-channel, malformed-import-batch, malformed-block-list, malformed-block-entry, malformed-table-row, malformed-table-cells, malformed-existing-anchors, missing block-ID anchor collision, private source-origin, lowercase Windows path, forward-slash Windows path, and clean trusted import examples.

## Scope

This is intentionally separate from previous issue #12 work on broad editor foundations, operation replay, offline conflict resolution, notebook kernel leases, reference merge/formatting, authorship governance, autosave/local-cache privacy, round-trip fidelity, presence, accessibility, evidence binding, embargo release, notification visibility, data availability, LaTeX macro safety, and suggestion provenance.

No external services, credentials, private manuscripts, live users, or payment data are used.
