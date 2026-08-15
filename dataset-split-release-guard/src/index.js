"use strict";

const REQUIRED_SPLITS = ["train", "validation", "test"];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled split release packet",
    dataset: packet.dataset || {},
    splits: packet.splits || {},
    provenance: packet.provenance || {},
    release: packet.release || {},
    policy: packet.policy || {}
  };
}

function splitNames(packet) {
  return Object.keys(packet.splits || {}).map(normalizeText);
}

function missingRequiredSplits(packet) {
  const present = new Set(splitNames(packet));
  return REQUIRED_SPLITS.filter((name) => !present.has(name));
}

function idsForSplit(packet, splitName, key) {
  return new Set(list(packet.splits[splitName]?.[key]).map(normalizeText).filter(Boolean));
}

function intersect(left, right) {
  return [...left].filter((item) => right.has(item));
}

function pairwiseOverlaps(packet, key) {
  const names = splitNames(packet);
  const overlaps = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = names[i];
      const b = names[j];
      const values = intersect(idsForSplit(packet, a, key), idsForSplit(packet, b, key));
      if (values.length > 0) overlaps.push({ left: a, right: b, key, values });
    }
  }
  return overlaps;
}

function allSplitRecords(packet) {
  return splitNames(packet).reduce((total, name) => total + Number(packet.splits[name]?.recordCount || 0), 0);
}

function hasChecksumCoverage(packet) {
  return splitNames(packet).every((name) => packet.splits[name]?.checksum && packet.splits[name]?.manifestHash);
}

function hasLicenseAccessParity(packet) {
  const licenses = new Set(splitNames(packet).map((name) => normalizeText(packet.splits[name]?.license)).filter(Boolean));
  const access = new Set(splitNames(packet).map((name) => normalizeText(packet.splits[name]?.access)).filter(Boolean));
  return licenses.size <= 1 && access.size <= 1 && licenses.size > 0 && access.size > 0;
}

function classBalanceDrift(packet) {
  const names = splitNames(packet);
  const target = packet.policy.maxClassBalanceDelta ?? 0.15;
  const drifts = [];
  for (const name of names) {
    const balance = packet.splits[name]?.classBalance || {};
    for (const [label, value] of Object.entries(balance)) {
      const expected = Number(packet.dataset.expectedClassBalance?.[label]);
      if (Number.isFinite(expected) && Math.abs(Number(value) - expected) > target) {
        drifts.push({ split: name, label, actual: Number(value), expected, delta: Number(Math.abs(Number(value) - expected).toFixed(3)) });
      }
    }
  }
  return drifts;
}

function embargoViolations(packet) {
  return splitNames(packet).flatMap((name) => {
    const rows = list(packet.splits[name]?.embargoedRecordIds);
    return rows.map((recordId) => ({ split: name, recordId }));
  });
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const findings = [];
  const missing = missingRequiredSplits(packet);
  const recordOverlaps = pairwiseOverlaps(packet, "recordIds");
  const groupOverlaps = pairwiseOverlaps(packet, "groupIds");
  const drifts = classBalanceDrift(packet);
  const embargoed = embargoViolations(packet);

  if (missing.length > 0) {
    findings.push(finding(
      "REQUIRED_SPLIT_MISSING",
      "critical",
      "The release packet lacks one or more required train/validation/test split manifests.",
      { missingSplits: missing },
      "Hold release until all required split manifests are present and checksummed."
    ));
  }

  if (allSplitRecords(packet) !== Number(packet.dataset.recordCount || 0)) {
    findings.push(finding(
      "SPLIT_RECORD_TOTAL_MISMATCH",
      "major",
      "The split record totals do not match the dataset record count.",
      { datasetRecordCount: Number(packet.dataset.recordCount || 0), splitRecordTotal: allSplitRecords(packet) },
      "Reconcile split manifests against the registered dataset row count before release."
    ));
  }

  if (recordOverlaps.length > 0) {
    findings.push(finding(
      "TRAIN_VALIDATION_TEST_RECORD_OVERLAP",
      "critical",
      "One or more records appear in multiple splits.",
      { overlaps: recordOverlaps },
      "Regenerate split manifests with disjoint record identifiers and new manifest hashes."
    ));
  }

  if (groupOverlaps.length > 0 && packet.policy.requireGroupDisjointness !== false) {
    findings.push(finding(
      "GROUP_LEAKAGE_ACROSS_SPLITS",
      "critical",
      "A participant, patient, subject, lab, or other grouping identifier appears across multiple splits.",
      { overlaps: groupOverlaps },
      "Regenerate splits with group-level disjointness to prevent leakage across train/validation/test boundaries."
    ));
  }

  if (packet.provenance.seedLocked !== true || packet.provenance.splitScriptHashPresent !== true) {
    findings.push(finding(
      "SPLIT_PROVENANCE_INCOMPLETE",
      "major",
      "The split generation seed or script hash is missing.",
      {
        seedLocked: packet.provenance.seedLocked || false,
        splitScriptHashPresent: packet.provenance.splitScriptHashPresent || false
      },
      "Attach deterministic seed and split-script hash evidence before DOI/API release."
    ));
  }

  if (!hasChecksumCoverage(packet)) {
    findings.push(finding(
      "SPLIT_CHECKSUM_COVERAGE_MISSING",
      "major",
      "One or more split manifests lack checksum or manifest hash evidence.",
      { splits: splitNames(packet) },
      "Add per-split content checksums and manifest hashes before release."
    ));
  }

  if (!hasLicenseAccessParity(packet)) {
    findings.push(finding(
      "SPLIT_LICENSE_ACCESS_PARITY_MISMATCH",
      "major",
      "Split manifests have inconsistent license or access states.",
      {
        licenses: splitNames(packet).map((name) => ({ split: name, license: packet.splits[name]?.license || null })),
        access: splitNames(packet).map((name) => ({ split: name, access: packet.splits[name]?.access || null }))
      },
      "Align license and access state across splits or document why a split must remain restricted."
    ));
  }

  if (drifts.length > 0) {
    findings.push(finding(
      "STRATIFICATION_BALANCE_DRIFT",
      "major",
      "Class or stratum balance differs from the dataset policy beyond the allowed threshold.",
      { drifts },
      "Regenerate stratified splits or document the imbalance in the release notes."
    ));
  }

  if (embargoed.length > 0) {
    findings.push(finding(
      "EMBARGOED_RECORD_IN_PUBLIC_SPLIT",
      "critical",
      "Embargoed records are present in one or more release split manifests.",
      { embargoedRecords: embargoed },
      "Remove embargoed records or keep the affected split private until embargo restrictions are lifted."
    ));
  }

  if (
    findings.length > 0 &&
    packet.release.publicDoiRelease === true &&
    packet.release.freezePublicRelease !== true
  ) {
    findings.push(finding(
      "PUBLIC_RELEASE_NOT_FROZEN_FOR_SPLIT_RISK",
      "critical",
      "Public DOI/API release is enabled while split-integrity findings remain unresolved.",
      {
        publicDoiRelease: packet.release.publicDoiRelease,
        freezePublicRelease: packet.release.freezePublicRelease || false
      },
      "Freeze DOI/API/public-preview release until split integrity issues are resolved."
    ));
  }

  const decision = decisionFor(findings);
  return {
    id: packet.id,
    title: packet.title,
    decision,
    splitNames: splitNames(packet),
    findings,
    recommendedActions: buildRecommendedActions(decision, findings)
  };
}

function decisionFor(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD_RELEASE";
  if (findings.some((item) => item.severity === "major")) return "REVIEW_RELEASE";
  return "RELEASE";
}

function buildRecommendedActions(decision, findings) {
  if (decision === "RELEASE") {
    return ["Release split manifests with normal artifact provenance."];
  }

  const actions = [
    "Attach findings to the dataset release review packet.",
    "Regenerate split manifests or document curator-approved exceptions.",
    "Re-run checksum, license, access, and stratification checks before DOI/API release."
  ];

  if (findings.some((item) => item.code === "PUBLIC_RELEASE_NOT_FROZEN_FOR_SPLIT_RISK")) {
    actions.unshift("Freeze public DOI/API release and reproducibility badges.");
  }

  return actions;
}

function analyzeSplitReleasePackets(packets) {
  const results = list(packets).map(analyzePacket);
  const counts = results.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, { RELEASE: 0, REVIEW_RELEASE: 0, HOLD_RELEASE: 0 });

  return {
    generatedAt: new Date().toISOString(),
    totalPackets: results.length,
    counts,
    results
  };
}

module.exports = {
  analyzePacket,
  analyzeSplitReleasePackets,
  missingRequiredSplits,
  pairwiseOverlaps,
  classBalanceDrift
};
