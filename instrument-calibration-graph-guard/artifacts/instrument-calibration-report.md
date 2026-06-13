# Instrument Calibration Graph Guard Report

Generated: 2026-06-12T00:00:00Z

## Summary

- Blocking findings: 4
- Review findings: 2
- Passing findings: 12

## Instrument Decisions

### instrument:mass-spec:orbitrap-0021

- Decision: PUBLISH_GRAPH_EDGE
- Instrument type: mass_spectrometer
- Certificate: cal-2026-ms-0021
- Experiment edges: 1

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| pass | instrument_identity_ready | Instrument node has stable model, serial, type, and graph ID metadata. | No remediation required. |
| pass | calibration_certificate_present | Calibration certificate metadata and artifact hash are present. | No remediation required. |
| pass | calibration_current | Calibration certificate is current at review time. | No remediation required. |
| pass | experiment_edges_covered | All experiment edges fall inside the calibration validity window. | No remediation required. |
| pass | unit_compatibility_ready | Experiment measurement units match declared instrument capabilities. | No remediation required. |
| pass | recommendation_controls_ready | Recommendation targets can be held when calibration evidence is not publishable. | No remediation required. |

### instrument:microscope:confocal-17

- Decision: HOLD_FOR_CURATOR
- Instrument type: confocal_microscope
- Certificate: cal-2025-micro-17
- Experiment edges: 1

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| pass | instrument_identity_ready | Instrument node has stable model, serial, type, and graph ID metadata. | No remediation required. |
| pass | calibration_certificate_present | Calibration certificate metadata and artifact hash are present. | No remediation required. |
| review | calibration_expired | Calibration certificate expired at 2025-12-31T23:59:59.000Z. | Refresh calibration evidence or hold graph publication for affected instrument edges. |
| pass | experiment_edges_covered | All experiment edges fall inside the calibration validity window. | No remediation required. |
| pass | unit_compatibility_ready | Experiment measurement units match declared instrument capabilities. | No remediation required. |
| pass | recommendation_controls_ready | Recommendation targets can be held when calibration evidence is not publishable. | No remediation required. |

### instrument:sequencer:seq-09

- Decision: BLOCK_RECOMMENDATION
- Instrument type: sequencer
- Certificate: cal-2026-seq-09
- Experiment edges: 1

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| pass | instrument_identity_ready | Instrument node has stable model, serial, type, and graph ID metadata. | No remediation required. |
| block | calibration_certificate_missing | Calibration certificate evidence missing: artifactHash. | Attach calibration certificate ID, issuer, artifact hash, and validity dates. |
| block | calibration_revoked | Calibration certificate is revoked. | Remove the instrument from public recommendations until a valid replacement certificate is attached. |
| block | experiment_outside_calibration_window | Experiment edges outside calibration window: edge:rnaseq-run-19. | Split or hold experiment edges measured outside the calibration validity window. |
| review | unit_incompatible | Measurement units not declared for instrument capability: edge:rnaseq-run-19:cycles. | Normalize units or route the graph packet to a curator for capability review. |
| block | recommendation_without_hold_control | Recommendation targets need hold controls before publication: recommend:single-cell-pipeline. | Add hold controls so recommendation edges are suppressed when calibration evidence fails. |
