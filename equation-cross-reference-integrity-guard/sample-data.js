"use strict";

const samplePacket = {
  "id": "eqref-guard-001",
  "title": "Equation Cross-Reference Integrity Guard",
  "context": "Real-Time Collaborative Editor",
  "items": [
    {
      "id": "eq-1",
      "name": "Energy balance equation",
      "type": "equation",
      "signals": {
        "hasLabel": true,
        "referenced": true,
        "duplicateLabel": false,
        "staleNumber": false,
        "unresolvedCitation": false
      }
    },
    {
      "id": "eq-2",
      "name": "Hazard model equation",
      "type": "equation",
      "signals": {
        "hasLabel": true,
        "referenced": false,
        "duplicateLabel": false,
        "staleNumber": false,
        "unresolvedCitation": false
      }
    },
    {
      "id": "eq-3",
      "name": "Sensitivity equation",
      "type": "equation",
      "signals": {
        "hasLabel": false,
        "referenced": true,
        "duplicateLabel": false,
        "staleNumber": true,
        "unresolvedCitation": true
      }
    },
    {
      "id": "eq-4",
      "name": "Duplicate posterior equation",
      "type": "equation",
      "signals": {
        "hasLabel": true,
        "referenced": true,
        "duplicateLabel": true,
        "staleNumber": false,
        "unresolvedCitation": false
      }
    }
  ]
};

module.exports = { samplePacket };
