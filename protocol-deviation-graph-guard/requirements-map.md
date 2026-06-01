# Requirements Map

Issue #17 asks for Scientific Knowledge Graph Integration: entity extraction, knowledge navigation, recommendation support, and safe linked graph metadata.

This slice covers a distinct graph-publication control:

- **Entity and relationship quality**: validates protocol, experiment, dataset, and recommendation edges before publication.
- **Knowledge navigation safety**: holds edges where a dataset or experiment claims to follow a protocol but evidence shows missing steps, expired calibration, lot mismatch, or incompatible protocol version.
- **Recommendation safety**: blocks recommendation edges when protocol deviations could make downstream reuse misleading.
- **Schema-style metadata readiness**: emits deterministic JSON and SVG reviewer artifacts that describe graph edge actions and reasons.
- **Reviewability**: includes tests, synthetic sample data, Markdown reports, and a demo video.

Non-overlap: this is not a broad extractor, ontology drift, multilingual alias, temporal consistency, geospatial sample provenance, sample custody/cold-chain, software dependency, image metadata, funding provenance, relationship conflict, or measurement harmonization slice. It focuses only on experiment-to-protocol adherence and graph edge hold/release actions.
