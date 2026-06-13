"use strict";

const RELEASE = "RELEASE_ASSISTANT_OUTPUT";
const HOLD = "HOLD_FOR_EDITOR";
const BLOCK = "BLOCK_ASSISTANT_OUTPUT";

function asDate(value, field, findings, severity = "review") {
  if (!value) {
    findings.push({
      severity,
      code: `${field}_missing`,
      message: `${field} is missing.`,
      remediation: `Attach ${field} evidence before release.`
    });
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    findings.push({
      severity: "block",
      code: `${field}_invalid`,
      message: `${field} is not a valid date: ${value}.`,
      remediation: `Normalize ${field} to ISO-8601.`
    });
    return null;
  }
  return date;
}

function yearsBetween(older, newer) {
  return (newer.getTime() - older.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function addFinding(findings, severity, code, message, remediation, ref) {
  findings.push({ severity, code, message, remediation, ref });
}

function indexCitations(citations) {
  return new Map(normalizeList(citations).map((citation) => [citation.id, citation]));
}

function evaluateCitation(citation, packet, options, findings) {
  const now = asDate(options.asOf || packet.generatedAt || "2026-06-14", "asOf", findings, "block");
  const publishedAt = asDate(citation.publishedAt, "publishedAt", findings);

  if (!citation.id || !citation.title || !citation.doi) {
    addFinding(
      findings,
      "review",
      "citation_identity_incomplete",
      `Citation identity is incomplete for ${citation.id || "unknown citation"}.`,
      "Attach stable citation id, title, and DOI before assistant output release.",
      citation.id
    );
  }

  if (citation.status === "retracted") {
    addFinding(
      findings,
      "block",
      "citation_retracted",
      `${citation.id} is marked retracted.`,
      "Remove the citation from supporting evidence or rewrite the assistant note as a retraction warning.",
      citation.id
    );
  }

  if (citation.status === "expression_of_concern") {
    addFinding(
      findings,
      "review",
      "citation_expression_of_concern",
      `${citation.id} has an expression of concern.`,
      "Route to an editor before AI review output cites this source as support.",
      citation.id
    );
  }

  if (citation.status === "superseded" || citation.publishedVersionId) {
    addFinding(
      findings,
      "review",
      "citation_superseded",
      `${citation.id} appears superseded by ${citation.publishedVersionId || "a newer version"}.`,
      "Prefer the current published version or explain why the older version remains relevant.",
      citation.id
    );
  }

  if (citation.sourceType === "preprint" && !citation.publishedVersionId && citation.usedAs === "primary_support") {
    addFinding(
      findings,
      "review",
      "primary_preprint_without_published_version_check",
      `${citation.id} is a primary-support preprint without a published-version check.`,
      "Record a published-version search or downgrade the assistant confidence.",
      citation.id
    );
  }

  if (now && publishedAt && yearsBetween(publishedAt, now) > (options.maxEvidenceAgeYears || 8) && !citation.hasRecentReplication) {
    addFinding(
      findings,
      "review",
      "citation_stale_without_replication",
      `${citation.id} is older than the configured evidence window and has no recent replication marker.`,
      "Attach a recent replication, meta-analysis, or recency caveat.",
      citation.id
    );
  }

  if (!citation.contextQuote || citation.contextQuote.length < 24) {
    addFinding(
      findings,
      "review",
      "citation_context_missing",
      `${citation.id} lacks a usable citation-context quote.`,
      "Attach the local evidence sentence used by the assistant.",
      citation.id
    );
  }
}

function evaluateClaim(claim, citationMap, findings) {
  const evidence = normalizeList(claim.evidence);
  if (!claim.id || !claim.text) {
    addFinding(
      findings,
      "block",
      "claim_identity_missing",
      "A claim is missing id or text.",
      "Attach stable claim id and text before review output release.",
      claim.id
    );
  }

  if (evidence.length === 0) {
    addFinding(
      findings,
      "block",
      "claim_without_evidence",
      `${claim.id} has no citation evidence.`,
      "Attach at least one citation or remove the assistant claim.",
      claim.id
    );
  }

  for (const item of evidence) {
    const citation = citationMap.get(item.citationId);
    if (!citation) {
      addFinding(
        findings,
        "block",
        "claim_evidence_missing_citation",
        `${claim.id} references missing citation ${item.citationId}.`,
        "Add the cited source packet or remove the evidence reference.",
        item.citationId
      );
      continue;
    }

    if (item.supportRelation === "contradicts") {
      addFinding(
        findings,
        "block",
        "citation_contradicts_claim",
        `${citation.id} is marked as contradicting ${claim.id}.`,
        "Rewrite the assistant note to present the contradiction rather than support the claim.",
        citation.id
      );
    }

    if (item.supportRelation === "background") {
      addFinding(
        findings,
        "review",
        "background_citation_used_as_support",
        `${citation.id} is only background evidence for ${claim.id}.`,
        "Attach direct support or lower the assistant confidence.",
        citation.id
      );
    }

    if (citation.status === "retracted" && item.supportRelation === "supports") {
      addFinding(
        findings,
        "block",
        "retracted_citation_supports_claim",
        `${claim.id} is supported by retracted citation ${citation.id}.`,
        "Remove this evidence path and regenerate the assistant output.",
        citation.id
      );
    }
  }
}

function evaluateAssistantNote(note, citationMap, findings) {
  if (!note || !note.text) {
    addFinding(
      findings,
      "review",
      "assistant_note_missing",
      "Assistant note text is missing.",
      "Generate reviewer-visible text only after the evidence packet is complete.",
      "assistantNote"
    );
    return;
  }

  for (const citationId of normalizeList(note.recommendedCitationIds)) {
    const citation = citationMap.get(citationId);
    if (!citation) {
      addFinding(
        findings,
        "block",
        "assistant_recommends_missing_citation",
        `Assistant recommends missing citation ${citationId}.`,
        "Remove the recommendation or attach the cited source packet.",
        citationId
      );
      continue;
    }
    if (citation.status === "retracted") {
      addFinding(
        findings,
        "block",
        "assistant_recommends_retracted_citation",
        `Assistant recommends retracted citation ${citationId}.`,
        "Regenerate the assistant note with retraction-safe evidence.",
        citationId
      );
    }
  }
}

function decide(findings) {
  if (findings.some((finding) => finding.severity === "block")) return BLOCK;
  if (findings.some((finding) => finding.severity === "review")) return HOLD;
  return RELEASE;
}

function evaluateCitationEvidencePacket(packet, options = {}) {
  const findings = [];
  if (!packet || typeof packet !== "object") {
    throw new TypeError("packet must be an object");
  }
  if (!packet.packetId || !packet.manuscriptId) {
    addFinding(
      findings,
      "block",
      "packet_identity_missing",
      "Packet id or manuscript id is missing.",
      "Attach packetId and manuscriptId before release.",
      "packet"
    );
  }

  const citations = normalizeList(packet.citations);
  const citationMap = indexCitations(citations);
  for (const citation of citations) evaluateCitation(citation, packet, options, findings);
  for (const claim of normalizeList(packet.claims)) evaluateClaim(claim, citationMap, findings);
  evaluateAssistantNote(packet.assistantNote, citationMap, findings);

  if (findings.length === 0) {
    addFinding(
      findings,
      "pass",
      "citation_evidence_ready",
      "Citation evidence is current, unretracted, and aligned with assistant output.",
      "No remediation required.",
      packet.packetId
    );
  }

  return {
    packetId: packet.packetId,
    manuscriptId: packet.manuscriptId,
    decision: decide(findings),
    findings
  };
}

function evaluateCitationEvidenceBatch(packets, options = {}) {
  return normalizeList(packets).map((packet) => evaluateCitationEvidencePacket(packet, options));
}

function summarize(results) {
  const summary = { blocks: 0, reviews: 0, passes: 0 };
  for (const result of normalizeList(results)) {
    for (const finding of result.findings) {
      if (finding.severity === "block") summary.blocks += 1;
      if (finding.severity === "review") summary.reviews += 1;
      if (finding.severity === "pass") summary.passes += 1;
    }
  }
  return summary;
}

module.exports = {
  RELEASE,
  HOLD,
  BLOCK,
  evaluateCitationEvidencePacket,
  evaluateCitationEvidenceBatch,
  summarize
};
