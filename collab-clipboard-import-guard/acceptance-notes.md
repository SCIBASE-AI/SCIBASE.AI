# Acceptance Notes

## Local Validation

Run from `collab-clipboard-import-guard/`:

```powershell
npm test
npm run demo
npm run video
npm run check
```

Expected evidence:

- `reports/unsafe-packet.json` quarantines an untrusted clipboard payload.
- `reports/partner-review-packet.json` stages a partner import missing a signed source attestation.
- `reports/trusted-attestation-packet.json` stages a trusted import missing a signed source attestation.
- `reports/placeholder-attestation-packet.json` stages a trusted import with placeholder or malformed attestation evidence.
- `reports/malformed-import-batch-packet.json` stages a malformed top-level import batch instead of crashing before curator review evidence exists.
- `reports/malformed-block-list-packet.json` stages a malformed import payload instead of throwing or allowing collaborative insertion.
- `reports/malformed-block-entry-packet.json` stages malformed block entries inside an otherwise valid block list without throwing or creating sanitized shared-manuscript blocks.
- `reports/malformed-table-row-packet.json` stages malformed table rows before collaborative insertion and normalizes them in sanitized reviewer output.
- `reports/malformed-table-cells-packet.json` stages malformed table cell metadata before collaborative insertion and normalizes sanitized reviewer output to an empty table.
- `reports/malformed-existing-anchors-packet.json` stages malformed existing-anchor metadata before collision checks can trust it.
- `reports/missing-block-ids-anchor-collision-packet.json` quarantines duplicate imported anchors and regenerates unique anchors even when source block IDs are missing.
- `reports/source-origin-packet.json` quarantines and redacts local/private source-origin metadata.
- `reports/lowercase-windows-path-packet.json` quarantines and fully redacts lowercase-drive Windows user paths.
- `reports/forward-slash-windows-path-packet.json` quarantines and fully redacts forward-slash Windows user paths.
- Blank signed source attestation values are treated as missing and stage trusted or partner imports for curator review.
- `reports/clean-packet.json` allows a trusted, attested import.
- Missing or unrecognized source trust metadata stages otherwise clean imports for curator review.
- Unsupported import channels stage otherwise clean, trusted, attested imports for curator review.
- Malformed top-level import batch payloads stage for curator payload review without throwing before packet generation.
- Malformed block-list payloads stage for curator payload review without creating sanitized shared-manuscript blocks.
- Malformed block entries stage for curator payload review without creating sanitized shared-manuscript blocks.
- Malformed table rows stage for curator payload review and normalize to empty rows instead of entering collaborative state.
- Malformed table cell metadata stages for curator payload review and normalizes to an empty cell matrix instead of entering collaborative state.
- Malformed existing-anchor metadata stages for curator anchor review instead of crashing before packet generation or claiming collision safety.
- Duplicate-anchor collisions flag and regenerate every colliding block before shared insertion, including collisions with anchors that already exist in shared manuscript state and duplicate imported anchors whose source block IDs are missing.
- Table-cell local/private paths are quarantined, redacted, and still formula-escaped when needed.
- Lowercase Windows user paths are fully redacted from sanitized reviewer output after quarantine.
- Forward-slash Windows user paths are fully redacted from sanitized reviewer output after quarantine.
- Source-origin local/private paths are quarantined and redacted before reviewer packets are emitted.
- Untrusted private source-origin paths are not echoed in finding messages after quarantine.
- Malformed review metadata expiry evidence is dropped before imported comments can enter shared state.
- `reports/import-provenance-report.md` summarizes insertion lanes and findings.
- `reports/summary.svg` provides a visual review packet.
- `reports/demo.mp4` is a short H.264 walkthrough generated from synthetic frames.

## Safety Boundaries

All sample records are synthetic. The module does not call network services, external editors, storage systems, reviewer databases, payment systems, or credential stores.
