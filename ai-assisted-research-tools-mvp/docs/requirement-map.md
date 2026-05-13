# Requirement Map

This maps issue #13 to concrete files in this module.

| Issue requirement | Implementation |
| --- | --- |
| Generate concise paper summaries | `summarizePaper()` returns abstract, executive, and layperson modes with findings, implications, and next steps. |
| Domain-aware output | `data/sample-manuscript.json` includes a biomedical manuscript; `src/research-tools.js` uses domain, methods, results, and audience fields in the report. |
| Peer-review diagnostic report | `reviewManuscript()` checks statistical reporting, ethics statement, data availability, clarity, and similarity-risk placeholders. |
| Compliance checks | Ethics and data availability are explicit diagnostics with actionable recommendations. |
| Citation recommendations | `recommendCitations()` scores a local open-access-style citation corpus by keyword overlap, existing references, and citation reach. |
| Multiple reference styles | `formatCitation()` supports APA-like and Nature-style output. |
| Similar papers widget | `composeResearchAssistantReport()` returns `similarPapersWidget` for a dashboard or manuscript sidebar. |
| Reviewer demo | `src/server.js`, `public/`, `docs/demo/assistant-report-snapshot.json`, and `docs/demo/ai-assisted-research-tools-demo.gif`. |
| Validation | `test/research-tools.test.js` covers summarization, diagnostics, citations, and full report composition. |

The MVP is local and deterministic by design. It can later be swapped to model-backed summarization or retrieval without changing the API shape.
