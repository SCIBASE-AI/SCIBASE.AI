"use strict";

const samplePacket = {
  "id": "export-queue-001",
  "title": "Enterprise Data Export Approval Queue",
  "context": "Enterprise Tooling",
  "items": [
    {
      "id": "export-1",
      "name": "Open project metrics",
      "type": "export",
      "signals": {
        "adminApproved": true,
        "containsRestrictedData": false,
        "destinationAllowed": true,
        "auditTicket": true,
        "rowCount": 1800
      }
    },
    {
      "id": "export-2",
      "name": "Human subjects extract",
      "type": "export",
      "signals": {
        "adminApproved": false,
        "containsRestrictedData": true,
        "destinationAllowed": false,
        "auditTicket": false,
        "rowCount": 78000
      }
    },
    {
      "id": "export-3",
      "name": "Department dashboard CSV",
      "type": "export",
      "signals": {
        "adminApproved": true,
        "containsRestrictedData": true,
        "destinationAllowed": true,
        "auditTicket": true,
        "rowCount": 26000
      }
    }
  ]
};

module.exports = { samplePacket };
