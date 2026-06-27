import crypto from "node:crypto";

const CLAIM_KEYS = ["novelty", "ethics", "dataAvailability", "conflicts"];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function textSimilarity(left, right) {
  const leftTerms = new Set(normalizeText(left).split(" ").filter(Boolean));
  const rightTerms = new Set(normalizeText(right).split(" ").filter(Boolean));
  if (leftTerms.size === 0 && rightTerms.size === 0) return 1;
  const overlap = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  return overlap / Math.max(leftTerms.size, rightTerms.size);
}

function addFinding(findings, severity, code, message, remediation) {
  findings.push({ severity, code, message, remediation });
}

function hasPrivateLeak(packet) {
  const noteText = packet.coverLetter.editorNotes.join("\n").toLowerCase();
  return (
    packet.coverLetter.privateCommentExports.length > 0 ||
    /private reviewer|internal note|unresolved collaborator|do not disclose/.test(noteText)
  );
}

function evaluateApprovalFreshness(packet, findings) {
  const expectedHash = packet.manuscript.versionHash;
  const cover = packet.coverLetter;

  if (cover.manuscriptHash !== expectedHash) {
    addFinding(
      findings,
      "high",
      "STALE_COVER_LETTER_HASH",
      `Cover letter references ${cover.manuscriptHash}, but final manuscript is ${expectedHash}.`,
      "Regenerate the cover-letter packet from the final manuscript version.",
    );
  }

  if (!cover.correspondingAuthorApproval || cover.correspondingAuthorApproval.approvedHash !== expectedHash) {
    addFinding(
      findings,
      "high",
      "MISSING_CORRESPONDING_AUTHOR_APPROVAL",
      "Corresponding author approval is missing or tied to an older manuscript hash.",
      "Collect a fresh corresponding-author approval after the final edit.",
    );
  }

  const requiredCoauthors = packet.collaborators
    .filter((collaborator) => collaborator.role === "coauthor")
    .map((collaborator) => collaborator.authorId);
  const approvedCoauthors = new Set(
    cover.coauthorApprovals
      .filter((approval) => approval.approvedHash === expectedHash)
      .map((approval) => approval.authorId),
  );
  const missing = requiredCoauthors.filter((authorId) => !approvedCoauthors.has(authorId));
  if (missing.length > 0) {
    addFinding(
      findings,
      "medium",
      "COAUTHOR_APPROVAL_DRIFT",
      `Missing fresh cover-letter approval from ${missing.join(", ")}.`,
      "Route the final cover-letter packet to every coauthor who is listed on the manuscript.",
    );
  }
}

function evaluateStatementConsistency(packet, findings) {
  for (const key of CLAIM_KEYS) {
    const manuscriptValue = packet.manuscript.claims[key];
    const coverValue = packet.coverLetter.statements[key];
    const similarity = textSimilarity(manuscriptValue, coverValue);
    if (similarity < 0.45) {
      addFinding(
        findings,
        key === "conflicts" || key === "ethics" ? "high" : "medium",
        `CLAIM_MISMATCH_${key.toUpperCase()}`,
        `Cover-letter ${key} statement diverges from the manuscript claim.`,
        "Align cover-letter statements with the final manuscript disclosure text before export.",
      );
    }
  }
}

export function evaluateCoverLetterExportPacket(packet) {
  const findings = [];
  evaluateApprovalFreshness(packet, findings);
  evaluateStatementConsistency(packet, findings);

  if (hasPrivateLeak(packet)) {
    addFinding(
      findings,
      "high",
      "PRIVATE_COMMENT_LEAK",
      "Cover-letter export includes private reviewer or collaborator notes.",
      "Redact private comments and rebuild the editor-facing correspondence packet.",
    );
  }

  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const mediumCount = findings.filter((finding) => finding.severity === "medium").length;
  const decision = highCount > 0 ? "HOLD" : mediumCount > 0 ? "REVIEW" : "RELEASE";
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify({ id: packet.id, decision, findings }))
    .digest("hex")
    .slice(0, 16);

  return {
    packetId: packet.id,
    decision,
    findingCount: findings.length,
    highCount,
    mediumCount,
    findings,
    exportReady: decision === "RELEASE",
    auditDigest,
  };
}

export function renderMarkdownReport(packet, result) {
  const lines = [
    `# Cover Letter Export Guard Report`,
    "",
    `- Packet: ${packet.id}`,
    `- Manuscript: ${packet.manuscript.title}`,
    `- Decision: ${result.decision}`,
    `- Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  if (result.findings.length === 0) {
    lines.push("- No blockers found. Cover-letter export is ready for journal submission.");
  } else {
    for (const finding of result.findings) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
      lines.push(`  Remediation: ${finding.remediation}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
