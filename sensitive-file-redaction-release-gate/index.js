"use strict";

const CONTROLS = [
  {
    "id": "secret-pattern",
    "label": "secret pattern detected",
    "type": "booleanTrue",
    "key": "secretPattern",
    "remediation": "Remove secrets and rotate affected credentials before release."
  },
  {
    "id": "personal-data",
    "label": "personal data detected",
    "type": "booleanTrue",
    "key": "personalData",
    "remediation": "Apply de-identification or access controls."
  },
  {
    "id": "raw-credential",
    "label": "raw credential detected",
    "type": "booleanTrue",
    "key": "rawCredential",
    "remediation": "Delete credential-bearing artifact and regenerate sanitized file."
  },
  {
    "id": "missing-redaction-log",
    "label": "missing redaction log",
    "type": "booleanFalse",
    "key": "redactionLog",
    "remediation": "Attach redaction evidence before publication."
  },
  {
    "id": "export-blocked",
    "label": "export not allowed",
    "type": "booleanFalse",
    "key": "exportAllowed",
    "remediation": "Hold artifact until export policy allows release."
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
