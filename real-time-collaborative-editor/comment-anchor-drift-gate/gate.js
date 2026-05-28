"use strict";

function reviewAnchorPackets(packets) {
  return packets.map(reviewAnchorPacket);
}

function reviewAnchorPacket(packet) {
  validatePacket(packet);

  const findings = packet.comments.flatMap((comment) => reviewComment(packet, comment));

  return {
    documentId: packet.documentId,
    revisionId: packet.revisionId,
    decision: findings.some((item) => item.severity === "block") ? "block" : "ready",
    findings,
    receipt: buildReceipt(packet, findings),
  };
}

function validatePacket(packet) {
  if (!packet.documentId || !packet.revisionId) {
    throw new Error("Anchor packet must include documentId and revisionId.");
  }
  if (!Array.isArray(packet.comments)) {
    throw new Error(`${packet.documentId} must include comments.`);
  }
}

function reviewComment(packet, comment) {
  const findings = [];
  const currentSection = packet.sections.find((section) => section.id === comment.currentSectionId);
  const expectedSection = packet.sections.find((section) => section.id === comment.expectedSectionId);
  const currentText = currentSection?.text ?? "";
  const quotePresent = currentText.includes(comment.quotedText);

  if (!quotePresent && !comment.reanchor?.quotedText) {
    findings.push(
      finding(
        "missing_anchor_quote",
        "block",
        comment.id,
        `${comment.id} quoted text no longer exists and no replacement anchor was provided.`,
        "Re-anchor the comment to exact current text or mark it resolved.",
      ),
    );
  }

  if (comment.currentSectionId !== comment.expectedSectionId) {
    findings.push(
      finding(
        "section_drift",
        "block",
        comment.id,
        `${comment.id} moved from ${expectedSection?.label ?? comment.expectedSectionId} to ${currentSection?.label ?? comment.currentSectionId}.`,
        "Confirm the comment still applies or re-anchor it in the expected section.",
      ),
    );
  }

  if (comment.anchorType === "notebook-output" && comment.executionRecordChanged && !comment.reviewerConfirmed) {
    findings.push(
      finding(
        "stale_notebook_output_anchor",
        "block",
        comment.id,
        `${comment.id} targets notebook output whose execution record changed.`,
        "Re-run output review and confirm the comment still applies to the new output.",
      ),
    );
  }

  if (Math.abs(comment.offsetDelta ?? 0) > packet.policy.maxTrustedOffsetDelta && !comment.reviewerConfirmed) {
    findings.push(
      finding(
        "large_anchor_movement",
        "hold",
        comment.id,
        `${comment.id} moved ${comment.offsetDelta} characters, above the trusted movement threshold.`,
        "Ask the reviewer to confirm or manually re-anchor the comment.",
      ),
    );
  }

  if (comment.reanchor?.quotedText && !currentText.includes(comment.reanchor.quotedText)) {
    findings.push(
      finding(
        "invalid_reanchor_quote",
        "block",
        comment.id,
        `${comment.id} supplied a replacement anchor that does not exist in the current section.`,
        "Use an exact quote from the current document revision.",
      ),
    );
  }

  return findings;
}

function finding(code, severity, target, message, action) {
  return { code, severity, target, message, action };
}

function buildReceipt(packet, findings) {
  return {
    commentsReviewed: packet.comments.length,
    blockedFindings: findings.filter((item) => item.severity === "block").length,
    heldFindings: findings.filter((item) => item.severity === "hold").length,
    nextActions: Array.from(new Set(findings.map((item) => item.action))),
  };
}

function summarizeReports(reports) {
  return reports.reduce(
    (summary, report) => {
      summary.total += 1;
      summary.ready += report.decision === "ready" ? 1 : 0;
      summary.blocked += report.decision === "block" ? 1 : 0;
      summary.findings += report.findings.length;
      return summary;
    },
    { total: 0, ready: 0, blocked: 0, findings: 0 },
  );
}

module.exports = {
  reviewAnchorPacket,
  reviewAnchorPackets,
  summarizeReports,
};
