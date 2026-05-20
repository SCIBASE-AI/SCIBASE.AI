# Requirements Map

| Issue #18 Requirement | Implementation Evidence |
| --- | --- |
| Challenge Posting Portal with scientific context and deliverables | Sample challenges model sponsor Q&A after posting and tie material clarifications back to challenge context. |
| Evaluation criteria and scoring rubric fairness | Material answers and attachments must be visible to all eligible teams before evaluation continues. |
| Timeline and milestone deadlines | Scope-changing clarifications must extend or reopen the submission window. |
| Public vs. private challenges and anonymous participation | Anonymous challenges are checked for solver identity leaks in clarification packets. |
| Pre-qualification rounds | Clarification parity is evaluated against the eligible team set. |
| Secure private submission engine | Private attachment advantage is blocked when a sponsor gives evaluation data to a single team. |
| Arbitration and feedback loop | Operator tasks route fairness failures into hold, broadcast, amendment, or reopen workflows. |
| Trust on both sides | Deterministic clarification roots, audit digests, and reviewer packets provide proof that all teams saw the same material information. |
| Reviewer-ready proof | `test.js` covers clean publication, late answers, private material answers, scope changes, anonymous identity leaks, overdue questions, root mismatches, and combined summary behavior. |
