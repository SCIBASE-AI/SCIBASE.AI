# Collaborative Private Comment Export Guard

This standalone SCIBASE issue #12 slice reviews collaborative editor export
packets before public PDF, HTML, or LaTeX release.

It checks:

- Private and reviewer-only comments do not leak into public exports.
- Public export profiles require unresolved comment threads to be closed.
- Reviewer mentions belong to the invited reviewer roster.
- Sensitive inline annotations have redaction evidence before release.
- Reviewer packets redact emails and phone numbers in thread text.

## Run

```bash
node collaborative-private-comment-export-guard/test.js
node collaborative-private-comment-export-guard/demo.js
python collaborative-private-comment-export-guard/make-demo-video.py
```

Generated artifacts are written under `reports/` for review.
