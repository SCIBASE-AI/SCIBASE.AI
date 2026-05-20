"use strict";

const CONTROLS = [
  {
    "id": "synonym-collision",
    "label": "synonym collision",
    "type": "booleanTrue",
    "key": "synonymCollision",
    "remediation": "Create curator task to merge or split collided synonyms."
  },
  {
    "id": "ontology-conflict",
    "label": "ontology conflict",
    "type": "booleanTrue",
    "key": "ontologyConflict",
    "remediation": "Choose canonical ontology namespace before publishing entity."
  },
  {
    "id": "low-confidence",
    "label": "low entity confidence",
    "type": "min",
    "key": "confidence",
    "value": 0.8,
    "remediation": "Require curator review for low-confidence entity matches."
  },
  {
    "id": "private-edge",
    "label": "private edge exposure",
    "type": "booleanTrue",
    "key": "privateEdge",
    "remediation": "Hide private graph edges from public dedupe reports."
  },
  {
    "id": "not-reviewed",
    "label": "not curator reviewed",
    "type": "booleanFalse",
    "key": "curatorReviewed",
    "remediation": "Route dedupe decision to graph curator."
  }
];

function evaluateControl(item, control) {
  const value = item.signals[control.key];
  if (control.type === "booleanFalse") return value === false;
  if (control.type === "booleanTrue") return value === true;
  if (control.type === "max") return Number(value) > Number(control.value);
  if (control.type === "min") return Number(value) < Number(control.value);
  throw new Error(`Unsupported control type: ${control.type}`);
}

function evaluateItem(item) {
  const holds = CONTROLS.filter((control) => evaluateControl(item, control));
  return {
    itemId: item.id,
    name: item.name,
    type: item.type,
    status: holds.length === 0 ? "ready" : "held",
    holds: holds.map((control) => control.id),
    holdLabels: holds.map((control) => control.label),
    remediation: holds.map((control) => control.remediation),
  };
}

function createReviewPacket(packet) {
  const evaluations = packet.items.map(evaluateItem);
  const held = evaluations.filter((item) => item.status === "held");
  const ready = evaluations.filter((item) => item.status === "ready");
  const holdCounts = held.reduce((counts, item) => {
    for (const hold of item.holds) counts[hold] = (counts[hold] || 0) + 1;
    return counts;
  }, {});
  return {
    packetId: packet.id,
    title: packet.title,
    context: packet.context,
    status: held.length === 0 ? "review-ready" : "needs-review",
    readyItems: ready.map((item) => item.itemId),
    heldItems: held.map((item) => item.itemId),
    evaluations,
    holdCounts,
    reviewerActions: held.flatMap((item) => item.remediation.map((action, index) => ({
      itemId: item.itemId,
      hold: item.holds[index],
      action,
    }))),
  };
}

module.exports = {
  CONTROLS,
  evaluateControl,
  evaluateItem,
  createReviewPacket,
};
