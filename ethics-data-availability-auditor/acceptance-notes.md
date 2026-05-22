# Acceptance Notes

## What This Adds

This PR adds an ethics and data availability readiness auditor for manuscript packets. It gives a reviewer a deterministic decision packet covering:

- ethics approval and consent language
- data and code availability statements
- claim-to-artifact evidence mapping
- private dataset release gaps
- reviewer tasks and an audit digest

## Non-Overlap

Current #13 submissions cover summarization, citation diversity, citation style, citation retraction, evidence verification, figure/table evidence, protocol deviation, novelty overlap, manuscript similarity, and supplementary material readiness. This module focuses specifically on ethics and data/code availability compliance.

## Boundaries

- Synthetic sample data only.
- No external APIs.
- No real participant data.
- No LLM calls.
- Not a full manuscript editor or citation engine.
