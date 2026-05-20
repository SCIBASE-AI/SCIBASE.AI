# Acceptance Notes

This PR adds a small evidence-quality gate rather than another broad summarizer demo.

The module should be useful when SCIBASE later wires real paper text, extracted figure/table captions, and retrieval candidates into the AI research tools suite:

1. A summarizer can show only claims that are grounded in available evidence artifacts.
2. A peer-review aid can return specific author fixes instead of vague quality warnings.
3. A citation tool can defer recommendations that do not match the manuscript evidence packet.

All sample data is synthetic. No external APIs, credentials, user data, or live corpora are used.
