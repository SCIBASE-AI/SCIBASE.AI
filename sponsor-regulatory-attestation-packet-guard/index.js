"use strict";

const crypto = require("crypto");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HIGH_VALUE_PRIZE_USD = 600;
const RESTRICTED_EXPORT_CLASSES = new Set(["itar", "ear-controlled", "dual-use-restricted", "sanctioned-use"]);

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${fieldName}: ${value}`);
  }
  return date;
}

function daysBetween(start, end) {
  return Math.floor((parseDate(end, "end") - parseDate(start, "start")) / MS_PER_DAY);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function looksLikeDigest(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/i.test(value);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeJurisdiction(value) {
  return String(value || "").trim().toUpperCase();
}

function addFinding(findings, challenge, severity, code, message, evidence, remediation) {
  findings.push({
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    severity,
    code,
    message,
    evidence,
    remediation
  });
}

function evidenceAgeDays(now, timestamp) {
  if (!timestamp) {
    return null;
  }
  return daysBetween(timestamp, now);
}

function validateSponsorIdentity(challenge, findings) {
  const sponsor = challenge.sponsor || {};
  const signer = sponsor.authorizedSigner || {};

  if (!sponsor.legalName) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_sponsor_legal_identity",
      "The challenge sponsor has no legal entity name.",
      { sponsorName: sponsor.displayName || null },
      "Attach the sponsor legal entity name before the challenge opens for submissions."
    );
  }

  if (!sponsor.entityIdentifier) {
    addFinding(
      findings,
      challenge,
      "warning",
      "missing_sponsor_entity_identifier",
      "The sponsor does not include a registration, institution, or tax entity identifier.",
      { legalName: sponsor.legalName || null },
      "Record a sponsor entity identifier so the prize source can be audited without relying on display names."
    );
  }

  if (!signer.name || !signer.role || !looksLikeDigest(signer.authorityDigest)) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_authorized_signer_evidence",
      "The sponsor packet does not prove that an authorized signer approved the challenge.",
      {
        signerName: signer.name || null,
        signerRole: signer.role || null,
        authorityDigest: signer.authorityDigest || null
      },
      "Add signer name, role, and a SHA-256 digest of the sponsor authorization record."
    );
  }
}

function validateFundingAttestation(challenge, findings, now, options) {
  const prize = challenge.prize || {};
  const funding = challenge.funding || {};

  if (!Number.isFinite(prize.amountUsd) || prize.amountUsd <= 0) {
    addFinding(
      findings,
      challenge,
      "critical",
      "invalid_prize_amount",
      "The challenge prize amount is missing or invalid.",
      { amountUsd: prize.amountUsd || null },
      "Record a positive USD-equivalent prize amount before the challenge is published."
    );
  }

  if (!funding.sourceOfFundsAttested || !looksLikeDigest(funding.statementDigest)) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_source_of_funds_attestation",
      "The sponsor has not supplied a verifiable source-of-funds attestation.",
      {
        sourceOfFundsAttested: Boolean(funding.sourceOfFundsAttested),
        statementDigest: funding.statementDigest || null
      },
      "Require a signed source-of-funds statement digest before accepting submissions."
    );
  }

  const attestationAge = evidenceAgeDays(now, funding.attestedAt);
  if (attestationAge === null) {
    addFinding(
      findings,
      challenge,
      "warning",
      "missing_funding_attestation_timestamp",
      "The source-of-funds attestation has no timestamp.",
      { attestedAt: null },
      "Attach the signature timestamp so stale funding packets can be revalidated."
    );
  } else if (attestationAge > options.maxAttestationAgeDays) {
    addFinding(
      findings,
      challenge,
      "warning",
      "stale_source_of_funds_attestation",
      "The source-of-funds attestation is older than the freshness window.",
      {
        attestedAt: funding.attestedAt,
        ageDays: attestationAge,
        maxAttestationAgeDays: options.maxAttestationAgeDays
      },
      "Refresh sponsor funding attestations before the challenge is opened or extended."
    );
  }

  if (funding.thirdPartySponsor === true && !looksLikeDigest(funding.thirdPartyDisclosureDigest)) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_third_party_funding_disclosure",
      "Third-party prize funding is marked but no sponsor disclosure digest is attached.",
      { thirdPartySponsor: true, thirdPartyDisclosureDigest: funding.thirdPartyDisclosureDigest || null },
      "Attach a disclosure digest naming the upstream funder and any restrictions on the prize."
    );
  }
}

function validateSanctionsScreening(challenge, findings, now, options) {
  const screening = challenge.sanctionsScreening || {};
  const status = normalizeText(screening.status);

  if (!status) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_sanctions_screening",
      "The sponsor packet does not include sanctions or restricted-party screening status.",
      { status: null },
      "Screen the sponsor, beneficial owners, and payment administrator before opening the challenge."
    );
  } else if (status === "blocked") {
    addFinding(
      findings,
      challenge,
      "critical",
      "blocked_sanctions_screening",
      "The sponsor packet contains an unresolved blocked sanctions screening result.",
      { status, reference: screening.reference || null },
      "Block the challenge until compliance counsel clears or rejects the sponsor."
    );
  } else if (status === "review") {
    addFinding(
      findings,
      challenge,
      "warning",
      "sanctions_screening_requires_review",
      "The sponsor screening result requires compliance review.",
      { status, reference: screening.reference || null },
      "Hold publication until the screening review is resolved."
    );
  }

  const checkedAge = evidenceAgeDays(now, screening.checkedAt);
  if (checkedAge === null) {
    addFinding(
      findings,
      challenge,
      "warning",
      "missing_sanctions_screening_timestamp",
      "The sanctions screening result has no checked timestamp.",
      { checkedAt: null },
      "Record when the restricted-party screening was performed."
    );
  } else if (checkedAge > options.maxScreeningAgeDays) {
    addFinding(
      findings,
      challenge,
      "warning",
      "stale_sanctions_screening",
      "The sanctions screening result is older than the allowed freshness window.",
      { checkedAt: screening.checkedAt, ageDays: checkedAge, maxScreeningAgeDays: options.maxScreeningAgeDays },
      "Refresh the screening packet before accepting submissions or paying prize funds."
    );
  }

  for (const owner of screening.beneficialOwners || []) {
    if (owner.sanctionsHit === true && !looksLikeDigest(owner.resolutionDigest)) {
      addFinding(
        findings,
        challenge,
        "critical",
        "unresolved_beneficial_owner_screening_hit",
        "A beneficial owner has a screening hit without a resolution record.",
        { ownerId: owner.id || null, role: owner.role || null },
        "Attach a compliance resolution digest or block the challenge."
      );
    }
  }
}

function validateTaxAndReporting(challenge, findings) {
  const prize = challenge.prize || {};
  const tax = challenge.taxReporting || {};
  const isHighValue = Number(prize.amountUsd || 0) >= HIGH_VALUE_PRIZE_USD;
  const sponsorJurisdiction = normalizeJurisdiction((challenge.sponsor || {}).jurisdiction);
  const payoutJurisdictions = (challenge.expectedPayoutJurisdictions || []).map(normalizeJurisdiction);
  const crossBorder = payoutJurisdictions.some((jurisdiction) => jurisdiction && jurisdiction !== sponsorJurisdiction);

  if (isHighValue && !looksLikeDigest(tax.reportingPlanDigest)) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_high_value_tax_reporting_plan",
      "A high-value prize lacks a tax reporting plan digest.",
      { amountUsd: prize.amountUsd, reportingPlanDigest: tax.reportingPlanDigest || null },
      "Attach the sponsor-side tax reporting plan before submissions are opened."
    );
  }

  if (tax.formStatus !== "complete" && tax.formStatus !== "not_applicable") {
    addFinding(
      findings,
      challenge,
      isHighValue ? "critical" : "warning",
      "incomplete_tax_form_status",
      "The sponsor packet does not mark tax form readiness as complete or not applicable.",
      { formStatus: tax.formStatus || null, amountUsd: prize.amountUsd || null },
      "Resolve sponsor-side tax form readiness before prize commitments are advertised."
    );
  }

  if (crossBorder && tax.withholdingReviewComplete !== true) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_cross_border_withholding_review",
      "Expected payout jurisdictions differ from the sponsor jurisdiction but withholding review is incomplete.",
      { sponsorJurisdiction, expectedPayoutJurisdictions: payoutJurisdictions },
      "Complete cross-border withholding review before challenge launch."
    );
  }
}

function validateExportAndRegulatedDomain(challenge, findings) {
  const exportControl = challenge.exportControl || {};
  const classification = normalizeText(exportControl.classification || "unknown");

  if (classification === "unknown") {
    addFinding(
      findings,
      challenge,
      "warning",
      "unknown_export_control_classification",
      "The challenge has no export-control classification.",
      { classification: exportControl.classification || null },
      "Classify the challenge as exempt, EAR99, restricted, or not applicable before publication."
    );
  } else if (RESTRICTED_EXPORT_CLASSES.has(classification) && !looksLikeDigest(exportControl.counselApprovalDigest)) {
    addFinding(
      findings,
      challenge,
      "critical",
      "restricted_export_without_counsel_approval",
      "A restricted export-control classification lacks counsel approval evidence.",
      { classification: exportControl.classification, counselApprovalDigest: exportControl.counselApprovalDigest || null },
      "Attach counsel approval and participant restrictions before publishing the challenge."
    );
  }

  if (exportControl.internationalParticipation === true && !looksLikeDigest(exportControl.participationControlsDigest)) {
    addFinding(
      findings,
      challenge,
      "warning",
      "missing_international_participation_controls",
      "International participation is expected but no participant-control digest is attached.",
      { internationalParticipation: true },
      "Record eligibility controls for international participants before the challenge opens."
    );
  }

  if (challenge.regulatedDomain === true && !looksLikeDigest(challenge.regulatoryReviewDigest)) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_regulated_domain_review_packet",
      "The challenge is marked as regulated but lacks a regulatory review packet digest.",
      { regulatoryReviewDigest: challenge.regulatoryReviewDigest || null },
      "Attach the domain-specific regulatory review packet before publishing the challenge."
    );
  }
}

function validatePublicTerms(challenge, findings) {
  const terms = challenge.publicTerms || {};

  if (!looksLikeDigest(terms.rulesDigest)) {
    addFinding(
      findings,
      challenge,
      "critical",
      "missing_public_rules_digest",
      "The challenge does not have immutable public rules evidence.",
      { rulesDigest: terms.rulesDigest || null },
      "Attach a SHA-256 digest of the public rules, deliverables, and evaluation disclosures."
    );
  }

  if (!terms.cancellationPolicy || !terms.refundPolicy) {
    addFinding(
      findings,
      challenge,
      "warning",
      "missing_cancellation_or_refund_policy",
      "The public terms do not identify cancellation and refund handling.",
      {
        cancellationPolicy: terms.cancellationPolicy || null,
        refundPolicy: terms.refundPolicy || null
      },
      "Publish cancellation and refund language so sponsors and solvers share the same expectations."
    );
  }

  if (!challenge.complianceContact || !challenge.complianceContact.email) {
    addFinding(
      findings,
      challenge,
      "warning",
      "missing_compliance_contact",
      "The challenge lacks a sponsor compliance escalation contact.",
      { complianceContact: challenge.complianceContact || null },
      "Add a compliance contact for screening, tax, export-control, or sponsor-attestation questions."
    );
  }
}

function statusForFindings(findings) {
  if (findings.some((finding) => finding.severity === "critical")) {
    return "block_challenge";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "hold_for_compliance";
  }
  return "ready_to_open";
}

function evaluateSponsorAttestation(input, userOptions = {}) {
  if (!input || !Array.isArray(input.challenges)) {
    throw new Error("Expected input.challenges to be an array");
  }

  const options = {
    maxAttestationAgeDays: 90,
    maxScreeningAgeDays: 30,
    ...userOptions
  };
  const now = input.generatedAt || new Date().toISOString();
  const findings = [];
  const challenges = [];

  for (const challenge of input.challenges) {
    const start = findings.length;
    validateSponsorIdentity(challenge, findings);
    validateFundingAttestation(challenge, findings, now, options);
    validateSanctionsScreening(challenge, findings, now, options);
    validateTaxAndReporting(challenge, findings);
    validateExportAndRegulatedDomain(challenge, findings);
    validatePublicTerms(challenge, findings);

    const challengeFindings = findings.slice(start);
    const status = statusForFindings(challengeFindings);
    challenges.push({
      challengeId: challenge.id,
      title: challenge.title,
      sponsorLegalName: (challenge.sponsor || {}).legalName || null,
      amountUsd: (challenge.prize || {}).amountUsd || null,
      sponsorJurisdiction: normalizeJurisdiction((challenge.sponsor || {}).jurisdiction),
      status,
      criticalCount: challengeFindings.filter((finding) => finding.severity === "critical").length,
      warningCount: challengeFindings.filter((finding) => finding.severity === "warning").length,
      packetDigest: digest({
        id: challenge.id,
        sponsor: challenge.sponsor || {},
        prize: challenge.prize || {},
        funding: challenge.funding || {},
        sanctionsScreening: challenge.sanctionsScreening || {},
        taxReporting: challenge.taxReporting || {},
        exportControl: challenge.exportControl || {},
        publicTerms: challenge.publicTerms || {}
      })
    });
  }

  const summary = {
    challengeCount: challenges.length,
    readyCount: challenges.filter((challenge) => challenge.status === "ready_to_open").length,
    holdCount: challenges.filter((challenge) => challenge.status === "hold_for_compliance").length,
    blockCount: challenges.filter((challenge) => challenge.status === "block_challenge").length,
    findingCount: findings.length,
    criticalCount: findings.filter((finding) => finding.severity === "critical").length,
    warningCount: findings.filter((finding) => finding.severity === "warning").length
  };

  const releaseDecision = summary.blockCount > 0
    ? "block_challenge_publication"
    : summary.holdCount > 0
      ? "hold_for_compliance_review"
      : "ready_to_open";

  const result = {
    generatedAt: now,
    releaseDecision,
    summary,
    challenges,
    findings
  };
  result.auditDigest = digest(result);
  return result;
}

function renderMarkdownReport(result) {
  const lines = [
    "# Sponsor Regulatory Attestation Packet Review",
    "",
    `Generated: ${result.generatedAt}`,
    `Decision: ${result.releaseDecision}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Challenges reviewed: ${result.summary.challengeCount}`,
    `- Ready: ${result.summary.readyCount}`,
    `- Hold for compliance: ${result.summary.holdCount}`,
    `- Blocked: ${result.summary.blockCount}`,
    `- Critical findings: ${result.summary.criticalCount}`,
    `- Warnings: ${result.summary.warningCount}`,
    "",
    "## Challenge Status",
    "",
    "| Challenge | Sponsor | Amount USD | Status | Critical | Warnings |",
    "| --- | --- | ---: | --- | ---: | ---: |"
  ];

  for (const challenge of result.challenges) {
    lines.push(`| ${challenge.title} | ${challenge.sponsorLegalName || "Unknown"} | ${challenge.amountUsd || 0} | ${challenge.status} | ${challenge.criticalCount} | ${challenge.warningCount} |`);
  }

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("No findings.");
  } else {
    for (const finding of result.findings) {
      lines.push(`### ${finding.severity.toUpperCase()}: ${finding.code}`);
      lines.push("");
      lines.push(`Challenge: ${finding.challengeTitle}`);
      lines.push("");
      lines.push(finding.message);
      lines.push("");
      lines.push(`Remediation: ${finding.remediation}`);
      lines.push("");
    }
  }

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const width = 960;
  const height = 540;
  const max = Math.max(1, result.summary.readyCount, result.summary.holdCount, result.summary.blockCount);
  const bars = [
    ["Ready", result.summary.readyCount, "#176b3a", 150],
    ["Hold", result.summary.holdCount, "#8a5a00", 230],
    ["Blocked", result.summary.blockCount, "#9d1c2f", 310],
    ["Findings", result.summary.findingCount, "#116d6e", 390]
  ];

  const barMarkup = bars.map(([label, count, color, y]) => {
    const barWidth = Math.max(8, Math.round((count / max) * 560));
    return [
      `<text x="72" y="${y + 25}" font-size="24" font-family="Arial" fill="#1b1f24">${label}</text>`,
      `<rect x="220" y="${y}" width="${barWidth}" height="42" rx="4" fill="${color}" />`,
      `<text x="${240 + barWidth}" y="${y + 29}" font-size="22" font-family="Arial" fill="#1b1f24">${count}</text>`
    ].join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="960" height="540" fill="#f8fafc" />',
    '<rect x="40" y="40" width="880" height="460" rx="8" fill="#ffffff" stroke="#d8dee7" />',
    '<text x="72" y="96" font-size="32" font-family="Arial" font-weight="700" fill="#1b1f24">Sponsor Regulatory Attestation Guard</text>',
    `<text x="72" y="126" font-size="18" font-family="Arial" fill="#5b6572">Decision: ${result.releaseDecision}</text>`,
    barMarkup,
    `<text x="72" y="470" font-size="15" font-family="Arial" fill="#5b6572">Audit digest: ${result.auditDigest.slice(0, 24)}...</text>`,
    "</svg>"
  ].join("\n");
}

module.exports = {
  evaluateSponsorAttestation,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  daysBetween,
  normalizeJurisdiction
};
