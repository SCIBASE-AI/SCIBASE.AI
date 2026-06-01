# Sample Custody Quality Graph Guard

Graph: kg-sample-custody-risky
Status: HOLD
Fingerprint: 92285cf83c973c8e

## Summary

Sample graph publication is hold with 3 critical, 6 high, and 2 warning finding(s).

## Held Edges

- SAMPLE-BETA: COLD_CHAIN_TEMPERATURE_EXCURSION, CUSTODY_CHAIN_BREAK, COLLECTION_TO_PRESERVATION_DELAY, CUSTODY_HANDOFF_INCOMPLETE, FREEZE_THAW_LIMIT_EXCEEDED, SAMPLE_INTEGRITY_BELOW_THRESHOLD, REQUIRED_SAMPLE_GRAPH_EDGE_MISSING
- SAMPLE-GAMMA: CUSTODY_CHAIN_MISSING, PRESERVATION_PROTOCOL_MISSING, TEMPERATURE_LOG_MISSING, REQUIRED_SAMPLE_GRAPH_EDGE_MISSING

## Findings

- CRITICAL COLD_CHAIN_TEMPERATURE_EXCURSION: SAMPLE-BETA has 1 temperature excursion(s) outside policy.
  - Remediation: Hold graph edges until excursion review and assay impact notes are attached.
- CRITICAL CUSTODY_CHAIN_BREAK: SAMPLE-BETA custody chain breaks between events 0 and 1.
  - Remediation: Insert the missing transfer or hold graph publication for the sample.
- CRITICAL CUSTODY_CHAIN_MISSING: SAMPLE-GAMMA has no chain-of-custody events.
  - Remediation: Attach signed handoff events from collection through analysis.
- HIGH COLLECTION_TO_PRESERVATION_DELAY: SAMPLE-BETA waited 9.5 hours before preservation.
  - Remediation: Hold sample edges until degradation impact is reviewed or replacement evidence is supplied.
- HIGH CUSTODY_HANDOFF_INCOMPLETE: SAMPLE-BETA has an incomplete custody handoff at event 1.
  - Remediation: Complete the signed custody handoff record.
- HIGH FREEZE_THAW_LIMIT_EXCEEDED: SAMPLE-BETA exceeds the allowed freeze-thaw cycle limit.
  - Remediation: Suppress reuse/recommendation edges or attach validated degradation analysis.
- HIGH PRESERVATION_PROTOCOL_MISSING: SAMPLE-GAMMA is missing preservation protocol evidence.
  - Remediation: Attach preservation protocol id and timestamp.
- HIGH SAMPLE_INTEGRITY_BELOW_THRESHOLD: SAMPLE-BETA has integrity score 0.69, below policy threshold.
  - Remediation: Downgrade or hold sample graph edges until a curator reviews quality evidence.
- HIGH TEMPERATURE_LOG_MISSING: SAMPLE-GAMMA has no cold-chain temperature log.
  - Remediation: Attach temperature logger evidence before publishing sample edges.
- WARNING REQUIRED_SAMPLE_GRAPH_EDGE_MISSING: SAMPLE-BETA is missing required graph edge type(s): sample-to-assay.
  - Remediation: Attach the missing edge evidence or mark the sample as partial provenance.
- WARNING REQUIRED_SAMPLE_GRAPH_EDGE_MISSING: SAMPLE-GAMMA is missing required graph edge type(s): sample-to-dataset, sample-to-assay.
  - Remediation: Attach the missing edge evidence or mark the sample as partial provenance.
