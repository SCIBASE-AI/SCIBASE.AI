# Acceptance Notes

## Scope

Adds a focused grant-fit and funder-alignment assistant for issue #16.

## Non-overlap

The module avoids the already submitted assistant slices by focusing on pre-award funding readiness:

- funder priority coverage
- open artifact readiness for award review
- budget cap and justification checks
- ethics and data protection readiness
- evidence-backed impact claims
- reviewer-facing funding action packet

## Validation

Run:

```bash
node grant-fit-funder-alignment-assistant/test.js
node grant-fit-funder-alignment-assistant/demo.js
```

Expected result:

- Tests print `grant-fit funder alignment tests passed`.
- Demo writes JSON, Markdown, and SVG reports under `grant-fit-funder-alignment-assistant/reports/`.
- `reports/demo.webm` provides a short visual walkthrough of the generated reviewer packet.
