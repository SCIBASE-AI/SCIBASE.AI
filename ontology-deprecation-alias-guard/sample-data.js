"use strict";

const samplePacket = {
  "id": "onto-deprec-001",
  "title": "Ontology Deprecation Alias Guard",
  "context": "Scientific Knowledge Graph Integration",
  "items": [
    {
      "id": "mesh:D012345",
      "name": "Current disease term",
      "type": "ontology-term",
      "signals": {
        "deprecated": false,
        "hasReplacement": true,
        "aliasCoverage": 0.9,
        "privateEvidence": false
      }
    },
    {
      "id": "pubchem:998",
      "name": "Compound synonym set",
      "type": "ontology-term",
      "signals": {
        "deprecated": false,
        "hasReplacement": true,
        "aliasCoverage": 0.45,
        "privateEvidence": false
      }
    },
    {
      "id": "uniprot:P12345",
      "name": "Protein entity",
      "type": "ontology-term",
      "signals": {
        "deprecated": true,
        "hasReplacement": false,
        "aliasCoverage": 0.3,
        "privateEvidence": true
      }
    }
  ]
};

module.exports = { samplePacket };
