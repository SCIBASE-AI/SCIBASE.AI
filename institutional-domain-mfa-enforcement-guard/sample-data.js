"use strict";

const samplePacket = {
  "id": "domain-mfa-001",
  "title": "Institutional Domain MFA Enforcement Guard",
  "context": "User & Project Management",
  "items": [
    {
      "id": "user-a",
      "name": "University owner",
      "type": "identity",
      "signals": {
        "institutionalDomain": true,
        "mfaEnabled": true,
        "oauthLinked": true,
        "recoveryVerified": true,
        "externalGuest": false
      }
    },
    {
      "id": "user-b",
      "name": "Hospital collaborator",
      "type": "identity",
      "signals": {
        "institutionalDomain": true,
        "mfaEnabled": false,
        "oauthLinked": true,
        "recoveryVerified": false,
        "externalGuest": false
      }
    },
    {
      "id": "user-c",
      "name": "External reviewer",
      "type": "identity",
      "signals": {
        "institutionalDomain": false,
        "mfaEnabled": false,
        "oauthLinked": false,
        "recoveryVerified": true,
        "externalGuest": true
      }
    }
  ]
};

module.exports = { samplePacket };
