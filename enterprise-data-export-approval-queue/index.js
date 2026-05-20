"use strict";

const CONTROLS = [
  {
    "id": "missing-admin-approval",
    "label": "missing admin approval",
    "type": "booleanFalse",
    "key": "adminApproved",
    "remediation": "Require institutional admin approval before export."
  },
  {
    "id": "restricted-data",
    "label": "restricted data requires review",
    "type": "booleanTrue",
    "key": "containsRestrictedData",
    "remediation": "Attach DUA, IRB, or privacy review before export."
  },
  {
    "id": "destination-blocked",
    "label": "destination is not allowed",
    "type": "booleanFalse",
    "key": "destinationAllowed",
    "remediation": "Use an approved destination or request compliance exception."
  },
  {
    "id": "missing-ticket",
    "label": "missing audit ticket",
    "type": "booleanFalse",
    "key": "auditTicket",
    "remediation": "Create export audit ticket before queue release."
  },
  {
    "id": "large-export",
    "label": "large export needs sampling review",
    "type": "max",
    "key": "rowCount",
    "value": 50000,
    "remediation": "Run sampling or minimization review for large exports."
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
