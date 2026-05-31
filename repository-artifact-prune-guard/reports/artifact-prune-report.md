# Artifact Prune Guard Report

Status: blocked
Checked at: 2026-05-31T04:45:00.000Z

## Approved Prunes

- orphan-scratch-plot: unreferenced for 118 days and no release evidence depends on it

## Blocked Prunes

- fig-survival-curve (results/figures/survival-curve.svg)
  - CITATION_EVIDENCE_BOUND: fig-survival-curve (results/figures/survival-curve.svg) is still required by manuscript/citations.json#figure-2
  - DOI_VERSION_BOUND: fig-survival-curve (results/figures/survival-curve.svg) is still required by metadata.json#doi:10.5555/scibase.demo.v1
- raw-screening-table (data/raw/screening-table.csv)
  - EXPORT_MANIFEST_BOUND: raw-screening-table (data/raw/screening-table.csv) is still required by exports/release-v1/manifest.json
- notebook-run-packet (notebooks/run-2026-05-01/replay-packet.json)
  - REPRODUCIBILITY_PACKET_BOUND: notebook-run-packet (notebooks/run-2026-05-01/replay-packet.json) is still required by results/reproducibility/run-2026-05-01.json
  - MINIMUM_AGE_NOT_MET: notebook-run-packet (notebooks/run-2026-05-01/replay-packet.json) is 29 days old; policy requires 30
- protocol-appendix (protocols/appendix-a.md)
  - RETENTION_HOLD: protocol-appendix (protocols/appendix-a.md) has an active retention hold: IRB audit window closes 2026-12-31
