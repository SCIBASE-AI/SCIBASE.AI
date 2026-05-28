# Qualitative Codebook Saturation Assistant

This standalone SCIBASE issue #16 slice reviews synthetic qualitative research
packets before an AI assistant marks a manuscript as ready.

It checks:

- Required thematic domains are represented in the codebook.
- Coder agreement meets the configured threshold.
- Saturation evidence reaches the minimum number of rounds.
- Reflexivity memo, member checking, and audit-trail evidence are present.
- Transcript IDs are consented before AI summaries are released.
- Reviewer packets redact emails and phone numbers from raw quotes.

## Run

```bash
node qualitative-codebook-saturation-assistant/test.js
node qualitative-codebook-saturation-assistant/demo.js
python qualitative-codebook-saturation-assistant/make-demo-video.py
```

Generated artifacts are written under `reports/` for review.
