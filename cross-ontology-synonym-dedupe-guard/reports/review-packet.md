# Cross-Ontology Synonym Dedupe Guard

Context: Scientific Knowledge Graph Integration
Status: needs-review

## Held Items
- entity-2: synonym collision, ontology conflict, low entity confidence, not curator reviewed
- entity-3: synonym collision, private edge exposure, not curator reviewed

## Reviewer Actions
- entity-2: Create curator task to merge or split collided synonyms.
- entity-2: Choose canonical ontology namespace before publishing entity.
- entity-2: Require curator review for low-confidence entity matches.
- entity-2: Route dedupe decision to graph curator.
- entity-3: Create curator task to merge or split collided synonyms.
- entity-3: Hide private graph edges from public dedupe reports.
- entity-3: Route dedupe decision to graph curator.

