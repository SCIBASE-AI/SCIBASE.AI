# Requirements Map

Issue: `SCIBASE-AI/SCIBASE.AI#17`

| Issue requirement | Implementation |
| --- | --- |
| Scientific knowledge graph integration | Models sample, dataset, and graph-edge metadata before entity pages and recommendations are published. |
| Entity extraction | Validates field-sample entities, coordinates, vouchers, dataset DOI links, and graph edge endpoints. |
| Knowledge navigation | Blocks unsafe or unresolved sample-location edges before they appear in graph navigation. |
| AI research recommendations | Suppresses public recommendations when geospatial provenance, sensitive-site redaction, or DOI evidence is incomplete. |
| Linked data and metadata | Checks unique graph identities and DOI provenance, CRS normalization, country/coordinate consistency, coordinate precision, collection dates, and sample-to-dataset DOI alignment. |
| Safe local validation | Includes dependency-free tests and demo generation from synthetic sample and graph metadata only. |

## Non-goals

- No live geocoder, repository, GIS, ontology, specimen, journal, or external API calls.
- No private field locations, real endangered species data, credentials, or live graph mutations.
- No replacement for ontology, clinical-trial, funder, software, ethics, evidence freshness, or recommendation-diversity workflows.
