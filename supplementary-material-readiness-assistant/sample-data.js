"use strict";

const samplePacket = {
  "id": "suppl-ready-001",
  "title": "Supplementary Material Readiness Assistant",
  "context": "AI-Assisted Research Tools MVP",
  "items": [
    {
      "id": "raw-data",
      "name": "Raw data archive",
      "type": "supplement",
      "signals": {
        "ready": true,
        "publicLink": true,
        "hasReadme": true,
        "fileSizeMb": 120,
        "accessibilityNotes": true
      }
    },
    {
      "id": "analysis-code",
      "name": "Analysis code bundle",
      "type": "code",
      "signals": {
        "ready": true,
        "publicLink": true,
        "hasReadme": true,
        "fileSizeMb": 32,
        "accessibilityNotes": true
      }
    },
    {
      "id": "data-dictionary",
      "name": "Data dictionary",
      "type": "metadata",
      "signals": {
        "ready": false,
        "publicLink": true,
        "hasReadme": false,
        "fileSizeMb": 4,
        "accessibilityNotes": false
      }
    },
    {
      "id": "video-demo",
      "name": "Protocol video",
      "type": "media",
      "signals": {
        "ready": true,
        "publicLink": false,
        "hasReadme": false,
        "fileSizeMb": 640,
        "accessibilityNotes": false
      }
    }
  ]
};

module.exports = { samplePacket };
