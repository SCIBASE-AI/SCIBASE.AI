"use strict";

const CONTROLS = [
  {
    "id": "anchor-unlocked",
    "label": "figure anchor is unlocked",
    "type": "booleanFalse",
    "key": "anchorLocked",
    "remediation": "Lock figure anchor before export or concurrent review."
  },
  {
    "id": "caption-unlinked",
    "label": "caption is unlinked",
    "type": "booleanFalse",
    "key": "captionLinked",
    "remediation": "Link caption to figure anchor."
  },
  {
    "id": "missing-asset",
    "label": "figure asset missing",
    "type": "booleanFalse",
    "key": "assetExists",
    "remediation": "Restore figure asset or remove stale reference."
  },
  {
    "id": "latex-not-escaped",
    "label": "LaTeX characters not escaped",
    "type": "booleanFalse",
    "key": "latexEscaped",
    "remediation": "Escape LaTeX-sensitive caption or filename characters."
  },
  {
    "id": "moved-after-lock",
    "label": "figure moved after lock",
    "type": "booleanTrue",
    "key": "movedAfterLock",
    "remediation": "Revalidate figure order after collaborative move."
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
