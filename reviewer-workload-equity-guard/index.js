const SEVERITY_WEIGHTS = {
  critical: 34,
  high: 20,
  medium: 10,
  low: 4
};

function daysBetween(a, b) {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Math.floor((right - left) / (24 * 60 * 60 * 1000));
}

function isValidDate(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(new Date(value).getTime());
}

function addFinding(findings, severity, rule, message, action, refs = []) {
  findings.push({ severity, rule, message, action, refs });
}

function isDateWithinWindow(date, window) {
  const value = new Date(date).getTime();
  return value >= new Date(window.startsAt).getTime() && value <= new Date(window.endsAt).getTime();
}

function findReviewer(project, reviewerId) {
  return project.reviewers.find((reviewer) => reviewer.id === reviewerId);
}

function validateEvidenceIntegrity(project, findings) {
  if (!isValidDate(project.asOfDate)) {
    addFinding(
      findings,
      "critical",
      "as-of-date-invalid",
      "The workload packet has no valid as-of date.",
      "Block scoring until the packet has a valid review timestamp.",
      [String(project.asOfDate)]
    );
    return;
  }

  const asOfTime = new Date(project.asOfDate).getTime();
  const seenReviewerIds = new Set();
  for (const reviewer of project.reviewers) {
    if (seenReviewerIds.has(reviewer.id)) {
      addFinding(
        findings,
        "critical",
        "reviewer-id-duplicate",
        `Reviewer identifier ${reviewer.id} appears more than once.`,
        "Resolve reviewer identity ambiguity before assigning or scoring reviews.",
        [reviewer.id]
      );
    }
    seenReviewerIds.add(reviewer.id);

    for (const field of ["lastCompletedReviewAt", "optOutUntil"]) {
      if (reviewer[field] && !isValidDate(reviewer[field])) {
        addFinding(
          findings,
          "critical",
          "reviewer-date-invalid",
          `${reviewer.id} has an invalid ${field} value.`,
          "Repair the reviewer availability evidence before reputation scoring.",
          [reviewer.id, field, String(reviewer[field])]
        );
      }
    }

    for (const window of reviewer.unavailableWindows) {
      if (!isValidDate(window.startsAt) || !isValidDate(window.endsAt)) {
        addFinding(
          findings,
          "critical",
          "unavailable-window-invalid",
          `${reviewer.id} has an unavailable window with an invalid boundary.`,
          "Repair the availability window before assigning or scoring reviews.",
          [reviewer.id, String(window.startsAt), String(window.endsAt)]
        );
      } else if (new Date(window.startsAt).getTime() > new Date(window.endsAt).getTime()) {
        addFinding(
          findings,
          "critical",
          "unavailable-window-reversed",
          `${reviewer.id} has an unavailable window whose start follows its end.`,
          "Correct the window chronology before assigning or scoring reviews.",
          [reviewer.id, window.startsAt, window.endsAt]
        );
      }
    }
  }

  const seenAssignmentIds = new Set();
  for (const assignment of project.pendingAssignments) {
    if (seenAssignmentIds.has(assignment.id)) {
      addFinding(
        findings,
        "critical",
        "assignment-id-duplicate",
        `Pending assignment identifier ${assignment.id} appears more than once.`,
        "Resolve assignment identity ambiguity before reputation scoring.",
        [assignment.id]
      );
    }
    seenAssignmentIds.add(assignment.id);
    if (!isValidDate(assignment.dueDate)) {
      addFinding(
        findings,
        "critical",
        "assignment-due-date-invalid",
        `${assignment.id} has no valid due date.`,
        "Repair the assignment deadline before workload or late-penalty scoring.",
        [assignment.id, String(assignment.dueDate)]
      );
    }
  }

  const seenHistoryIds = new Set();
  for (const item of project.recentAssignmentHistory) {
    if (seenHistoryIds.has(item.id)) {
      addFinding(
        findings,
        "critical",
        "history-id-duplicate",
        `Assignment-history identifier ${item.id} appears more than once.`,
        "Deduplicate assignment history before calculating workload concentration.",
        [item.id]
      );
    }
    seenHistoryIds.add(item.id);
    if (!isValidDate(item.assignedAt)) {
      addFinding(
        findings,
        "critical",
        "history-date-invalid",
        `${item.id} has no valid assignment timestamp.`,
        "Repair or quarantine the history item before calculating workload concentration.",
        [item.id, String(item.assignedAt)]
      );
    } else if (new Date(item.assignedAt).getTime() > asOfTime) {
      addFinding(
        findings,
        "critical",
        "history-date-in-future",
        `${item.id} is dated after the packet as-of date.`,
        "Quarantine future-dated history before calculating workload concentration.",
        [item.id, item.assignedAt, project.asOfDate]
      );
    }
  }
}

function workloadAfterAssignment(reviewer, assignment) {
  return {
    openReviews: reviewer.openReviewIds.length + 1,
    weeklyReviewHours: reviewer.recentReviewHours + assignment.estimatedHours
  };
}

function assignmentRiskReasons(project, reviewer, assignment) {
  const reasons = [];
  const projected = workloadAfterAssignment(reviewer, assignment);

  if (projected.openReviews > project.policy.maxOpenReviews) {
    reasons.push("over_capacity");
  }
  if (projected.weeklyReviewHours > Math.min(project.policy.maxWeeklyReviewHours, reviewer.weeklyCapacityHours)) {
    reasons.push("weekly_hours_exceeded");
  }
  if (!project.policy.acceptedAvailabilityStatuses.includes(reviewer.availabilityStatus)) {
    reasons.push("unavailable");
  }
  if (reviewer.optOutUntil && daysBetween(project.asOfDate, reviewer.optOutUntil) >= 0) {
    reasons.push("opted_out");
  }
  if (reviewer.lastCompletedReviewAt && daysBetween(reviewer.lastCompletedReviewAt, project.asOfDate) < project.policy.minimumRestDays) {
    reasons.push("rest_window");
  }
  if (reviewer.unavailableWindows.some((window) => isDateWithinWindow(assignment.dueDate, window))) {
    reasons.push("due_during_unavailable_window");
  }
  if (!reviewer.expertise.includes(assignment.topic)) {
    reasons.push("expertise_mismatch");
  }

  return reasons;
}

function buildAssignmentDecision(project, reviewer, assignment, reasons) {
  const protectedReasons = reasons.filter((reason) => project.policy.protectedPenaltyReasons.includes(reason));
  if (protectedReasons.length > 0) {
    return {
      assignmentId: assignment.id,
      reviewerId: reviewer.id,
      decision: "suppress-negative-reputation-delta",
      protectedReasons,
      allowedCompletionDelta: assignment.reputationDelta.completion,
      blockedDeclineDelta: assignment.reputationDelta.decline,
      blockedLateDelta: assignment.reputationDelta.late
    };
  }

  if (reasons.includes("weekly_hours_exceeded") || reasons.includes("due_during_unavailable_window")) {
    return {
      assignmentId: assignment.id,
      reviewerId: reviewer.id,
      decision: "steward-review-before-scoring",
      protectedReasons: reasons,
      allowedCompletionDelta: 0,
      blockedDeclineDelta: assignment.reputationDelta.decline,
      blockedLateDelta: assignment.reputationDelta.late
    };
  }

  if (reasons.includes("expertise_mismatch")) {
    return {
      assignmentId: assignment.id,
      reviewerId: reviewer.id,
      decision: "reassign-or-add-mentor-before-scoring",
      protectedReasons: reasons,
      allowedCompletionDelta: 0,
      blockedDeclineDelta: assignment.reputationDelta.decline,
      blockedLateDelta: assignment.reputationDelta.late
    };
  }

  return {
    assignmentId: assignment.id,
    reviewerId: reviewer.id,
    decision: "score-normally",
    protectedReasons: [],
    allowedCompletionDelta: assignment.reputationDelta.completion,
    blockedDeclineDelta: 0,
    blockedLateDelta: 0
  };
}

function concentrationSummary(project) {
  const recent = project.recentAssignmentHistory.filter(
    (item) => {
      const ageDays = daysBetween(item.assignedAt, project.asOfDate);
      return Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= project.policy.concentrationWindowDays;
    }
  );
  const byReviewer = recent.reduce((summary, item) => {
    summary[item.reviewerId] = (summary[item.reviewerId] || 0) + 1;
    return summary;
  }, {});
  const total = recent.length || 1;
  const entries = Object.entries(byReviewer).map(([reviewerId, count]) => ({
    reviewerId,
    count,
    ratio: count / total
  }));
  entries.sort((a, b) => b.ratio - a.ratio);
  return { total: recent.length, entries };
}

function evaluateWorkloadEquity(project) {
  const findings = [];
  const decisions = [];

  validateEvidenceIntegrity(project, findings);

  for (const assignment of project.pendingAssignments) {
    const reviewer = findReviewer(project, assignment.reviewerId);
    if (!reviewer) {
      addFinding(
        findings,
        "critical",
        "assignment-reviewer-missing",
        `Assignment ${assignment.id} references missing reviewer ${assignment.reviewerId}.`,
        "Block reputation scoring until the assignment is repaired or removed.",
        [assignment.id, assignment.reviewerId]
      );
      continue;
    }

    const projected = workloadAfterAssignment(reviewer, assignment);
    const reasons = assignmentRiskReasons(project, reviewer, assignment);
    decisions.push(buildAssignmentDecision(project, reviewer, assignment, reasons));

    if (projected.openReviews > project.policy.maxOpenReviews) {
      addFinding(
        findings,
        "high",
        "open-review-load-exceeded",
        `${reviewer.displayName} would hold ${projected.openReviews} open reviews after ${assignment.id}.`,
        "Reassign or queue the request before applying reputation penalties or leaderboard effects.",
        [reviewer.id, assignment.id]
      );
    }

    if (projected.weeklyReviewHours > Math.min(project.policy.maxWeeklyReviewHours, reviewer.weeklyCapacityHours)) {
      addFinding(
        findings,
        "high",
        "weekly-review-hour-budget-exceeded",
        `${reviewer.displayName} would reach ${projected.weeklyReviewHours} review hours this week.`,
        "Suppress negative reputation deltas and route the request to a reviewer with available capacity.",
        [reviewer.id, assignment.id]
      );
    }

    if (!project.policy.acceptedAvailabilityStatuses.includes(reviewer.availabilityStatus)) {
      addFinding(
        findings,
        "critical",
        "reviewer-unavailable-but-penalized",
        `${reviewer.displayName} is ${reviewer.availabilityStatus} but ${assignment.id} still carries decline and late penalties.`,
        "Block decline/late reputation penalties while the reviewer is unavailable.",
        [reviewer.id, assignment.id]
      );
    }

    if (reviewer.optOutUntil && daysBetween(project.asOfDate, reviewer.optOutUntil) >= 0) {
      addFinding(
        findings,
        "critical",
        "reviewer-opt-out-active",
        `${reviewer.displayName} has opted out until ${reviewer.optOutUntil}.`,
        "Do not assign reputation-affecting reviews until the opt-out expires.",
        [reviewer.id, assignment.id, reviewer.optOutUntil]
      );
    }

    if (reviewer.lastCompletedReviewAt && daysBetween(reviewer.lastCompletedReviewAt, project.asOfDate) < project.policy.minimumRestDays) {
      addFinding(
        findings,
        "medium",
        "reviewer-rest-window-too-short",
        `${reviewer.displayName} completed a review on ${reviewer.lastCompletedReviewAt}.`,
        "Defer the new request or remove negative reputation effects until the rest window is met.",
        [reviewer.id, assignment.id]
      );
    }

    if (reviewer.unavailableWindows.some((window) => isDateWithinWindow(assignment.dueDate, window))) {
      addFinding(
        findings,
        "high",
        "assignment-due-during-unavailable-window",
        `${assignment.id} is due while ${reviewer.displayName} is unavailable.`,
        "Move the due date or reassign before the review can change reputation points.",
        [reviewer.id, assignment.id, assignment.dueDate]
      );
    }

    if (!reviewer.expertise.includes(assignment.topic)) {
      addFinding(
        findings,
        reviewer.trustTier === "early-career" ? "high" : "medium",
        "reviewer-expertise-mismatch",
        `${assignment.id} topic ${assignment.topic} is outside ${reviewer.displayName}'s declared expertise.`,
        "Add a mentor, reassign the review, or prevent reputation penalties from mismatched work.",
        [reviewer.id, assignment.id, assignment.topic]
      );
    }

    if (reviewer.trustTier === "early-career" && (assignment.reputationDelta.decline < -4 || assignment.reputationDelta.late < -6)) {
      addFinding(
        findings,
        "medium",
        "early-career-reviewer-high-penalty-risk",
        `${assignment.id} applies high negative deltas to an early-career reviewer.`,
        "Route the assignment through mentor review before applying profile or leaderboard penalties.",
        [reviewer.id, assignment.id]
      );
    }
  }

  const concentration = concentrationSummary(project);
  const top = concentration.entries[0];
  if (top && top.ratio > project.policy.maxReviewerConcentrationRatio) {
    addFinding(
      findings,
      "medium",
      "review-credit-concentration-too-high",
      `${top.reviewerId} received ${Math.round(top.ratio * 100)}% of recent review credit.`,
      "Spread review opportunities before awarding additional leaderboard-affecting points.",
      [top.reviewerId]
    );
  }

  const severitySummary = findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + SEVERITY_WEIGHTS[finding.severity], 0));

  return { findings, decisions, concentration, severitySummary, score };
}

function decisionFromEvaluation(evaluation) {
  if (evaluation.severitySummary.critical > 0) {
    return "block-reputation-scoring-until-workload-is-fair";
  }
  if (evaluation.severitySummary.high > 0 || evaluation.score < 75) {
    return "hold-leaderboard-and-profile-deltas-for-steward-review";
  }
  if (evaluation.score < 90) {
    return "manual-equity-review-before-scoring";
  }
  return "workload-equity-ready";
}

function buildReviewPacket(project) {
  const evaluation = evaluateWorkloadEquity(project);
  return {
    guard: "reviewer-workload-equity-guard",
    issue: "SCIBASE-AI/SCIBASE.AI#15",
    asOfDate: project.asOfDate,
    decision: decisionFromEvaluation(evaluation),
    score: evaluation.score,
    severitySummary: evaluation.severitySummary,
    findings: evaluation.findings,
    assignmentDecisions: evaluation.decisions,
    concentration: evaluation.concentration,
    safety: [
      "Synthetic reviewer, assignment, availability, and reputation data only",
      "No profile writes, leaderboard writes, identity calls, email calls, or external review system calls",
      "No private reviewer identities, credentials, moderation records, or live reputation mutations"
    ]
  };
}

function renderMarkdownReport(packet) {
  const lines = [
    "# Reviewer Workload Equity Guard",
    "",
    `Issue: ${packet.issue}`,
    `Decision: ${packet.decision}`,
    `Score: ${packet.score}`,
    "",
    "## Severity Summary",
    "",
    "| Severity | Count |",
    "| --- | ---: |"
  ];

  for (const severity of ["critical", "high", "medium", "low"]) {
    lines.push(`| ${severity} | ${packet.severitySummary[severity]} |`);
  }

  lines.push("", "## Assignment Decisions", "");
  for (const decision of packet.assignmentDecisions) {
    lines.push(`- ${decision.assignmentId}: ${decision.decision}`);
    if (decision.protectedReasons.length > 0) {
      lines.push(`  - Protected reasons: ${decision.protectedReasons.join(", ")}`);
    }
  }

  lines.push("", "## Findings", "");
  for (const finding of packet.findings) {
    lines.push(`- **${finding.severity} / ${finding.rule}**: ${finding.message}`);
    lines.push(`  - Action: ${finding.action}`);
    lines.push(`  - Refs: ${finding.refs.join(", ") || "none"}`);
  }

  lines.push("", "## Safety", "");
  for (const item of packet.safety) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const scoreWidth = Math.max(44, Math.min(760, packet.score * 7.6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Reviewer workload equity guard summary">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="66" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Reviewer Workload Equity Guard</text>
  <text x="48" y="104" font-family="Arial" font-size="18" fill="#475569">SCIBASE #15 reputation scoring fairness checkpoint</text>
  <rect x="48" y="142" width="864" height="94" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="181" font-family="Arial" font-size="21" font-weight="700" fill="#b91c1c">${packet.decision}</text>
  <text x="76" y="213" font-family="Arial" font-size="17" fill="#334155">Critical ${packet.severitySummary.critical} | High ${packet.severitySummary.high} | Findings ${packet.findings.length}</text>
  <rect x="48" y="274" width="864" height="76" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="307" font-family="Arial" font-size="18" fill="#334155">Equity score</text>
  <rect x="76" y="324" width="760" height="14" rx="7" fill="#e5e7eb"/>
  <rect x="76" y="324" width="${scoreWidth}" height="14" rx="7" fill="#0f766e"/>
  <text x="852" y="339" font-family="Arial" font-size="16" text-anchor="end" fill="#111827">${packet.score}/100</text>
  <rect x="48" y="390" width="864" height="76" rx="8" fill="#ecfdf5" stroke="#86efac"/>
  <text x="76" y="423" font-family="Arial" font-size="18" font-weight="700" fill="#166534">Suppress unfair negative deltas</text>
  <text x="76" y="451" font-family="Arial" font-size="16" fill="#166534">Checks capacity, opt-outs, rest windows, availability, expertise, and credit concentration before scoring.</text>
</svg>
`;
}

module.exports = {
  assignmentRiskReasons,
  buildReviewPacket,
  decisionFromEvaluation,
  evaluateWorkloadEquity,
  renderMarkdownReport,
  renderSvgSummary
};
