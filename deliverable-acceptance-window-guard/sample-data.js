"use strict";

const samplePacket = {
  "id": "deliverable-window-001",
  "title": "Deliverable Acceptance Window Guard",
  "context": "Scientific Bounty System",
  "items": [
    {
      "id": "solver-a",
      "name": "Solver A model bundle",
      "type": "deliverable",
      "signals": {
        "submittedBeforeDeadline": true,
        "evidenceComplete": true,
        "reviewerAssigned": true,
        "acceptanceDays": 5,
        "scopeChange": false
      }
    },
    {
      "id": "solver-b",
      "name": "Solver B dataset",
      "type": "deliverable",
      "signals": {
        "submittedBeforeDeadline": false,
        "evidenceComplete": true,
        "reviewerAssigned": false,
        "acceptanceDays": 18,
        "scopeChange": false
      }
    },
    {
      "id": "solver-c",
      "name": "Solver C report",
      "type": "deliverable",
      "signals": {
        "submittedBeforeDeadline": true,
        "evidenceComplete": false,
        "reviewerAssigned": true,
        "acceptanceDays": 12,
        "scopeChange": true
      }
    }
  ]
};

module.exports = { samplePacket };
