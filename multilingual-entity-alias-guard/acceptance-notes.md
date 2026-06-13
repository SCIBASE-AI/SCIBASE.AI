# Acceptance Notes

This #17 slice focuses specifically on multilingual scientific alias quality before graph nodes and recommendations are produced.

It is not:

- a broad entity extractor or navigator
- an ontology deprecation or synonym migration tool
- a recommendation visibility or diversity guard
- a geospatial, clinical trial, biological accession, software runtime, temporal validity, or instrument calibration certificate guard

Validation coverage:

- trusted CRISPR aliases in English, German, and Spanish map to one canonical MeSH entity
- Spanish `control` is held as a homograph/false friend instead of silently creating a statistical control-group edge
- same-language translated alias collisions are held instead of silently attaching a mention to the wrong canonical entity
- extractor candidate IDs that disagree with multilingual alias lookup are held instead of silently overriding either signal
- language-tag case differences do not suppress trusted translated aliases
- regional language tags such as `es-MX` use base-language alias and homograph policy while preserving the original tag
- underscore regional language tags such as `es_MX` use the same base-language alias and homograph policy while preserving the original tag
- mixed-script Latin-language aliases such as Cyrillic-lookalike `CRISPR` text or lowercase Greek-alpha `CRISPR-Cαs9` text are held for curator review instead of becoming quiet unknowns
- low-confidence French alias output is suppressed from recommendations
- missing or non-numeric confidence evidence is suppressed before graph recommendations
- sparse ontology/corpus exports with omitted localized names, mention lists, or homograph policies do not crash corpus review
- malformed localized-name entries are omitted from alias lookup and JSON-LD alternate names, with alias evidence issues preserved for review
- malformed mention text values are held for curator review instead of crashing alias normalization or reaching recommendation-safe IDs
- malformed mention rows such as null entries are held for curator review instead of crashing before graph packets are produced
- malformed top-level corpus packets are held for curator review instead of crashing before graph evidence is produced
- localized names remain language-tagged on entity packets
- multilingual scientific instrument/tool aliases can become typed graph nodes when confidence evidence is strong, without introducing calibration-certificate, revocation-window, or unit-compatibility claims
- audit output is deterministic and private-data free
