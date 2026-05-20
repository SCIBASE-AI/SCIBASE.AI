"use strict";

const samplePacket = {
  "id": "repo-meta-001",
  "title": "Repository Metadata Release Readiness Gate",
  "context": "Project Repository & Version Control",
  "items": [
    {
      "id": "manuscript",
      "name": "Manuscript package",
      "type": "repository-section",
      "signals": {
        "hasLicense": true,
        "hasContributors": true,
        "hasKeywords": true,
        "hasFunding": true,
        "hasVersion": true
      }
    },
    {
      "id": "dataset",
      "name": "Dataset package",
      "type": "repository-section",
      "signals": {
        "hasLicense": true,
        "hasContributors": false,
        "hasKeywords": true,
        "hasFunding": false,
        "hasVersion": true
      }
    },
    {
      "id": "notebook",
      "name": "Notebook package",
      "type": "repository-section",
      "signals": {
        "hasLicense": false,
        "hasContributors": true,
        "hasKeywords": false,
        "hasFunding": false,
        "hasVersion": false
      }
    }
  ]
};

module.exports = { samplePacket };
