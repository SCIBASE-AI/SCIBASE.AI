# Requirements Map

## Entity Extraction

- Preserves language-tagged mentions from uploaded papers and datasets.
- Maps trusted translated aliases to canonical ontology identifiers.
- Normalizes language-tag casing plus hyphenated or underscored regional subtags for alias lookup while preserving the original tag on decisions.
- Holds false friends and homographs before creating graph edges.
- Holds same-language alias collisions when ontology entries reuse the same translated term.
- Holds extractor-candidate and multilingual-alias conflicts before creating graph edges or recommendation inputs.
- Holds malformed mention text values for curator review instead of crashing alias normalization or accepting unsafe graph evidence.
- Holds malformed mention rows for curator review instead of crashing before graph packets are produced.
- Holds Latin-language mentions with Cyrillic or Greek lookalike characters, including lowercase Greek confusables, for curator review before creating graph edges.
- Treats omitted localized-name maps, malformed localized-name entries, mention lists, and homograph policies as sparse graph evidence instead of crashing corpus review.
- Emits schema.org-style `DefinedTerm` JSON-LD packets for entity pages.
- Carries optional typed entity metadata, including scientific instrument/tool aliases, into JSON-LD packets without claiming calibration-chain validation.

## Knowledge Navigation

- Keeps accepted multilingual aliases attached to canonical entity pages.
- Produces curator actions for ambiguous terms that would pollute graph search.
- Prevents unknown or low-confidence aliases from becoming discoverable graph nodes.

## AI Research Recommendations

- Suppresses low-confidence or missing-confidence mentions from recommendation inputs.
- Exposes safe canonical entity IDs for graph recommendations.
- Keeps multilingual evidence auditable with deterministic digests.

## Safety And Scope

- Synthetic data only.
- No credentials, private corpora, live ontology calls, external APIs, or production recommendation systems.
- This slice is distinct from ontology drift, synonym dedupe, generic entity disambiguation, temporal validity, geospatial provenance, instrument calibration certificate validity/revocation/unit-compatibility guards, and recommendation visibility/diversity guards.
