# Organism Strain Boundary Report

Generated: 2026-05-31T00:00:00Z
Graph: scibase-organism-boundary-demo
Audit digest: 56e2969b5599c79308f6540e2f8ca092c1dda3010de70618a953c4a462fe5a12

## Summary

- Entities: 8
- Edges: 5
- Edge allow: 2
- Edge curator review: 1
- Edge suppress: 2
- Recommendations: 3
- Recommendation show: 1
- Recommendation show with notice: 1
- Recommendation suppress: 1

## Edge Decisions

### edge:human-sample-organism

- Type: sample_of_organism
- Decision: allow
- Blockers: none
- Warnings: none
- Actions: publish biological graph edge; allow recommendation paths to use this edge
- Digest: 77db95f47588df7a4e7e2e9fefe7fdbea2acc70135e194e000896f89a70e8b47

### edge:balbc-strain-human-parent

- Type: strain_of_species
- Decision: suppress
- Blockers: strain_parent_taxon_mismatch
- Warnings: none
- Actions: suppress strain edge until parent organism is corrected; request strain registry evidence from curator
- Digest: 76aaa44f857a62daea2bf7bb7b434f939675143c9667aab968511efd578b4eeb

### edge:pathogen-mouse-host

- Type: pathogen_in_host
- Decision: suppress
- Blockers: host_taxon_not_supported
- Warnings: host_range_evidence_missing
- Actions: suppress host recommendation path; request host range evidence or mark as experimental model
- Digest: 3e512718b0236efb8be0268f51e8d2c83631964b313864940052d6d27a87b885

### edge:hela-human-cell-line

- Type: cell_line_from_species
- Decision: allow
- Blockers: none
- Warnings: none
- Actions: publish biological graph edge; allow recommendation paths to use this edge
- Digest: d94653cb2561ea2b2e3e420eed328b8979eb842e96fd5d9c36802e00dea584a0

### edge:mixed-sample-dataset

- Type: dataset_contains_sample
- Decision: curator_review
- Blockers: none
- Warnings: mixed_organism_review_missing
- Actions: show dataset path only with contamination review notice; request co-culture or contamination review evidence
- Digest: 57c370bba251646dcb718661da8208bc8eb86daef7b6438c28ee0fb09896d6d3

## Recommendation Decisions

### rec:human-cell-line-context

- Label: Show human sample and HeLa context on entity page
- Decision: show
- Path: edge:human-sample-organism:allow, edge:hela-human-cell-line:allow
- Blockers: none
- Warnings: none
- Digest: 4339fe085adbb40463402134ca1f3e24aba081036f1e4cc20d4f9d597da0ee20

### rec:bad-strain-parent

- Label: Recommend BALB/c as human organism evidence
- Decision: suppress
- Path: edge:balbc-strain-human-parent:suppress
- Blockers: path_contains_suppressed_edge
- Warnings: none
- Digest: 1f5c8e41562c3ecd0ffbe7c29a8210dd88006942b34bd55db559d84a5940e237

### rec:mixed-sample-notice

- Label: Recommend mixed airway culture with contamination notice
- Decision: show_with_notice
- Path: edge:mixed-sample-dataset:curator_review
- Blockers: none
- Warnings: path_contains_review_edge
- Digest: 53f51b55511ea89a7d932e36fd8e6eeaf5a365e222acf6aed8a994512d68c205
