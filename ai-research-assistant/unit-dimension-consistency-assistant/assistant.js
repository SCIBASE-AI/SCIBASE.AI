"use strict";

const UNIT_REGISTRY = {
  mg: { dimension: "mass", toBase: 1 },
  g: { dimension: "mass", toBase: 1000 },
  ug: { dimension: "mass", toBase: 0.001 },
  ml: { dimension: "volume", toBase: 1 },
  l: { dimension: "volume", toBase: 1000 },
  hour: { dimension: "time", toBase: 1 },
  minute: { dimension: "time", toBase: 1 / 60 },
  day: { dimension: "time", toBase: 24 },
  percent: { dimension: "ratio", toBase: 1 },
  ratio: { dimension: "ratio", toBase: 1 },
  "mg/kg": { dimension: "dose_per_mass", toBase: 1 },
  "ug/g": { dimension: "dose_per_mass", toBase: 1 },
  "mg/ml": { dimension: "concentration", toBase: 1 },
  "ug/ml": { dimension: "concentration", toBase: 0.001 },
  "cells/ml": { dimension: "cell_density", toBase: 1 },
  "cells/ul": { dimension: "cell_density", toBase: 1000 },
  "events/hour": { dimension: "event_rate", toBase: 1 },
  "events/day": { dimension: "event_rate", toBase: 1 / 24 },
};

function reviewMeasurements(packets) {
  return packets.map(reviewPacket);
}

function reviewPacket(packet) {
  const findings = [];
  for (const claim of packet.claims) {
    const evidence = claim.evidenceIds.map((id) => packet.measurements.find((item) => item.id === id));
    if (evidence.some((item) => !item)) {
      findings.push(finding(claim, "missing_evidence", "high", "Claim references a missing measurement."));
      continue;
    }
    findings.push(...reviewClaimEvidence(claim, evidence));
  }

  return {
    manuscriptId: packet.manuscriptId,
    title: packet.title,
    decision: findings.some((item) => item.severity === "high") ? "hold" : "ready",
    findings,
    summary: summarizeFindings(findings),
  };
}

function reviewClaimEvidence(claim, evidence) {
  const findings = [];
  const units = evidence.map((item) => resolveUnit(item.unit));
  const dimensions = new Set(units.map((unit) => unit.dimension));

  if (dimensions.size > 1 && !claim.allowMixedDimensions) {
    findings.push(
      finding(
        claim,
        "incompatible_dimensions",
        "high",
        `Claim compares ${Array.from(dimensions).join(", ")} measurements without a conversion model.`,
      ),
    );
  }

  for (const item of evidence) {
    const unit = resolveUnit(item.unit);
    if (claim.expectedDimension && unit.dimension !== claim.expectedDimension) {
      findings.push(
        finding(
          claim,
          "unexpected_dimension",
          "high",
          `${item.id} uses ${unit.dimension}, but the claim expects ${claim.expectedDimension}.`,
        ),
      );
    }
    if (claim.requiredBasis && !item.basis?.includes(claim.requiredBasis)) {
      findings.push(
        finding(
          claim,
          "missing_normalization_basis",
          "high",
          `${item.id} is missing required ${claim.requiredBasis} normalization evidence.`,
        ),
      );
    }
  }

  if (claim.rateDenominator) {
    for (const item of evidence) {
      const denominator = item.unit.split("/")[1] ?? null;
      if (denominator && denominator !== claim.rateDenominator) {
        findings.push(
          finding(
            claim,
            "rate_denominator_mismatch",
            "high",
            `${item.id} is normalized per ${denominator}, but the claim is per ${claim.rateDenominator}.`,
          ),
        );
      }
    }
  }

  if (claim.derivedFoldChange) {
    const [first, second] = evidence;
    if (first && second) {
      const observed = convertToBase(second) / convertToBase(first);
      const roundedObserved = Number(observed.toFixed(2));
      const delta = Math.abs(roundedObserved - claim.derivedFoldChange.value);
      if (delta > claim.derivedFoldChange.tolerance) {
        findings.push(
          finding(
            claim,
            "derived_value_mismatch",
            "high",
            `Claim reports ${claim.derivedFoldChange.value}x, but evidence supports ${roundedObserved}x.`,
          ),
        );
      }
      if (claim.derivedFoldChange.significantDigits > 3) {
        findings.push(
          finding(
            claim,
            "over_precise_derived_claim",
            "medium",
            "Derived fold change uses more significant digits than the source measurements justify.",
          ),
        );
      }
    }
  }

  return findings;
}

function resolveUnit(unit) {
  const resolved = UNIT_REGISTRY[unit];
  if (!resolved) {
    throw new Error(`Unsupported unit: ${unit}`);
  }
  return resolved;
}

function convertToBase(measurement) {
  const unit = resolveUnit(measurement.unit);
  return measurement.value * unit.toBase;
}

function finding(claim, code, severity, message) {
  return {
    claimId: claim.id,
    code,
    severity,
    message,
    action: actionFor(code),
  };
}

function actionFor(code) {
  const actions = {
    missing_evidence: "Attach the source measurement or remove the unsupported claim.",
    incompatible_dimensions: "Add a validated conversion model or split the claim by dimension.",
    unexpected_dimension: "Correct the unit or rewrite the claim to match the measured dimension.",
    missing_normalization_basis: "Add the missing normalization basis before review.",
    rate_denominator_mismatch: "Normalize all evidence to the same denominator.",
    derived_value_mismatch: "Recalculate the derived result from source measurements.",
    over_precise_derived_claim: "Round the claim to precision supported by source measurements.",
  };
  return actions[code] ?? "Review the measurement packet.";
}

function summarizeFindings(findings) {
  return findings.reduce(
    (summary, item) => {
      summary.total += 1;
      summary[item.severity] += 1;
      return summary;
    },
    { total: 0, high: 0, medium: 0, low: 0 },
  );
}

function summarizeReports(reports) {
  return reports.reduce(
    (summary, report) => {
      summary.total += 1;
      summary[report.decision] += 1;
      summary.highFindings += report.summary.high;
      summary.mediumFindings += report.summary.medium;
      return summary;
    },
    { total: 0, ready: 0, hold: 0, highFindings: 0, mediumFindings: 0 },
  );
}

module.exports = {
  reviewMeasurements,
  reviewPacket,
  summarizeReports,
};
