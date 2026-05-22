# Acceptance Notes

- Uses synthetic fixture data only.
- Makes no external API calls.
- Stores no credentials, tokens, private manuscripts, live DOI records, PubMed/arXiv/Crossref data, or payment data.
- Emits deterministic audit digests for reviewer packets.
- Keeps policy thresholds in `sample-data.js` so scientific review teams can tune evidence ranks and wording rules.
- Provides focused tests for pass, revise, and hold outcomes.
