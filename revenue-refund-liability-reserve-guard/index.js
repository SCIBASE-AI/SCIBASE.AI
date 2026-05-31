const crypto = require("crypto");

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function requiredEvidenceFor(packet) {
  const evidence = ["contract-term", "entitlement-rollback"];
  if (packet.revenueStream === "institutional_invoice") {
    evidence.push("finance-approval");
    if (packet.requiresPOEvidence) {
      evidence.push("po-or-invoice-evidence");
    }
  }
  if (packet.revenueStream === "ai_compute") {
    evidence.push("credit-ledger", "usage-meter-snapshot");
    if (packet.restrictedGrantFunded) {
      evidence.push("grant-refund-approval");
    }
  }
  if (packet.taxCollected > 0) {
    evidence.push("tax-refund-treatment");
  }
  return evidence;
}

function missingEvidence(packet) {
  const present = new Set(packet.evidence || []);
  return requiredEvidenceFor(packet).filter((item) => !present.has(item));
}

function refundableAmount(packet) {
  const serviceRefund = Math.min(packet.requestedRefund, packet.unusedServiceValue);
  const taxComponent = packet.taxRefundable ? packet.taxCollected : 0;
  return money(Math.max(0, serviceRefund + taxComponent - packet.processorFee));
}

function reserveImpact(packet) {
  return money(refundableAmount(packet));
}

function evaluateRefund(packet) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const missing = missingEvidence(packet);
  const refundable = refundableAmount(packet);
  const overRequest = money(Math.max(0, packet.requestedRefund - packet.unusedServiceValue));
  const reserveAfter = money(packet.reserveAvailable - reserveImpact(packet));

  if (missing.length > 0) {
    blockers.push(`missing evidence: ${missing.join(", ")}`);
    actions.push("hold refund until evidence packet is complete");
  }

  if (packet.approvalStatus !== "approved") {
    blockers.push(`approval status is ${packet.approvalStatus}`);
    actions.push("route to finance approver before cash release");
  }

  if (!packet.entitlementsRolledBack) {
    blockers.push("entitlements are not rolled back");
    actions.push("rollback entitlements before refund release");
  }

  if (overRequest > 0) {
    warnings.push(`requested refund exceeds unused service value by ${overRequest} ${packet.currency}`);
    actions.push("cap refundable service amount at unused value");
  }

  if (packet.processorFee > 0) {
    warnings.push(`processor fee ${packet.processorFee} ${packet.currency} is non-refundable`);
  }

  if (packet.taxCollected > 0 && !packet.taxRefundable) {
    warnings.push(`tax collected ${packet.taxCollected} ${packet.currency} requires non-refund treatment`);
  }

  if (packet.restrictedGrantFunded && !(packet.evidence || []).includes("grant-refund-approval")) {
    blockers.push("restricted grant-funded compute lacks refund approval");
    actions.push("hold refund for grant compliance review");
  }

  if (reserveAfter < 0) {
    blockers.push(`refund reserve short by ${money(Math.abs(reserveAfter))} ${packet.currency}`);
    actions.push("top up refund reserve before release");
  } else if (reserveAfter < refundable * 0.25) {
    warnings.push(`reserve after refund is low at ${reserveAfter} ${packet.currency}`);
    actions.push("notify finance about low reserve coverage");
  }

  if (blockers.length === 0) {
    actions.push("approve refund for payment queue");
    actions.push("record reserve draw and revenue reversal");
  }

  const decision =
    blockers.length > 0 ? "hold" : warnings.length > 0 ? "approve_with_adjustments" : "approve";

  const result = {
    refundId: packet.id,
    customer: packet.customer,
    revenueStream: packet.revenueStream,
    currency: packet.currency,
    requestedRefund: money(packet.requestedRefund),
    refundableAmount: refundable,
    reserveAvailable: money(packet.reserveAvailable),
    reserveAfter,
    decision,
    blockers,
    warnings,
    actions: [...new Set(actions)],
  };

  return {
    ...result,
    auditDigest: digest(result),
  };
}

function evaluateRefundBatch(packets) {
  const decisions = packets.map(evaluateRefund);
  const summary = decisions.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.decision] += 1;
      acc.requestedRefund = money(acc.requestedRefund + item.requestedRefund);
      acc.refundableAmount = money(acc.refundableAmount + item.refundableAmount);
      acc.reserveDraw = money(acc.reserveDraw + Math.max(0, item.refundableAmount));
      if (item.decision === "hold") {
        acc.heldRefunds = money(acc.heldRefunds + item.requestedRefund);
      }
      return acc;
    },
    {
      total: 0,
      approve: 0,
      approve_with_adjustments: 0,
      hold: 0,
      requestedRefund: 0,
      refundableAmount: 0,
      reserveDraw: 0,
      heldRefunds: 0,
    }
  );

  const report = {
    generatedAt: new Date("2026-05-31T00:00:00Z").toISOString(),
    summary,
    decisions,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function renderMarkdownReport(report) {
  const lines = [
    "# Revenue Refund Liability Reserve Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Refund packets: ${report.summary.total}`,
    `- Approve: ${report.summary.approve}`,
    `- Approve with adjustments: ${report.summary.approve_with_adjustments}`,
    `- Hold: ${report.summary.hold}`,
    `- Requested refund: ${report.summary.requestedRefund}`,
    `- Refundable amount: ${report.summary.refundableAmount}`,
    `- Reserve draw: ${report.summary.reserveDraw}`,
    `- Held refunds: ${report.summary.heldRefunds}`,
    "",
    "## Decisions",
    "",
  ];

  for (const item of report.decisions) {
    lines.push(`### ${item.refundId}`);
    lines.push("");
    lines.push(`- Customer: ${item.customer}`);
    lines.push(`- Stream: ${item.revenueStream}`);
    lines.push(`- Decision: ${item.decision}`);
    lines.push(`- Requested refund: ${item.requestedRefund} ${item.currency}`);
    lines.push(`- Refundable amount: ${item.refundableAmount} ${item.currency}`);
    lines.push(`- Reserve after: ${item.reserveAfter} ${item.currency}`);
    lines.push(`- Blockers: ${item.blockers.join("; ") || "none"}`);
    lines.push(`- Warnings: ${item.warnings.join("; ") || "none"}`);
    lines.push(`- Actions: ${item.actions.join("; ")}`);
    lines.push(`- Digest: ${item.auditDigest}`);
    lines.push("");
  }

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgReport(report) {
  const cards = [
    ["Packets", report.summary.total, "#355c7d"],
    ["Approved", report.summary.approve, "#2a9d8f"],
    ["Adjusted", report.summary.approve_with_adjustments, "#e9c46a"],
    ["Held", report.summary.hold, "#e76f51"],
    ["Refundable", `$${report.summary.refundableAmount}`, "#457b9d"],
    ["Held value", `$${report.summary.heldRefunds}`, "#b56576"],
  ];

  const cardSvg = cards
    .map(([label, value, color], index) => {
      const x = 72 + (index % 3) * 380;
      const y = 188 + Math.floor(index / 3) * 150;
      return [
        `<rect x="${x}" y="${y}" width="320" height="108" rx="8" fill="#ffffff" stroke="#d7dde5"/>`,
        `<rect x="${x}" y="${y}" width="10" height="108" rx="4" fill="${color}"/>`,
        `<text x="${x + 30}" y="${y + 42}" font-size="24" font-family="Arial" fill="#2f3b4a">${escapeXml(label)}</text>`,
        `<text x="${x + 30}" y="${y + 82}" font-size="34" font-family="Arial" font-weight="700" fill="${color}">${escapeXml(value)}</text>`,
      ].join("\n");
    })
    .join("\n");

  const queueRows = report.decisions
    .filter((item) => item.decision !== "approve")
    .slice(0, 3)
    .map((item, index) => {
      const y = 545 + index * 32;
      return `<text x="82" y="${y}" font-size="21" font-family="Arial" fill="#344054">${escapeXml(item.refundId)} - ${escapeXml(item.decision)} - ${escapeXml(item.actions[0])}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f6f8fb"/>
  <rect x="44" y="44" width="1192" height="632" rx="12" fill="#ffffff" stroke="#d7dde5"/>
  <text x="72" y="105" font-size="38" font-family="Arial" font-weight="700" fill="#1d2939">Revenue Refund Liability Reserve Guard</text>
  <text x="72" y="145" font-size="22" font-family="Arial" fill="#667085">Refund exposure and reserve sufficiency review</text>
  ${cardSvg}
  <text x="72" y="500" font-size="27" font-family="Arial" font-weight="700" fill="#1d2939">Finance queue</text>
  ${queueRows}
  <text x="72" y="655" font-size="18" font-family="Arial" fill="#667085">Audit digest ${escapeXml(report.auditDigest.slice(0, 32))}</text>
</svg>`;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

module.exports = {
  evaluateRefund,
  evaluateRefundBatch,
  refundableAmount,
  reserveImpact,
  requiredEvidenceFor,
  renderMarkdownReport,
  renderSvgReport,
  digest,
};
