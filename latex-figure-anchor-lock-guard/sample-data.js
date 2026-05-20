"use strict";

const samplePacket = {
  "id": "fig-anchor-001",
  "title": "LaTeX Figure Anchor Lock Guard",
  "context": "Real-Time Collaborative Editor",
  "items": [
    {
      "id": "fig-1",
      "name": "Kaplan-Meier plot",
      "type": "figure",
      "signals": {
        "anchorLocked": true,
        "captionLinked": true,
        "assetExists": true,
        "latexEscaped": true,
        "movedAfterLock": false
      }
    },
    {
      "id": "fig-2",
      "name": "Pipeline diagram",
      "type": "figure",
      "signals": {
        "anchorLocked": false,
        "captionLinked": true,
        "assetExists": true,
        "latexEscaped": false,
        "movedAfterLock": true
      }
    },
    {
      "id": "fig-3",
      "name": "Supplement plot",
      "type": "figure",
      "signals": {
        "anchorLocked": true,
        "captionLinked": false,
        "assetExists": false,
        "latexEscaped": true,
        "movedAfterLock": false
      }
    }
  ]
};

module.exports = { samplePacket };
