const DAY_MS = 24 * 60 * 60 * 1000;

const ROLE_TRAINING = {
  principal_investigator: ["human-subjects", "secure-export", "ai-governance"],
  data_steward: ["secure-export", "ai-governance"],
  external_collaborator: ["human-subjects", "secure-export"]
};

function parseDate(value, field) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${field}: ${value}`);
  }
  return date;
}

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

function buildFinding(code, severity, researcherId, message, remediation) {
  return { code, severity, researcherId, message, remediation };
}

function requiredTrainingFor(researcher, action) {
  const roleRequired = ROLE_TRAINING[researcher.role] || [];
  return Array.from(new Set([...(action.requiredTraining || []), ...roleRequired])).sort();
}

function evaluateResearcher(researcher, action, now) {
  const findings = [];
  const policies = researcher.policies || {};
  const training = researcher.training || {};

  for (const policy of action.requiredPolicies || []) {
    if (!policies[policy]) {
      findings.push(buildFinding(
        "POLICY_ACK_MISSING",
        "block",
        researcher.id,
        `${researcher.id} has not acknowledged required policy ${policy}.`,
        `Collect ${policy} acknowledgement before ${action.type}.`
      ));
      continue;
    }

    const acknowledgedAt = parseDate(policies[policy], `${researcher.id}.${policy}`);
    if (daysBetween(acknowledgedAt, now) > 180) {
      findings.push(buildFinding(
        "POLICY_ACK_STALE",
        "revise",
        researcher.id,
        `${researcher.id} acknowledged ${policy} more than 180 days ago.`,
        `Refresh ${policy} acknowledgement and attach the receipt.`
      ));
    }
  }

  for (const moduleName of requiredTrainingFor(researcher, action)) {
    const record = training[moduleName];
    if (!record) {
      findings.push(buildFinding(
        "TRAINING_MISSING",
        "block",
        researcher.id,
        `${researcher.id} is missing required training ${moduleName}.`,
        `Complete ${moduleName} training before privileged access is released.`
      ));
      continue;
    }

    const expiresAt = parseDate(record.expiresAt, `${researcher.id}.${moduleName}.expiresAt`);
    if (expiresAt < now) {
      findings.push(buildFinding(
        "TRAINING_EXPIRED",
        "block",
        researcher.id,
        `${researcher.id} has expired ${moduleName} training.`,
        `Renew ${moduleName} training and upload a current certificate.`
      ));
    }

    if (!record.receiptId || String(record.receiptId).trim() === "") {
      findings.push(buildFinding(
        "TRAINING_RECEIPT_MISSING",
        "revise",
        researcher.id,
        `${researcher.id} has ${moduleName} completion without evidence receipt.`,
        `Attach a signed receipt for ${moduleName}.`
      ));
    }
  }

  return findings;
}

function summarizeDecision(findings) {
  if (findings.some((item) => item.severity === "block")) {
    return "hold";
  }
  if (findings.some((item) => item.severity === "revise")) {
    return "revise";
  }
  return "release";
}

function evaluateTrainingPolicyPacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new Error("Packet must be an object.");
  }
  if (!packet.action || !Array.isArray(packet.researchers)) {
    throw new Error("Packet requires action and researchers.");
  }

  const now = new Date(packet.generatedAt || Date.now());
  if (Number.isNaN(now.getTime())) {
    throw new Error("generatedAt must be a valid timestamp.");
  }

  const findings = packet.researchers.flatMap((researcher) =>
    evaluateResearcher(researcher, packet.action, now)
  );
  const decision = summarizeDecision(findings);

  return {
    actionId: packet.action.id,
    projectId: packet.action.projectId,
    department: packet.action.department,
    decision,
    checkedResearchers: packet.researchers.length,
    blockerCount: findings.filter((item) => item.severity === "block").length,
    revisionCount: findings.filter((item) => item.severity === "revise").length,
    findings,
    reviewerSummary: decision === "release"
      ? "All required enterprise training and policy acknowledgements are current."
      : "Hold or revise before enterprise export/privileged access continues."
  };
}

module.exports = {
  ROLE_TRAINING,
  evaluateTrainingPolicyPacket,
  requiredTrainingFor,
  summarizeDecision
};
