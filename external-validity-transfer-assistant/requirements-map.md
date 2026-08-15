# Requirements Map

## SCIBASE #16 Capability Mapping

### Auto Peer Review Reports

- Produces structured claim-level peer-review findings.
- Flags clarity and scope mismatch where claims overstate population, setting, assay, or runtime support.
- Emits reviewer-ready actions for claim wording, validation evidence, and transfer-risk holds.

### Reproducibility Checker

- Checks whether linked evidence includes reproducible runtime artifacts.
- Flags claims that depend on deployment environments without matching rerun evidence.
- Produces blocking or recommended reproducibility actions for reviewer packets.

### Research Gap Finder

- Converts missing transfer contexts into research-gap prompts.
- Ranks gaps that fit the lab's declared capabilities.
- Highlights pediatric validation, ancestry-balanced evaluation, and CPU-only clinic rerun gaps from synthetic corpus signals.

## Acceptance Notes

- Dependency-free CommonJS module.
- Deterministic synthetic sample data.
- Local tests for broad-claim holds, missing evidence quarantine, external validation handling, report rendering, and research-gap output.
- Generated JSON, Markdown, and SVG artifacts via `npm run demo`.
- No external API calls, credentials, private research data, or live clinical records.
