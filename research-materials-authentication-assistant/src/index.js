"use strict";

const TRACKED_MATERIAL_TYPES = new Set([
  "antibody",
  "cell_line",
  "organism_strain",
  "primary_cell",
  "reagent"
]);

const STALE_VALIDATION_DAYS = 730;
const CLEAN_CONTAMINATION_VALUES = new Set(["negative", "clear", "not_detected", "none"]);
const CONTAMINATION_ALERT_VALUES = new Set(["positive", "detected", "contaminated", "mycoplasma_positive"]);

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeMaterial(material) {
  return {
    name: material.name || material.id || "unnamed material",
    type: normalizeText(material.type || "reagent"),
    role: material.role || "unspecified",
    rrid: material.rrid || "",
    lot: material.lot || "",
    source: material.source || "",
    species: material.species || material.organism || "",
    claimedOrganism: material.claimedOrganism || "",
    target: material.target || "",
    assayTargets: Array.isArray(material.assayTargets) ? material.assayTargets : [],
    validationEvidence: Array.isArray(material.validationEvidence) ? material.validationEvidence : [],
    validationDate: material.validationDate || "",
    contaminationStatus: material.contaminationStatus || "",
    passageRange: material.passageRange || null,
    reportedPassage: material.reportedPassage,
    metadata: material.metadata || {}
  };
}

function normalizeAssay(assay) {
  return {
    name: assay.name || "unnamed assay",
    materialName: assay.materialName || assay.material || "",
    organism: assay.organism || assay.species || "",
    target: assay.target || "",
    readout: assay.readout || ""
  };
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled research packet",
    domain: packet.domain || "life sciences",
    reviewDate: packet.reviewDate || "2026-08-15",
    materials: Array.isArray(packet.materials) ? packet.materials.map(normalizeMaterial) : [],
    assays: Array.isArray(packet.assays) ? packet.assays.map(normalizeAssay) : [],
    manuscriptClaims: Array.isArray(packet.manuscriptClaims) ? packet.manuscriptClaims : []
  };
}

function validRrid(value) {
  return /^RRID:[A-Za-z0-9_:-]+$/.test(String(value || "").trim());
}

function parseDate(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

function daysBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function sameConcept(left, right) {
  if (!left || !right) return true;
  return normalizeText(left) === normalizeText(right);
}

function materialMatchesAssay(material, assay) {
  return normalizeText(material.name) === normalizeText(assay.materialName);
}

function assaysForMaterial(material, assays) {
  return assays.filter((assay) => materialMatchesAssay(material, assay));
}

function analyzePassageRange(material) {
  const findings = [];
  const range = material.passageRange;
  if (!range) return findings;

  const min = Number(range.min);
  const max = Number(range.max);
  const reported = material.reportedPassage === undefined ? null : Number(material.reportedPassage);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min || max > 250) {
    findings.push(finding(
      "IMPOSSIBLE_PASSAGE_RANGE",
      "critical",
      "The packet reports an impossible or biologically implausible passage range.",
      { material: material.name, passageRange: range },
      "Correct the passage metadata and provide source authentication records before the assistant releases the review."
    ));
    return findings;
  }

  if (reported !== null && (!Number.isFinite(reported) || reported < min || reported > max)) {
    findings.push(finding(
      "PASSAGE_OUTSIDE_VALIDATED_RANGE",
      "major",
      "The reported passage is outside the validated passage range for this material.",
      { material: material.name, passageRange: range, reportedPassage: material.reportedPassage },
      "Provide validation evidence for the reported passage or repeat the assay using a validated passage."
    ));
  }

  return findings;
}

function analyzeMaterial(material, assays, reviewDate) {
  const findings = [];
  const linkedAssays = assaysForMaterial(material, assays);

  if (TRACKED_MATERIAL_TYPES.has(material.type) && !validRrid(material.rrid)) {
    findings.push(finding(
      "MISSING_OR_INVALID_RRID",
      material.type === "reagent" ? "minor" : "major",
      "A tracked research material is missing a valid RRID-style identifier.",
      { material: material.name, type: material.type, rrid: material.rrid || null },
      "Add the RRID or equivalent registry identifier used for the exact material instance."
    ));
  }

  if ((material.type === "antibody" || material.type === "reagent") && !material.lot) {
    findings.push(finding(
      "MISSING_LOT_IDENTIFIER",
      "minor",
      "A lot-sensitive material is missing lot or batch information.",
      { material: material.name, type: material.type },
      "Add lot, batch, clone, or catalog metadata so reviewers can trace the exact material."
    ));
  }

  if (TRACKED_MATERIAL_TYPES.has(material.type) && material.validationEvidence.length === 0) {
    findings.push(finding(
      "MISSING_VALIDATION_EVIDENCE",
      "major",
      "The packet does not include validation evidence for a tracked material.",
      { material: material.name, type: material.type },
      "Attach identity, specificity, genotype, certificate-of-analysis, or orthogonal validation evidence."
    ));
  }

  const review = parseDate(reviewDate);
  const validation = parseDate(material.validationDate);
  if (!validation) {
    findings.push(finding(
      "MISSING_VALIDATION_DATE",
      "major",
      "The packet does not provide a parseable validation date.",
      { material: material.name, validationDate: material.validationDate || null },
      "Provide the date of the latest identity or specificity validation."
    ));
  } else if (review && daysBetween(validation, review) > STALE_VALIDATION_DAYS) {
    findings.push(finding(
      "STALE_VALIDATION_DATE",
      "major",
      "The latest validation evidence is older than the configured freshness window.",
      { material: material.name, validationDate: material.validationDate, staleAfterDays: STALE_VALIDATION_DAYS },
      "Refresh material authentication or justify why the prior validation still applies."
    ));
  }

  const contamination = normalizeText(material.contaminationStatus);
  if (material.type === "cell_line" || material.type === "primary_cell") {
    if (CONTAMINATION_ALERT_VALUES.has(contamination)) {
      findings.push(finding(
        "CONTAMINATED_CELL_MATERIAL",
        "critical",
        "A cell-derived material is marked contaminated or contamination-positive.",
        { material: material.name, contaminationStatus: material.contaminationStatus },
        "Hold release until the assay is repeated with a contamination-negative authenticated material."
      ));
    } else if (!CLEAN_CONTAMINATION_VALUES.has(contamination)) {
      findings.push(finding(
        "CONTAMINATION_STATUS_UNVERIFIED",
        "major",
        "A cell-derived material lacks a clear contamination-negative status.",
        { material: material.name, contaminationStatus: material.contaminationStatus || null },
        "Add recent mycoplasma and contamination testing before releasing the review."
      ));
    }
  }

  if (material.species && material.claimedOrganism && !sameConcept(material.species, material.claimedOrganism)) {
    findings.push(finding(
      "MATERIAL_CLAIM_ORGANISM_MISMATCH",
      "major",
      "The material species does not match the organism claimed in the manuscript packet.",
      { material: material.name, species: material.species, claimedOrganism: material.claimedOrganism },
      "Correct the claimed organism or provide a cross-species rationale and validation evidence."
    ));
  }

  for (const assay of linkedAssays) {
    if (material.species && assay.organism && !sameConcept(material.species, assay.organism)) {
      findings.push(finding(
        "ASSAY_ORGANISM_MISMATCH",
        "major",
        "The material species does not match the organism declared for the linked assay.",
        { material: material.name, materialSpecies: material.species, assay: assay.name, assayOrganism: assay.organism },
        "Route the packet for reviewer confirmation or correct the assay-material mapping."
      ));
    }

    if (material.type === "antibody" && material.target && assay.target && !sameConcept(material.target, assay.target)) {
      findings.push(finding(
        "ANTIBODY_TARGET_MISMATCH",
        "critical",
        "The antibody target does not match the target measured by the linked assay.",
        { material: material.name, antibodyTarget: material.target, assay: assay.name, assayTarget: assay.target },
        "Hold release until the antibody, assay target, or interpretation is corrected and revalidated."
      ));
    }

    if (material.assayTargets.length > 0 && assay.target) {
      const allowed = material.assayTargets.map(normalizeText);
      if (!allowed.includes(normalizeText(assay.target))) {
        findings.push(finding(
          "ASSAY_TARGET_NOT_VALIDATED_FOR_MATERIAL",
          "major",
          "The assay target is outside the target set validated for this material.",
          { material: material.name, assay: assay.name, assayTarget: assay.target, validatedTargets: material.assayTargets },
          "Add target-specific validation evidence or remap the assay to an authenticated material."
        ));
      }
    }
  }

  findings.push(...analyzePassageRange(material));
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
  return Math.max(0.1, Number((0.96 - penalty * 0.07).toFixed(2)));
}

function reviewerNote(packet, decision, findings) {
  if (decision === "RELEASE") {
    return `${packet.domain}: materials are traceable, authenticated, and aligned with linked assays.`;
  }
  const first = findings[0];
  return `${packet.domain}: ${decision} before release because ${first.message.toLowerCase()}`;
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const reviewDate = packet.reviewDate;
  const findings = [];

  if (packet.materials.length === 0) {
    findings.push(finding(
      "NO_MATERIALS_LISTED",
      "major",
      "The packet contains no research materials to authenticate.",
      { materialCount: 0 },
      "Add a materials table with identifiers, source, validation, and assay mappings."
    ));
  }

  for (const material of packet.materials) {
    findings.push(...analyzeMaterial(material, packet.assays, reviewDate));
  }

  const decision = decisionFromFindings(findings);
  return {
    id: packet.id,
    title: packet.title,
    domain: packet.domain,
    decision,
    confidence: confidenceFromFindings(findings),
    materialCount: packet.materials.length,
    assayCount: packet.assays.length,
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
  TRACKED_MATERIAL_TYPES,
  STALE_VALIDATION_DAYS,
  analyzePacket,
  analyzePackets,
  validRrid
};
