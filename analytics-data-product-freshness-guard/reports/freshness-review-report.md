# Analytics Data Product Freshness Review: eu-consortium-analytics-synthetic

Decision: **hold_analytics_invoice**
Audit digest: `sha256:88532af412b7f387`
Monthly fee: $1800.00
Recommended credit: $1782.00
Net invoice: $0.00

## Findings

| Severity | Code | Message | Action | Credit |
| --- | --- | --- | --- | --- |
| critical | `ANONYMIZATION_THRESHOLD_BREACH` | segment-rare-disease-lab-methods was published with cohort size 11, below the contracted minimum 30. | `suppress_segment_and_hold_invoice` | $0.00 |
| high | `DELIVERY_EVIDENCE_MISSING` | Customer-facing delivery evidence is incomplete for the licensed analytics product. | `attach_delivery_evidence_before_invoice` | $0.00 |
| high | `METRIC_COVERAGE_INCOMPLETE` | Missing 2 contracted analytics metrics: reproducibility-score-index, project-lineage-map. | `restore_metric_coverage_or_credit_invoice` | $432.00 |
| high | `SNAPSHOT_STALE` | Snapshot age is 27 days, beyond the 14 day cadence plus 2 day grace window. | `refresh_snapshot_before_invoice` | $450.00 |
| high | `SOURCE_EMBARGO_UNRESOLVED` | project-embargoed-dataset remains embargoed for 19 more days but is included in the billed snapshot. | `exclude_embargoed_source_before_billing` | $360.00 |
| high | `SOURCE_PROJECT_WITHDRAWAL_UNRESOLVED` | project-withdrawn-lab-notebook was withdrawn before billing but remains included in the analytics snapshot. | `remove_withdrawn_source_and_refresh_snapshot` | $360.00 |
| medium | `REPRODUCIBILITY_FEED_STALE` | Reproducibility score feed is 22 days old, beyond the 14 day maximum. | `refresh_reproducibility_score_feed` | $180.00 |

## Coverage

- Required metrics: citation-network-growth, dataset-reuse-rate, reproducibility-score-index, method-adoption-trends, project-lineage-map
- Delivered metrics: citation-network-growth, dataset-reuse-rate, method-adoption-trends
- Missing metrics: reproducibility-score-index, project-lineage-map
- Snapshot age days: 27
- Reproducibility feed age days: 22
- Delivery evidence age days: unknown

Synthetic data only. No private research data, customer portals, billing systems, payment processors, credentials, payout systems, or external APIs are used.
