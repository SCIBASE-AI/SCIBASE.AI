# Citation Retraction Evidence Guard

Self-contained guard for SCIBASE issue #16, focused on AI-powered research assistant output safety.

The module evaluates synthetic manuscript-assistant packets before auto peer review or research-gap suggestions are released. It prevents AI-generated review text from relying on retracted, contradicted, stale, unsupported, or superseded citations.

## Scope

- citation retraction and expression-of-concern status
- claim-to-citation support direction
- stale evidence windows
- preprint-to-published-version drift
- citation-context evidence presence
- assistant recommendation leakage from unsafe citations
- deterministic reviewer release decisions

## Decisions

- `RELEASE_ASSISTANT_OUTPUT`
- `HOLD_FOR_EDITOR`
- `BLOCK_ASSISTANT_OUTPUT`

## Local Validation

```bash
npm test
npm run demo
node --check src/index.js
node --check scripts/demo.js
node --check test/citationRetractionEvidenceGuard.test.js
git diff --check
```

## Boundaries

- synthetic citation packets only
- no live publisher, Crossref, PubMed, OpenAlex, or Retraction Watch calls
- no private manuscripts
- no credentials
- no external AI APIs
- no production medical or legal review claims
