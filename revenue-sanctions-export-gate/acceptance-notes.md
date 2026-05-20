# Acceptance Notes

## Scope

This PR adds a revenue compliance gate for institutional billing and licensing workflows. It is designed to run before invoice release or revenue recognition.

## Reviewer workflow

1. Run `node revenue-sanctions-export-gate/test.js`.
2. Run `node revenue-sanctions-export-gate/demo.js`.
3. Inspect `sanctions-export-report.json`, `finance-review-packet.md`, `demo.svg`, and `demo.mp4`.

## Safety boundaries

- Uses synthetic customers, invoices, and policy data only.
- Does not store or request credentials.
- Does not call external sanctions APIs or payment providers.
- Uses a synthetic HMAC secret for signed event examples.
- Does not make legal determinations; it produces release, review, or block evidence for enterprise finance and compliance teams.
