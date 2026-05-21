# Knowledge Graph Recommendation Diversity Report

Status: hold
Audit digest: 4b0b52688d9e49051fa43f68ab9a914134dc767e5a1fd0c945096bcbda1fd5df

## Recommendation Set

Title: Discovery mode recommendations for CRISPR stress-screen projects
Audience: computational biology researchers
Showable recommendations: 2/5

## Concentration Checks

| Metric | Top value | Share | Limit |
| --- | --- | ---: | ---: |
| institution | Stanford | 0.6 | 0.5 |
| funder | Funder A | 0.6 | 0.5 |
| domain | single-cell biology | 0.8 | 0.7 |
| method | CRISPR screen | 0.8 | 0.5 |

## Recommendation Review

| Recommendation | Status | Institution | Funder | Method | Blockers |
| --- | --- | --- | --- | --- | --- |
| rec-1 | hold | Stanford | Funder A | CRISPR screen | insufficient_rationale_edges |
| rec-2 | hold | Stanford | Funder A | CRISPR screen | insufficient_rationale_edges |
| rec-3 | hold | Stanford | Funder A | CRISPR screen | insufficient_rationale_edges |
| rec-4 | show | Cambridge | Funder B | CRISPR screen | - |
| rec-5 | show | Tokyo BioLab | Funder C | confocal imaging | - |

## Citation Herd

- Top cited recommendation: rec-1
- Citation share: 0.495

## Stale Evidence

- Stale evidence share: 0.6

## Blockers

- too_few_showable_recommendations
- institution_concentration
- funder_concentration
- domain_concentration
- method_concentration
- stale_evidence_dominance
- rec-1_insufficient_rationale_edges
- rec-2_insufficient_rationale_edges
- rec-3_insufficient_rationale_edges

## Curator Actions

- add_more_diverse_candidates
- rebalance_institution_mix
- rebalance_funder_mix
- rebalance_domain_mix
- rebalance_method_mix
- refresh_recommendation_evidence
- rec-1_add_explainable_graph_path
- rec-1_refresh_or_label_evidence_age
- rec-2_add_explainable_graph_path
- rec-2_refresh_or_label_evidence_age
- rec-3_add_explainable_graph_path
- rec-3_refresh_or_label_evidence_age
