# Requirement Map

| Issue requirement | Implementation |
| --- | --- |
| AI-assisted research tools MVP | `buildResearchToolsDashboard` combines registry, summarizer, review, citations, guardrails, and workflow outputs. |
| Paper summarization | `summarizePaper` extracts TLDR, section summaries, key findings, limitations, and evidence snippets. |
| Peer-review aid | `buildPeerReviewAid` produces structured checks, scores, red flags, and action items. |
| Citation helper | `formatCitation` and `buildCitationToolkit` emit APA, MLA, BibTeX, DOI, and schema.org citation payloads. |
| Tool registry/API contracts | `buildToolRegistry` and `/api/registry` expose MVP tool metadata, inputs, outputs, and review status. |
| Safety guardrails | `evaluateGuardrails` flags unsupported claims, sensitive data, citation gaps, and human-review gates. |
| Workflow orchestration | `planAssistedWorkflow` creates reproducible ordered tool runs with artifacts and reviewer checkpoints. |
| Local demo and tests | `src/server.js` exposes API endpoints; `test/tools.test.js` covers each workflow. |
