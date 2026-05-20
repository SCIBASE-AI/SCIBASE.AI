"use strict";

const samplePacket = {
  "id": "limitations-001",
  "title": "Study Limitations Disclosure Assistant",
  "context": "AI-Powered Research Assistant Suite",
  "items": [
    {
      "id": "cohort",
      "name": "Cohort limitation",
      "type": "limitation",
      "signals": {
        "disclosed": true,
        "severity": 3,
        "mitigation": true,
        "evidenceLinked": true,
        "overclaimRisk": false
      }
    },
    {
      "id": "generalizability",
      "name": "Generalizability limitation",
      "type": "limitation",
      "signals": {
        "disclosed": false,
        "severity": 5,
        "mitigation": false,
        "evidenceLinked": false,
        "overclaimRisk": true
      }
    },
    {
      "id": "measurement",
      "name": "Measurement noise limitation",
      "type": "limitation",
      "signals": {
        "disclosed": true,
        "severity": 4,
        "mitigation": false,
        "evidenceLinked": true,
        "overclaimRisk": false
      }
    }
  ]
};

module.exports = { samplePacket };
