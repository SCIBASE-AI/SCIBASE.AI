"use strict";

const samplePacket = {
  "id": "redaction-gate-001",
  "title": "Sensitive File Redaction Release Gate",
  "context": "Scientific Data & Code Hosting",
  "items": [
    {
      "id": "artifact-a",
      "name": "Public analysis notebook",
      "type": "notebook",
      "signals": {
        "secretPattern": false,
        "personalData": false,
        "rawCredential": false,
        "redactionLog": true,
        "exportAllowed": true
      }
    },
    {
      "id": "artifact-b",
      "name": "Clinical CSV",
      "type": "dataset",
      "signals": {
        "secretPattern": false,
        "personalData": true,
        "rawCredential": false,
        "redactionLog": false,
        "exportAllowed": true
      }
    },
    {
      "id": "artifact-c",
      "name": "Pipeline env file",
      "type": "code",
      "signals": {
        "secretPattern": true,
        "personalData": false,
        "rawCredential": true,
        "redactionLog": false,
        "exportAllowed": false
      }
    }
  ]
};

module.exports = { samplePacket };
