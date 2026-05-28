# Artifact Embargo Access Expiry Guard

This standalone SCIBASE issue #14 slice reviews hosted artifact release packets
before public preview, API access, or export.

It checks:

- Embargo end dates are satisfied before public release.
- Reviewer links are not expired or revoked.
- Public release has accession evidence.
- Takedown requests and legal holds route to review.
- Access logs redact emails and token-like values.

## Run

```bash
node artifact-embargo-access-expiry-guard/test.js
node artifact-embargo-access-expiry-guard/demo.js
python artifact-embargo-access-expiry-guard/make-demo-video.py
```

Generated artifacts are written under `reports/` for review.
