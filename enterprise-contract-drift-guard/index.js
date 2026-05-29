function classifyChange(beforeType, afterType) {
  if (beforeType === afterType) return "compatible";
  if (!afterType) return "removed-field";
  if (!beforeType) return "added-field";
  if (beforeType.startsWith("enum:") && afterType.startsWith("enum:")) {
    const beforeValues = beforeType.slice(5).split("|");
    const afterValues = afterType.slice(5).split("|");
    return beforeValues.every((value) => afterValues.includes(value))
      ? "enum-expanded"
      : "enum-narrowed";
  }
  return "type-changed";
}

function evaluateContract(contract) {
  const fields = new Set([
    ...Object.keys(contract.currentSchema),
    ...Object.keys(contract.proposedSchema)
  ]);
  const findings = [];

  for (const field of fields) {
    const change = classifyChange(contract.currentSchema[field], contract.proposedSchema[field]);
    if (change === "compatible" || change === "added-field") continue;
    findings.push({
      field,
      type: change,
      current: contract.currentSchema[field] || null,
      proposed: contract.proposedSchema[field] || null,
      severity: change === "removed-field" || change === "type-changed" ? "high" : "medium"
    });
  }

  for (const field of contract.requiredFields) {
    if (!contract.proposedSchema[field]) {
      findings.push({
        field,
        type: "missing-required-field",
        severity: "critical",
        current: contract.currentSchema[field] || null,
        proposed: null
      });
    }
  }

  if (contract.deprecationDays < 90) {
    findings.push({
      field: "deprecationDays",
      type: "short-deprecation-window",
      severity: "medium",
      current: contract.deprecationDays,
      proposed: ">=90"
    });
  }

  if (!contract.payloadPolicy.redactsEmails) {
    findings.push({
      field: "payloadPolicy.redactsEmails",
      type: "pii-redaction-disabled",
      severity: "high",
      current: false,
      proposed: true
    });
  }

  if (contract.payloadPolicy.includesInternalNotes) {
    findings.push({
      field: "payloadPolicy.includesInternalNotes",
      type: "internal-notes-leak-risk",
      severity: "high",
      current: true,
      proposed: false
    });
  }

  const highest = findings.some((finding) => finding.severity === "critical")
    ? "critical"
    : findings.some((finding) => finding.severity === "high")
      ? "high"
      : findings.some((finding) => finding.severity === "medium")
        ? "medium"
        : "clear";

  return {
    id: contract.id,
    system: contract.system,
    owner: contract.owner,
    currentVersion: contract.currentVersion,
    proposedVersion: contract.proposedVersion,
    decision: highest === "clear" ? "approve" : highest === "medium" ? "stage-with-notice" : "hold-release",
    highestSeverity: highest,
    findings,
    remediation: findings.map((finding) => remediationFor(finding, contract))
  };
}

function remediationFor(finding, contract) {
  const actions = {
    "removed-field": `Restore ${finding.field} or publish a compatibility alias for ${contract.consumerPinnedVersion}.`,
    "missing-required-field": `Keep ${finding.field} in the proposed ${contract.system} payload until all consumers migrate.`,
    "type-changed": `Version-gate ${finding.field} and keep the old type available for pinned consumers.`,
    "enum-narrowed": `Do not remove enum values without a documented migration and replay fixture.`,
    "short-deprecation-window": "Extend the deprecation period to at least 90 days for enterprise integrations.",
    "pii-redaction-disabled": "Enable email redaction before exporting review or roster payloads.",
    "internal-notes-leak-risk": "Strip internal notes from outbound institutional payloads."
  };
  return actions[finding.type] || `Review ${finding.field} before release.`;
}

function evaluateContracts(contracts) {
  const reports = contracts.map(evaluateContract);
  return {
    generatedAt: "2026-05-29T00:00:00.000Z",
    totalContracts: reports.length,
    releaseHolds: reports.filter((report) => report.decision === "hold-release").length,
    stagedNotices: reports.filter((report) => report.decision === "stage-with-notice").length,
    approvals: reports.filter((report) => report.decision === "approve").length,
    reports
  };
}

module.exports = { classifyChange, evaluateContract, evaluateContracts };
