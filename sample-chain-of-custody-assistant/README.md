# Sample Chain-of-Custody Review Assistant

This module adds a deterministic assistant for reviewing wet-lab or clinical sample
chain-of-custody packets before AI-generated research conclusions are released.

It is scoped to synthetic/sample metadata only. It does not call external APIs,
does not require credentials, and does not process real participant records.

## Why This Belongs In The AI Research Assistant Suite

AI review and reproducibility tools can miss a basic scientific failure mode:
the sample used to support a claim may have incomplete custody evidence. This
assistant checks whether every sample has enough documented handoffs, consent
links, storage controls, assay-run alignment, and reviewer signoff before the
project relies on the result.

The assistant emits a deterministic `release`, `revise`, or `hold` decision with
evidence-linked findings and remediation steps.

## Checks

- Missing consent or participant-link evidence.
- Custody events with missing actor or signature fields.
- Time gaps beyond the configured maximum transit window.
- Storage temperature excursions against the sample's storage spec.
- Blinding leaks in reviewer-visible metadata.
- Assay runs that use quarantined samples, mismatched instruments, or missing QC.
- Conclusions that rely on samples with unresolved high-risk custody findings.
- Required reviewer signoff before release.

## Usage

```bash
node sample-chain-of-custody-assistant/src/chain-custody-assistant.mjs \
  sample-chain-of-custody-assistant/fixtures/sample-custody-packet.json \
  --format markdown
```

JSON output:

```bash
node sample-chain-of-custody-assistant/src/chain-custody-assistant.mjs \
  sample-chain-of-custody-assistant/fixtures/sample-custody-packet.json \
  --format json
```

## Validation

```bash
node sample-chain-of-custody-assistant/test/run-tests.mjs
```

Expected result:

```text
sample chain-of-custody assistant tests passed
```

## Demo Artifacts

- `demo/sample-report.md`
- `demo/sample-report.json`
- `demo/decision-flow.svg`
- `demo/decision-flow.png`
- `demo/sample-chain-of-custody-demo.mp4`

## Scope Boundaries

This assistant intentionally avoids:

- live LIMS, EHR, cloud storage, or instrument connections;
- real participant or patient data;
- credential handling;
- legal, medical, or regulatory advice;
- replacing required human review.

It is a pre-release guardrail that highlights evidence gaps for a reviewer.
