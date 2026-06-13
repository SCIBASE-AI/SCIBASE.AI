# Multilingual Entity Alias Guard

Corpus: kg-multilingual-upload-batch-17
Generated: 2026-05-28T07:00:00Z

## Summary

- Accepted mentions: 6
- Held curator-review mentions: 3
- Suppressed low-confidence mentions: 1
- Entity packets emitted: 3
- Audit digest: sha256:f11c08d8634f046b8382a175239964b368830acc24fe0f8c2ff1b92cdd02ef8f

## Accepted Canonical Mappings

- mention-crispr-en: CRISPR-Cas9 (en) -> entity:mesh:D000077768
- mention-crispr-de: CRISPR-Cas9 Geneditierung (de) -> entity:mesh:D000077768
- mention-crispr-es: edicion genetica CRISPR-Cas9 (es) -> entity:mesh:D000077768
- mention-diabetes-en: diabetes mellitus (en) -> entity:mesh:D003920
- mention-diabetes-de: Diabetes mellitus (de) -> entity:mesh:D003920
- mention-diabetes-es: diabetes mellitus (es) -> entity:mesh:D003920

## Curator Actions

- curate-mention-control-es: review-multilingual-homograph (es:control)
- curate-mention-cellule-fr: verify-translated-alias-before-recommendation (fr:cellule)
- curate-mention-crispr-cyrillic-spoof: review-multilingual-script-confusable (en:СRISPR-Cas9)
- curate-mention-crispr-greek-alpha-spoof: review-multilingual-script-confusable (en:CRISPR-Cαs9)

## Recommendation Guard

Held or suppressed mentions are not allowed to drive entity-page recommendations until a curator verifies the alias mapping.

## Sparse Corpus Guard

Sparse ontology or corpus exports that omit localized names, mention lists, or homograph policy still produce deterministic graph review evidence. The sparse fixture emitted 1 entity packet and 0 mention decisions.

## Candidate Alias Conflict Guard

Extractor candidates that disagree with trusted multilingual alias lookup are held for curator review instead of silently overriding the upstream candidate. The conflict fixture decision is hold-for-curator-review with reason candidate-alias-conflict.

## Malformed Mention Text Guard

Malformed mention text values are held for curator review instead of crashing alias normalization. The malformed fixture decision is hold-for-curator-review with reason malformed-mention-text, and it emits review-multilingual-malformed-mention.

## Malformed Mention Entry Guard

Malformed mention rows such as null entries are held for curator review instead of crashing before graph packets are produced. The malformed entry fixture decision is hold-for-curator-review with reason malformed-mention-entry, and it emits review-multilingual-malformed-mention.

## Malformed Alias Evidence Guard

Malformed localized-name evidence is omitted from alias lookup and JSON-LD alternate names instead of crashing ontology review. The malformed alias fixture records 1 alias evidence issue with reason malformed-localized-name.

## Malformed Corpus Guard

Malformed top-level corpus packets are held for curator review instead of crashing before graph evidence is produced. The malformed corpus fixture emits malformed-corpus-packet, review-multilingual-malformed-corpus, and no recommendation-safe entity IDs.

## Safety

All fixtures are synthetic. The module does not call live ontologies, identity providers, external APIs, private corpora, search indexes, or recommendation systems.
