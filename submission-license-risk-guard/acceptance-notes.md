# Acceptance Notes

This implementation is dependency-free and uses only synthetic local fixtures. It is designed to be embedded into a future SCIBASE submission pipeline as the policy engine that decides whether a solver deliverable package is ready for sponsor review, needs conditional review, or must be blocked.

Validation commands:

```bash
npm test
npm run check
npm run demo
```

The generated demo artifacts are intentionally committed under `reports/` so maintainers can inspect the reviewer packet and short video without reproducing the run.
