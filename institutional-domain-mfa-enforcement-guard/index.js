"use strict";

const CONTROLS = [
  {
    "id": "missing-mfa",
    "label": "MFA not enabled",
    "type": "booleanFalse",
    "key": "mfaEnabled",
    "remediation": "Require MFA enrollment before access activation."
  },
  {
    "id": "missing-oauth-link",
    "label": "OAuth/ORCID not linked",
    "type": "booleanFalse",
    "key": "oauthLinked",
    "remediation": "Link ORCID, Google, GitHub, or institutional identity."
  },
  {
    "id": "unverified-recovery",
    "label": "recovery method unverified",
    "type": "booleanFalse",
    "key": "recoveryVerified",
    "remediation": "Verify recovery method before sensitive project access."
  },
  {
    "id": "external-guest",
    "label": "external guest requires owner review",
    "type": "booleanTrue",
    "key": "externalGuest",
    "remediation": "Route external guests to owner approval."
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
