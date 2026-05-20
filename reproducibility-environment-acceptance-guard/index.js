"use strict";

const CONTROLS = [
  {
    "id": "missing-lockfile",
    "label": "missing lockfile",
    "type": "booleanFalse",
    "key": "lockfilePresent",
    "remediation": "Require lockfile or container digest before acceptance."
  },
  {
    "id": "missing-seed",
    "label": "missing deterministic seed",
    "type": "booleanFalse",
    "key": "deterministicSeed",
    "remediation": "Add deterministic seed and rerun notes."
  },
  {
    "id": "missing-hardware-notes",
    "label": "missing hardware notes",
    "type": "booleanFalse",
    "key": "hardwareNotes",
    "remediation": "Document CPU/GPU/runtime assumptions."
  },
  {
    "id": "rerun-failed",
    "label": "rerun did not pass",
    "type": "booleanFalse",
    "key": "rerunPasses",
    "remediation": "Block acceptance until independent rerun passes."
  },
  {
    "id": "dependency-risk",
    "label": "dependency risk too high",
    "type": "max",
    "key": "dependencyRisk",
    "value": 3,
    "remediation": "Pin or replace high-risk dependencies."
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
