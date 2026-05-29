function evaluateAssignment(assignment) {
  const findings = [];

  if (assignment.recentCoauthorshipMonths !== null && assignment.recentCoauthorshipMonths <= 24) {
    findings.push({
      type: "recent-coauthorship",
      severity: "high",
      detail: `Coauthorship ${assignment.recentCoauthorshipMonths} months ago requires recusal or independent review.`
    });
  }

  if (assignment.sameInstitution) {
    findings.push({
      type: "same-institution",
      severity: "medium",
      detail: "Evaluator and team share an institution; require disclosure and secondary reviewer."
    });
  }

  if (assignment.sponsorEmployment && assignment.evaluatorRole !== "sponsor-observer") {
    findings.push({
      type: "sponsor-employment",
      severity: "high",
      detail: "Sponsor employee cannot be the sole scoring reviewer for payout decisions."
    });
  }

  if (assignment.financialInterestUsd >= 10000) {
    findings.push({
      type: "material-financial-interest",
      severity: "critical",
      detail: "Material financial interest requires payout decision hold and alternate reviewer."
    });
  }

  if (assignment.competingTeamMembership) {
    findings.push({
      type: "competing-team-membership",
      severity: "critical",
      detail: "Evaluator belongs to a competing team and must be removed from scoring."
    });
  }

  if (assignment.anonymityRequired && assignment.identitySharedWithSponsor) {
    findings.push({
      type: "anonymity-breach",
      severity: "high",
      detail: "Anonymous challenge identity was shared with sponsor before scoring lock."
    });
  }

  const highestSeverity = severityRank(findings);
  return {
    challengeId: assignment.challengeId,
    evaluatorId: assignment.evaluatorId,
    teamId: assignment.teamId,
    decision: decisionFor(highestSeverity),
    highestSeverity,
    findings,
    remediation: remediationFor(findings)
  };
}

function severityRank(findings) {
  const order = ["clear", "low", "medium", "high", "critical"];
  return findings.reduce((highest, finding) => (
    order.indexOf(finding.severity) > order.indexOf(highest) ? finding.severity : highest
  ), "clear");
}

function decisionFor(severity) {
  if (severity === "critical") return "hold-payout-decision";
  if (severity === "high") return "recuse-evaluator";
  if (severity === "medium") return "require-disclosure";
  return "allow-scoring";
}

function remediationFor(findings) {
  if (findings.length === 0) return ["Record no-conflict attestation before scoring lock."];
  return findings.map((finding) => {
    const actions = {
      "recent-coauthorship": "Assign an independent reviewer and record coauthorship disclosure.",
      "same-institution": "Add a secondary external reviewer before sponsor-visible scoring.",
      "sponsor-employment": "Limit sponsor employee to observer notes or require independent scoring.",
      "material-financial-interest": "Hold payout decision until an alternate evaluator signs off.",
      "competing-team-membership": "Remove evaluator from the panel and quarantine prior scores.",
      "anonymity-breach": "Freeze sponsor access, rotate reviewer packet, and log breach review."
    };
    return actions[finding.type] || "Route to bounty administrator.";
  });
}

function evaluateAssignments(assignments) {
  const reports = assignments.map(evaluateAssignment);
  return {
    generatedAt: "2026-05-29T00:00:00.000Z",
    totalAssignments: reports.length,
    payoutHolds: reports.filter((report) => report.decision === "hold-payout-decision").length,
    recusals: reports.filter((report) => report.decision === "recuse-evaluator").length,
    disclosures: reports.filter((report) => report.decision === "require-disclosure").length,
    allowed: reports.filter((report) => report.decision === "allow-scoring").length,
    reports
  };
}

module.exports = { decisionFor, evaluateAssignment, evaluateAssignments, severityRank };
