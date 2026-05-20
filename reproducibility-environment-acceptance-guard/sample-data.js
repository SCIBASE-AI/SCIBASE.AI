"use strict";

const samplePacket = {
  "id": "repro-env-accept-001",
  "title": "Reproducibility Environment Acceptance Guard",
  "context": "Scientific Bounty System",
  "items": [
    {
      "id": "env-a",
      "name": "Docker solver bundle",
      "type": "environment",
      "signals": {
        "lockfilePresent": true,
        "deterministicSeed": true,
        "hardwareNotes": true,
        "rerunPasses": true,
        "dependencyRisk": 1
      }
    },
    {
      "id": "env-b",
      "name": "Notebook-only bundle",
      "type": "environment",
      "signals": {
        "lockfilePresent": false,
        "deterministicSeed": false,
        "hardwareNotes": false,
        "rerunPasses": false,
        "dependencyRisk": 5
      }
    },
    {
      "id": "env-c",
      "name": "Conda solver bundle",
      "type": "environment",
      "signals": {
        "lockfilePresent": true,
        "deterministicSeed": true,
        "hardwareNotes": false,
        "rerunPasses": true,
        "dependencyRisk": 3
      }
    }
  ]
};

module.exports = { samplePacket };
