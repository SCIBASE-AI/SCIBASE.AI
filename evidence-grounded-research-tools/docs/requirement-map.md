# Requirement Map

| Issue #13 requirement | Implementation |
| --- | --- |
| AI Paper Summarizer | `summarizePaper` supports abstract, executive, and layperson modes. |
| Key findings, implications, next steps | `extractFindings` and `createResearchPacket` return findings, implications, and next steps with evidence spans. |
| AI Peer Review Aid | `runPeerReviewChecks` reports risks for missing data/code availability, ethics language, statistical reporting, citation coverage, and vague claims. |
| Compliance checks | Availability, ethics, and statistical-reporting checks are exposed as structured diagnostics. |
| AI Citation Tool | `recommendCitations` returns citation candidates, reasons, evidence terms, confidence, and formatted style snippets. |
| Similar papers widget foundation | Citation candidates include topic tags and recommendation reasons suitable for a future retrieval UI. |
| Institutional/dashboard readiness | `createBatchResearchPackets` produces stable packet summaries with document IDs, risk counts, finding counts, and citation counts. |

## Output Contract

`createResearchPacket` returns:

- `document`: normalized title, abstract, sections, and compliance signals.
- `summary`: requested summary mode and text.
- `findings`: evidence-linked claims with confidence scores.
- `peerReview`: risk list plus severity counts.
- `citations`: recommendation list with formatted references.
- `workflow`: next steps and dashboard summary.

The packet is deterministic and dependency-free so reviewers can verify it with `npm test` and `npm run demo`.
