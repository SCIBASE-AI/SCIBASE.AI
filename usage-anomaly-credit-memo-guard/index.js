"use strict";

const CONTROLS = [
  {
    "id": "usage-spike",
    "label": "usage spike requires review",
    "type": "max",
    "key": "usageSpikePct",
    "value": 100,
    "remediation": "Compare usage logs and contract terms before issuing credit."
  },
  {
    "id": "past-due-invoice",
    "label": "past-due invoice",
    "type": "booleanTrue",
    "key": "invoicePastDue",
    "remediation": "Resolve or approve past-due invoice exception."
  },
  {
    "id": "duplicate-request",
    "label": "duplicate credit request",
    "type": "booleanTrue",
    "key": "duplicateRequest",
    "remediation": "Merge duplicates and keep one finance decision record."
  },
  {
    "id": "missing-support-ticket",
    "label": "missing support ticket",
    "type": "booleanFalse",
    "key": "supportTicket",
    "remediation": "Attach customer support ticket evidence."
  },
  {
    "id": "low-tier-large-credit",
    "label": "low tier credit needs approval",
    "type": "max",
    "key": "customerTier",
    "value": 2,
    "remediation": "Route lower-tier credit memo to finance approval workflow."
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
