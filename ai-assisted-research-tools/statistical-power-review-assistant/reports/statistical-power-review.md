# Statistical Power Review

Manuscript: Synthetic Biomarker Response Study
Decision: hold-claim-for-power-review
Risk score: 100
Audit digest: 6b1e7ba57f47e1f0

## Endpoint Checks
- primary-response: effective n=56, required n=131, planned power=0.72
- secondary-quality-of-life: effective n=56, required n=64, planned power=0.81

## Findings
- [high] Endpoint lacks a sample-size justification: primary-response reports n=72 without a prospective sample-size rationale.
  Action: Ask authors to add a prospective sample-size calculation or downgrade the AI summary confidence.
- [high] Planned power is below the review threshold: primary-response planned power is 0.72, below required 0.8.
  Action: Hold strong efficacy or reproducibility claims until the manuscript explains the lower power target.
- [blocker] Effective sample size is below the required level: primary-response effective n=56 after attrition/exclusions, below required n=131.
  Action: Flag the endpoint as underpowered and require either more data, narrower claims, or an exploratory label.
- [medium] Attrition risk is not reflected in a sensitivity analysis: primary-response attrition is 18% without a sensitivity check.
  Action: Request an attrition-adjusted sensitivity analysis before AI summaries treat the result as stable.
- [medium] Effect-size source does not match the manuscript domain: primary-response uses effect-size evidence from metabolic-screening for oncology-biomarker.
  Action: Ask reviewers to verify transferability or replace the effect-size prior with domain-matched evidence.
- [high] Effective sample size is below the required level: secondary-quality-of-life effective n=56 after attrition/exclusions, below required n=64.
  Action: Flag the endpoint as underpowered and require either more data, narrower claims, or an exploratory label.
- [medium] Headline claim relies on a secondary endpoint: secondary-quality-of-life is secondary but appears in the manuscript headline claim.
  Action: Keep the claim visible only as exploratory unless authors realign the endpoint hierarchy.
- [high] Subgroup claim is based on too few observations: subgroup-young-adults uses subgroup n=18, below minimum n=30.
  Action: Downgrade subgroup language and request a larger confirmatory cohort before profile summaries endorse it.
- [high] Model has too few events per parameter: subgroup-young-adults has 6 events for 2 model parameters.
  Action: Hold model-performance claims until event-count adequacy or penalized modeling evidence is provided.
- [high] AI summary confidence exceeds statistical-power evidence: At least one high-confidence manuscript claim depends on underpowered or weakly justified evidence.
  Action: Reduce AI summary confidence and surface the statistical-power caveat to reviewers.

## Safety
- Synthetic manuscript packet only; no patient data, private manuscripts, live statistics services, credentials, or external APIs.
