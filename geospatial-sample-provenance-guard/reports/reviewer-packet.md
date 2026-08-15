# Geospatial Sample Provenance Guard

Issue: SCIBASE-AI/SCIBASE.AI#17
Graph packet: kg-field-samples-2026-05
Entity page: field-sample-climate-adaptation
Decision: block-geospatial-graph-publication
Score: 0

## Severity Summary

| Severity | Count |
| --- | ---: |
| critical | 1 |
| high | 5 |
| medium | 1 |
| low | 0 |

## Findings

- **critical / sensitive-site-overprecise-public-coordinate**: sample-001 exposes 5 decimal coordinates for endangered-species.
  - Action: Round or redact the location before public discovery recommendations are enabled.
  - Refs: sample-001, endangered-species
- **high / coordinate-crs-not-normalized**: sample-002 uses EPSG:3857, not EPSG:4326.
  - Action: Normalize coordinates to the graph CRS before entity pages or recommendations are shown.
  - Refs: sample-002, EPSG:3857
- **high / country-coordinate-mismatch**: sample-002 coordinates do not fall inside the expected Peru bounds.
  - Action: Hold location-derived graph edges until country and coordinate provenance are reconciled.
  - Refs: sample-002, Peru
- **high / sample-voucher-missing**: sample-002 has no specimen or field voucher identifier.
  - Action: Attach a voucher/specimen accession before the sample appears in entity pages.
  - Refs: sample-002
- **high / sample-dataset-doi-unresolved**: sample-002 references unresolved dataset DOI 10.5281/zenodo.unknown.
  - Action: Repair DOI alignment before graph edges are emitted.
  - Refs: sample-002, 10.5281/zenodo.unknown
- **medium / collection-date-in-future**: sample-002 collection date 2026-06-30 is after the graph packet date.
  - Action: Hold temporal graph edges until the collection date is corrected or the packet date advances.
  - Refs: sample-002, 2026-06-30
- **high / sample-dataset-edge-doi-mismatch**: edge-2 links sample-002 to dataset-peru-water, but the sample declares 10.5281/zenodo.unknown.
  - Action: Rebuild the graph edge from DOI-resolved dataset metadata.
  - Refs: edge-2, sample-002, dataset-peru-water

## Safety

- Synthetic sample, dataset, coordinate, and graph-edge metadata only
- No geocoder, repository, GIS, ontology, specimen, journal, or external API calls
- No private field locations, real endangered species data, credentials, or live graph mutations
