"use strict";

const PARTICIPANT_MARKERS = [
  /\bparticipant\s+\d{2,}\b/i,
  /\bsubject\s+\d{2,}\b/i,
  /\bpatient\s+\d{2,}\b/i,
  /\bmrn[:\s-]*\d{4,}\b/i,
  /\bdob[:\s-]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i
];

const VULNERABLE_GROUPS = new Set([
  "children",
  "minors",
  "incarcerated people",
  "pregnant participants",
  "cognitively impaired participants",
  "indigenous communities"
]);

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function hasParticipantMarker(value) {
  const text = String(value || "");
  return PARTICIPANT_MARKERS.some((pattern) => pattern.test(text));
}

function parseDate(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

function isOlderThanDays(dateValue, referenceValue, maxAgeDays) {
  const date = parseDate(dateValue);
  const reference = parseDate(referenceValue);
  if (!date || !reference) return false;
  return (reference.getTime() - date.getTime()) / 86400000 > maxAgeDays;
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled collaborative manuscript packet",
    reviewDate: packet.reviewDate || "2026-08-15",
    manuscript: packet.manuscript || {},
    ethics: packet.ethics || {},
    consent: packet.consent || {},
    collaborativeState: packet.collaborativeState || {},
    comments: list(packet.comments),
    exportTarget: packet.exportTarget || {}
  };
}

function analyzeEthics(packet) {
  const findings = [];
  const ethics = packet.ethics;
  const manuscript = packet.manuscript;

  if (manuscript.humanSubjects === true && !ethics.approvalId) {
    findings.push(finding(
      "MISSING_ETHICS_APPROVAL_ID",
      "critical",
      "The manuscript involves human subjects but lacks an ethics approval identifier.",
      { humanSubjects: manuscript.humanSubjects, approvalId: ethics.approvalId || null },
      "Add the IRB/REC approval identifier or mark the study as exempt with supporting rationale."
    ));
  }

  if (ethics.exempt === true && !ethics.exemptionRationale) {
    findings.push(finding(
      "MISSING_EXEMPTION_RATIONALE",
      "major",
      "The packet marks the study exempt but does not include an exemption rationale.",
      { exempt: ethics.exempt },
      "Add the exemption category, approving body, and rationale before export."
    ));
  }

  if (ethics.approvalId && ethics.expiryDate && parseDate(ethics.expiryDate) && parseDate(ethics.expiryDate) < parseDate(packet.reviewDate)) {
    findings.push(finding(
      "ETHICS_APPROVAL_EXPIRED",
      "critical",
      "The ethics approval appears expired before the export review date.",
      { approvalId: ethics.approvalId, expiryDate: ethics.expiryDate, reviewDate: packet.reviewDate },
      "Hold export until renewed approval or a no-further-review determination is documented."
    ));
  }

  const participantGroups = list(manuscript.participantGroups).map(normalizeText);
  const vulnerable = participantGroups.filter((group) => VULNERABLE_GROUPS.has(group));
  if (vulnerable.length > 0 && ethics.vulnerablePopulationReview !== true) {
    findings.push(finding(
      "VULNERABLE_POPULATION_REVIEW_MISSING",
      "major",
      "The manuscript includes vulnerable participant groups without documented enhanced ethics review.",
      { vulnerableGroups: vulnerable },
      "Add vulnerable-population review evidence and consent safeguards before publication export."
    ));
  }

  return findings;
}

function analyzeConsent(packet) {
  const findings = [];
  const consent = packet.consent;
  const manuscript = packet.manuscript;
  const target = packet.exportTarget;

  if (manuscript.humanSubjects === true && consent.required === true && consent.statementPresent !== true) {
    findings.push(finding(
      "MISSING_CONSENT_STATEMENT",
      "critical",
      "Consent is required but no consent statement is present in the collaborative manuscript.",
      { consentRequired: consent.required, statementPresent: consent.statementPresent || false },
      "Add a consent statement or documented waiver before export."
    ));
  }

  if (consent.required === false && !consent.waiverReason && manuscript.humanSubjects === true) {
    findings.push(finding(
      "CONSENT_WAIVER_REASON_MISSING",
      "major",
      "The packet says consent is not required but provides no waiver reason.",
      { consentRequired: consent.required, waiverReason: consent.waiverReason || null },
      "Add the consent waiver rationale and approving body."
    ));
  }

  if (consent.statementPresent === true && consent.scope && target.releaseScope && normalizeText(consent.scope) !== normalizeText(target.releaseScope)) {
    findings.push(finding(
      "CONSENT_SCOPE_EXPORT_MISMATCH",
      "major",
      "The consent statement scope does not match the requested export scope.",
      { consentScope: consent.scope, exportScope: target.releaseScope },
      "Update the export target or document consent coverage for the publication scope."
    ));
  }

  const requiredLanguages = list(consent.requiredLanguages).map(normalizeText);
  const presentLanguages = list(consent.presentLanguages).map(normalizeText);
  const missingLanguages = requiredLanguages.filter((language) => !presentLanguages.includes(language));
  if (missingLanguages.length > 0) {
    findings.push(finding(
      "TRANSLATED_CONSENT_COVERAGE_MISSING",
      "major",
      "Required consent-language coverage is missing for one or more participant groups.",
      { missingLanguages },
      "Add translated consent evidence or justify why those participant groups are not included in the export."
    ));
  }

  return findings;
}

function analyzeCollaboration(packet) {
  const findings = [];
  const state = packet.collaborativeState;
  const ethicsSection = state.ethicsSection || {};

  if (ethicsSection.locked === true && ethicsSection.pendingEdits === true && ethicsSection.approvedOverride !== true) {
    findings.push(finding(
      "LOCKED_ETHICS_SECTION_HAS_PENDING_EDITS",
      "major",
      "A locked ethics or consent section has pending collaborative edits without approved override.",
      { locked: ethicsSection.locked, pendingEdits: ethicsSection.pendingEdits },
      "Route pending edits through the section owner or ethics reviewer before export."
    ));
  }

  if (state.lastEthicsReviewAt && isOlderThanDays(state.lastEthicsReviewAt, packet.reviewDate, 180)) {
    findings.push(finding(
      "STALE_ETHICS_REVIEW",
      "major",
      "The last ethics-section review is older than the configured freshness window.",
      { lastEthicsReviewAt: state.lastEthicsReviewAt, maxAgeDays: 180 },
      "Refresh ethics reviewer signoff after the latest collaborative edits."
    ));
  }

  for (const comment of packet.comments) {
    if (comment.private === true && comment.exportVisible === true) {
      findings.push(finding(
        "PRIVATE_ETHICS_COMMENT_VISIBLE_IN_EXPORT",
        "critical",
        "A private ethics or reviewer comment is marked visible in the export packet.",
        { commentId: comment.id || null, section: comment.section || null },
        "Redact or remove private comments before creating the public manuscript export."
      ));
    }

    if (hasParticipantMarker(comment.text)) {
      findings.push(finding(
        "PARTICIPANT_IDENTIFIER_IN_COMMENT",
        "critical",
        "A collaborative comment appears to contain a participant, subject, patient, MRN, or DOB marker.",
        { commentId: comment.id || null, section: comment.section || null },
        "Redact participant identifiers and regenerate reviewer-safe comments before export."
      ));
    }

    if (comment.resolved !== true && normalizeText(comment.section).includes("ethics")) {
      findings.push(finding(
        "UNRESOLVED_ETHICS_COMMENT",
        "minor",
        "An ethics-section comment remains unresolved at export time.",
        { commentId: comment.id || null },
        "Resolve or explicitly defer the ethics comment before publication export."
      ));
    }
  }

  return findings;
}

function severityWeight(severity) {
  if (severity === "critical") return 5;
  if (severity === "major") return 3;
  return 1;
}

function decisionFromFindings(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD";
  if (findings.length > 0) return "REVIEW";
  return "RELEASE";
}

function confidenceFromFindings(findings) {
  const penalty = findings.reduce((total, item) => total + severityWeight(item.severity), 0);
  return Math.max(0.1, Number((0.96 - penalty * 0.065).toFixed(2)));
}

function reviewerNote(packet, decision, findings) {
  if (decision === "RELEASE") {
    return `${packet.manuscript.domain || "collaborative manuscript"}: ethics, consent, comments, and export scope are publication-ready.`;
  }
  const first = findings[0];
  return `${packet.manuscript.domain || "collaborative manuscript"}: ${decision} before export because ${first.message.toLowerCase()}`;
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const findings = [
    ...analyzeEthics(packet),
    ...analyzeConsent(packet),
    ...analyzeCollaboration(packet)
  ];
  const decision = decisionFromFindings(findings);

  return {
    id: packet.id,
    title: packet.title,
    decision,
    confidence: confidenceFromFindings(findings),
    humanSubjects: packet.manuscript.humanSubjects === true,
    commentCount: packet.comments.length,
    findingCount: findings.length,
    findings,
    reviewerNote: reviewerNote(packet, decision, findings)
  };
}

function analyzePackets(packets) {
  const reviews = packets.map(analyzePacket);
  const counts = reviews.reduce((acc, review) => {
    acc[review.decision] = (acc[review.decision] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    packetCount: reviews.length,
    decisionCounts: {
      RELEASE: counts.RELEASE || 0,
      REVIEW: counts.REVIEW || 0,
      HOLD: counts.HOLD || 0
    },
    reviews
  };
}

module.exports = {
  PARTICIPANT_MARKERS,
  analyzePacket,
  analyzePackets,
  decisionFromFindings,
  hasParticipantMarker
};
