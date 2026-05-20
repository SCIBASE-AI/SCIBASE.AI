"use strict";

const samplePacket = {
  "id": "anon-review-001",
  "title": "Anonymous Review Identity Leak Guard",
  "context": "Community & User Reputation System",
  "items": [
    {
      "id": "review-a",
      "name": "Blind review A",
      "type": "review",
      "signals": {
        "anonymousMode": true,
        "selfCitationClue": false,
        "metadataLeak": false,
        "affiliationHint": false,
        "privateComment": false
      }
    },
    {
      "id": "review-b",
      "name": "Blind review B",
      "type": "review",
      "signals": {
        "anonymousMode": true,
        "selfCitationClue": true,
        "metadataLeak": true,
        "affiliationHint": false,
        "privateComment": false
      }
    },
    {
      "id": "review-c",
      "name": "Blind review C",
      "type": "review",
      "signals": {
        "anonymousMode": true,
        "selfCitationClue": false,
        "metadataLeak": false,
        "affiliationHint": true,
        "privateComment": true
      }
    }
  ]
};

module.exports = { samplePacket };
