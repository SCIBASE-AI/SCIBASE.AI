# Requirement Map

This contribution targets the AI-Assisted Research Tools bounty with a citation-safety module for research drafts.

| Bounty area | Module coverage |
| --- | --- |
| AI citation tool | Scores and ranks candidate citations for each manuscript claim while blocking unsafe sources from automatic insertion. |
| AI peer review aid | Produces reviewer-ready findings for retracted citations, expressions of concern, and corrected papers that require erratum notes. |
| Technical issue checks | Flags citation integrity problems before submission, including retractions, concern notices, missing replacements, and correction-note requirements. |
| Citation formatting workflow | Builds an insertion plan showing current DOI, recommended DOI, blocked state, and note requirements per claim. |
| Safety and auditability | Emits deterministic watch events and an audit digest for transparent AI-assisted citation decisions. |

## Why this is distinct

Existing #13 submissions cover broad summarizers, evidence grounding, citation provenance readiness, redline packets, and evaluation harnesses. This module focuses specifically on whether the citation tool should recommend or block a paper because of retraction, correction, or expression-of-concern signals.

## Local verification

```bash
npm run check
npm test
npm run demo
```
