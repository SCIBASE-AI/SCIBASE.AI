# Multilingual Entity Alias Guard

This module adds a focused Scientific Knowledge Graph Integration slice for SCIBASE issue #17. It normalizes multilingual scientific mentions before they become graph nodes, entity-page aliases, or recommendation signals.

The guard accepts trusted translated aliases only when numeric confidence evidence is present, preserves original language tags, normalizes language-tag casing and underscore or hyphen regional separators for lookup, falls back from regional language tags to their base language, emits JSON-LD-style entity packets, preserves optional typed graph entity metadata such as scientific instruments or tools, holds homographs, false friends, same-language alias collisions, extractor-candidate/alias conflicts, malformed top-level corpus packets, malformed mention entries or mention text, and mixed-script Latin-language lookalikes including lowercase Greek or Cyrillic confusables for curator review, suppresses low-confidence or missing-confidence aliases before recommendations are shown, and treats omitted or malformed localized names, mentions, or homograph policies as sparse graph evidence instead of crashing corpus review.

This remains an entity-alias slice: it can canonicalize multilingual instrument/tool names into typed graph nodes, but it does not validate calibration certificates, revocation windows, unit compatibility, or measurement-chain compliance.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/alias-guard-packet.json`
- `reports/sparse-alias-guard-packet.json`
- `reports/candidate-alias-conflict-packet.json`
- `reports/malformed-mention-text-packet.json`
- `reports/malformed-mention-entry-packet.json`
- `reports/malformed-alias-evidence-packet.json`
- `reports/malformed-corpus-packet.json`
- `reports/alias-guard-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call live ontologies, identity providers, external APIs, private corpora, search indexes, or recommendation systems.
