# Enterprise Training Policy Guard Demo

Generated: 2026-06-01T20:13:21.063Z

| Scenario | Decision | Blockers | Revisions | Summary |
| --- | --- | ---: | ---: | --- |
| enterprise-export-001 | release | 0 | 0 | All required enterprise training and policy acknowledgements are current. |
| enterprise-export-002 | hold | 4 | 2 | Hold or revise before enterprise export/privileged access continues. |

## Hold Findings

- **POLICY_ACK_STALE** (revise) for u-200: u-200 acknowledged data-use more than 180 days ago. Refresh data-use acknowledgement and attach the receipt.
- **POLICY_ACK_MISSING** (block) for u-200: u-200 has not acknowledged required policy ai-review. Collect ai-review acknowledgement before privileged_export.
- **TRAINING_EXPIRED** (block) for u-200: u-200 has expired human-subjects training. Renew human-subjects training and upload a current certificate.
- **TRAINING_RECEIPT_MISSING** (revise) for u-200: u-200 has secure-export completion without evidence receipt. Attach a signed receipt for secure-export.
- **POLICY_ACK_MISSING** (block) for u-201: u-201 has not acknowledged required policy export-control. Collect export-control acknowledgement before privileged_export.
- **TRAINING_MISSING** (block) for u-201: u-201 is missing required training secure-export. Complete secure-export training before privileged access is released.