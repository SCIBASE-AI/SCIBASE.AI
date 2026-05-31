# Executive Summary Claim Trace Assistant

This dependency-free module reviews AI-generated executive summaries before they
are shared with collaborators, funders, or editors. It checks whether summary
claims are traceable to manuscript evidence and whether implications or next
steps are framed within the available evidence.

## Checks

- Each executive summary bullet includes at least one source evidence ID.
- Referenced evidence IDs exist in the manuscript evidence packet.
- Key findings are backed by results, tables, figures, or methods evidence.
- Implications and next steps avoid unsupported universal language.
- Clinical, policy, or funding claims require appropriate evidence types.
- Numeric claims must match numbers present in the traced evidence.
- Key findings must share enough terminology with the cited evidence to avoid
  decorative or unrelated citations.
- Unsupported or over-broad bullets receive reviewer rewrite suggestions.

## Run

```bash
python3 executive-summary-claim-trace-assistant/summary_claim_trace_assistant.py \
  --sample \
  --json executive-summary-claim-trace-assistant/demo/report.json \
  --markdown executive-summary-claim-trace-assistant/demo/summary.md \
  --svg executive-summary-claim-trace-assistant/demo/graph.svg
```

Generated demo artifacts in `demo/` show the JSON decision payload, a reviewer
Markdown table, an SVG status chart, and a short MP4 walkthrough for bounty
reviewers.

## Test

```bash
python3 -m unittest executive-summary-claim-trace-assistant/test_summary_claim_trace_assistant.py
```
