# AI-Assisted Contribution Disclosure Guard

Project: Inflammatory flare reproducibility review
Decision: hold-reputation-update

## Summary

- Contributions checked: 4
- Contributors: 4
- Blockers: 4
- Holds: 3
- Base points: 160
- Awarded points: 51
- Withheld points: 109

## Contribution Decisions

- allow-reputation-credit: review-104 by dr-avery (40/40 points)
- hold-reputation-credit: review-105 by casey-lab (0/35 points)
- hold-reputation-credit: rerun-210 by morgan-data (0/55 points)
- reduce-credit-pending-evidence: credit-314 by taylor-orcid (11/30 points)

## Findings

- BLOCKER ai-assistance-undisclosed (review-105): AI assistance is marked as used but was not disclosed on the reputation-bearing contribution.
- BLOCKER human-verification-missing (review-105): High-impact AI-assisted contribution lacks human verification before reputation credit.
- BLOCKER generated-text-signal-undisclosed (review-105): Contribution text contains generated-text signals while AI disclosure is absent.
- HOLD artifact-provenance-missing (review-105): Reputation-bearing contribution is missing artifact provenance links.
- HOLD credit-role-evidence-missing (review-105): One or more CRediT-style roles lacks supporting evidence.
- BLOCKER human-verification-missing (rerun-210): High-impact AI-assisted contribution lacks human verification before reputation credit.
- HOLD credit-role-evidence-missing (credit-314): One or more CRediT-style roles lacks supporting evidence.

## Remediation

- Require explicit AI-assistance disclosure before contribution points can affect reputation.
- Collect human verifier attestation for high-impact reviews, reruns, datasets, and credit claims.
- Attach artifact ids, commit ids, dataset ids, or review ids to every reputation-bearing event.
- Add evidence for each CRediT role or remove unsupported roles from the reputation event.
