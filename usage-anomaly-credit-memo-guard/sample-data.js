"use strict";

const samplePacket = {
  "id": "credit-memo-001",
  "title": "Usage Anomaly Credit Memo Guard",
  "context": "Revenue Infrastructure",
  "items": [
    {
      "id": "memo-1",
      "name": "Compute retry credit",
      "type": "credit-memo",
      "signals": {
        "usageSpikePct": 18,
        "invoicePastDue": false,
        "duplicateRequest": false,
        "supportTicket": true,
        "customerTier": 3
      }
    },
    {
      "id": "memo-2",
      "name": "Storage overage reversal",
      "type": "credit-memo",
      "signals": {
        "usageSpikePct": 240,
        "invoicePastDue": true,
        "duplicateRequest": true,
        "supportTicket": false,
        "customerTier": 2
      }
    },
    {
      "id": "memo-3",
      "name": "AI review burst credit",
      "type": "credit-memo",
      "signals": {
        "usageSpikePct": 95,
        "invoicePastDue": false,
        "duplicateRequest": false,
        "supportTicket": true,
        "customerTier": 1
      }
    }
  ]
};

module.exports = { samplePacket };
