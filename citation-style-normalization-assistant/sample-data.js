"use strict";

const samplePacket = {
  "id": "citation-style-001",
  "title": "Citation Style Normalization Assistant",
  "context": "AI-Assisted Research Tools MVP",
  "items": [
    {
      "id": "ref-1",
      "name": "Journal article",
      "type": "reference",
      "signals": {
        "doiPresent": true,
        "styleMatches": true,
        "yearPresent": true,
        "authorOrderValid": true,
        "duplicate": false
      }
    },
    {
      "id": "ref-2",
      "name": "Preprint",
      "type": "reference",
      "signals": {
        "doiPresent": false,
        "styleMatches": false,
        "yearPresent": true,
        "authorOrderValid": true,
        "duplicate": false
      }
    },
    {
      "id": "ref-3",
      "name": "Dataset citation",
      "type": "reference",
      "signals": {
        "doiPresent": true,
        "styleMatches": false,
        "yearPresent": false,
        "authorOrderValid": false,
        "duplicate": true
      }
    }
  ]
};

module.exports = { samplePacket };
