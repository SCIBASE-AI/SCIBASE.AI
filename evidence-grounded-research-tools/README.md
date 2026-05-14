# Evidence-Grounded Research Tools MVP

This module adds a deterministic AI-assisted research workflow foundation for SCIBASE. It focuses on paper intake, evidence-linked summaries, peer-review diagnostics, and citation recommendations that can later be backed by model providers or retrieval services without changing the output contract.

## What It Provides

- Paper intake parsing for title, abstract, sections, declared data/code availability, ethics statements, and statistical terms.
- Three summary modes: abstract, executive, and layperson.
- Evidence-linked key finding extraction with source section, local evidence span, and confidence score.
- Peer-review aid checks for missing availability statements, ethics coverage, statistical reporting, vague claims, and citation gaps.
- Citation recommendation hints with style-ready metadata and reason strings.
- Batch workflow orchestration that returns a single review packet for collaborators, editors, or institutional dashboards.

## Quick Start

```bash
cd evidence-grounded-research-tools
npm test
npm run demo
```

## API Example

```js
import { createResearchPacket } from "./src/research-workflow.js";
import { samplePaper } from "./src/sample-paper.js";

const packet = createResearchPacket(samplePaper, {
  summaryMode: "executive",
  citationStyle: "nature",
});

console.log(packet.summary.text);
console.log(packet.peerReview.risks);
```

## Design Notes

The current implementation is intentionally deterministic. It gives SCIBASE a testable contract for the AI tools requested in issue #13 while avoiding hidden model calls, paid APIs, or non-reproducible outputs during review.

Future integrations can replace the deterministic extractors with LLM/RAG services as long as they preserve the packet shape documented in [docs/requirement-map.md](./docs/requirement-map.md).
