"use strict";

const samplePacket = {
  "id": "synonym-dedupe-001",
  "title": "Cross-Ontology Synonym Dedupe Guard",
  "context": "Scientific Knowledge Graph Integration",
  "items": [
    {
      "id": "entity-1",
      "name": "ACE2",
      "type": "entity",
      "signals": {
        "synonymCollision": false,
        "ontologyConflict": false,
        "confidence": 0.94,
        "privateEdge": false,
        "curatorReviewed": true
      }
    },
    {
      "id": "entity-2",
      "name": "APOE-e4",
      "type": "entity",
      "signals": {
        "synonymCollision": true,
        "ontologyConflict": true,
        "confidence": 0.58,
        "privateEdge": false,
        "curatorReviewed": false
      }
    },
    {
      "id": "entity-3",
      "name": "CRISPR-Cas9",
      "type": "entity",
      "signals": {
        "synonymCollision": true,
        "ontologyConflict": false,
        "confidence": 0.82,
        "privateEdge": true,
        "curatorReviewed": false
      }
    }
  ]
};

module.exports = { samplePacket };
