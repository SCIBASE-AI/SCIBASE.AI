# Maintainer Verification Packet

This packet gives reviewers a compact checklist for issue #12 acceptance.

## Acceptance Evidence

- Unsafe packet lane: hold_notebook_outputs
- Warning packet lane: stage_for_reproducibility_review
- Clean packet lane: accept_notebook_outputs
- Unsafe blocker count: 10
- Warning count: 1
- Clean accepted cells: 2

## Guard Coverage

| Requirement | Evidence |
| --- | --- |
| Execution-order continuity | covered by unsafe packet |
| Dependency/version integrity | covered by unsafe packet |
| Random-seed capture | covered by unsafe packet |
| Input artifact fingerprints | covered by unsafe packet |
| Stale output detection | covered by unsafe packet |
| Section-version drift | covered by unsafe packet |
| Rich HTML sanitization | sanitized and marked untrusted |
| Private path redaction | redacted in output packet |

## Deterministic Digests

- Unsafe packet digest: 93a4bc47b453aef1692c052c2ec1493e8b7d0457e2f983f30a16abb6c74fec50
- Warning packet digest: d9019926c34ff26cfb97dc1caad437a788edd94336aad7efc3e48042846a9fe8
- Clean packet digest: 2c600c8f6698badf782674dc103ce798936b00df1db2fab78b357c18fdcd88d6

## Local Command

```bash
npm run check
```
