# Protocol Deviation Review

Manuscript: manuscript-neuro-042
Protocol: protocol-neuro-042
Decision: hold-confirmatory-claim
Risk score: 100
Audit digest: e55f46a217008cfa

## Findings
- [blocker] Manuscript reports an endpoint not present in the protocol: neural-response appears as primary but was not preregistered.
  Action: Mark the endpoint exploratory unless a dated amendment explains the addition.
- [high] Endpoint role changed from the preregistered hierarchy: memory-score planned=primary reported=secondary.
  Action: Preserve the preregistered hierarchy in AI summaries or require amendment evidence.
- [medium] Planned endpoint is missing from the manuscript: reaction-time was preregistered as secondary but is absent.
  Action: Ask authors to report the endpoint or explain why it was dropped.
- [high] Analysis model was not in the preregistered plan: posthoc-random-forest appears in the manuscript but not the protocol.
  Action: Label the analysis as post hoc unless a preregistered amendment covers it.
- [blocker] Model was tuned after outcome review without amendment: posthoc-random-forest was tuned after outcome review with no amendment ID.
  Action: Block high-confidence AI interpretation until model-tuning provenance is reviewed.
- [high] Exclusion reason was not preregistered: 18 records excluded for low-response-cluster.
  Action: Require sensitivity analysis with and without the unplanned exclusion.
- [blocker] Exclusion was decided after outcome review without blinding: low-response-cluster exclusions were outcome-aware.
  Action: Block confirmatory language until an independent blinded review is documented.
- [high] Protocol amendment timestamp is missing or after analysis began: amend-late timestamp=2026-05-01T00:00:00Z analysisStartedAt=2026-04-15T00:00:00Z.
  Action: Treat the amendment as post hoc unless timestamp provenance is corrected.
- [high] Manuscript references an amendment missing from protocol records: amend-missing is declared in the manuscript but absent from protocol amendments.
  Action: Attach the dated protocol amendment or remove unsupported amendment language.
- [high] AI summary confidence is too high for protocol-deviation evidence: The manuscript has high-risk protocol deviations while the AI summary reports high confidence.
  Action: Lower AI summary confidence and surface preregistration caveats to reviewers.
- [medium] AI summary omits protocol-deviation caveats: Protocol deviation findings are present but the summary does not mention them.
  Action: Add a structured protocol-deviation caveat to the AI-generated review.

## Safety
- Synthetic protocol/manuscript data only; no patient data, private manuscripts, registry services, credentials, or external APIs.
