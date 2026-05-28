const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function hasExplicitTimezone(value) {
  return typeof value === "string" && /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

function parseTime(value, field, issues, context) {
  if (!value || typeof value !== "string") {
    issues.push({
      severity: "critical",
      code: "missing-time",
      field,
      context,
      message: `${field} is missing or not a string.`,
    });
    return Number.NaN;
  }

  if (!hasExplicitTimezone(value)) {
    issues.push({
      severity: "high",
      code: "ambiguous-timezone",
      field,
      context,
      value,
      message: `${field} must include Z or an explicit UTC offset before deadline decisions are made.`,
    });
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    issues.push({
      severity: "critical",
      code: "invalid-time",
      field,
      context,
      value,
      message: `${field} is not parseable as a timestamp.`,
    });
  }

  return parsed;
}

function eligibleTeams(challenge) {
  return (challenge.teams || []).filter((team) => team.eligible !== false);
}

function latestExtensionForCurrentDeadline(challenge, issues) {
  const currentDeadline = challenge.currentDeadline;
  const matching = (challenge.extensionEvents || []).filter((event) => event.newDeadline === currentDeadline);
  if (matching.length === 0) {
    if (challenge.currentDeadline !== challenge.originalDeadline) {
      issues.push({
        severity: "critical",
        code: "missing-extension-event",
        message: "Current deadline differs from the original deadline but no matching extension event exists.",
      });
    }
    return null;
  }

  return matching[matching.length - 1];
}

function evaluateExtension(challenge, originalMs, currentMs, issues, actions) {
  if (!(currentMs > originalMs)) {
    return { extensionRequired: false, valid: true, event: null, noticeCoverage: [] };
  }

  const event = latestExtensionForCurrentDeadline(challenge, issues);
  if (!event) {
    actions.push("Hold arbitration until the deadline change has an approved extension event.");
    return { extensionRequired: true, valid: false, event: null, noticeCoverage: [] };
  }

  const approvedAt = parseTime(event.approvedAt, "extension.approvedAt", issues, event.id);
  const publishedAt = parseTime(event.publishedAt, "extension.publishedAt", issues, event.id);
  const eventDeadlineMs = parseTime(event.newDeadline, "extension.newDeadline", issues, event.id);
  let valid = true;

  if (!event.approvedBy) {
    valid = false;
    issues.push({
      severity: "critical",
      code: "missing-extension-approval",
      context: event.id,
      message: "Deadline extension is missing an approving sponsor, arbiter, or challenge admin.",
    });
  }

  if (event.scope !== "all-eligible-teams") {
    valid = false;
    issues.push({
      severity: "critical",
      code: "private-extension",
      context: event.id,
      message: "Deadline extension is not scoped to all eligible teams.",
    });
  }

  if (approvedAt > originalMs) {
    valid = false;
    issues.push({
      severity: "high",
      code: "retroactive-extension-approval",
      context: event.id,
      message: "Extension was approved after the original cutoff; arbitration needs an explicit fairness review.",
    });
  }

  if (publishedAt > originalMs) {
    valid = false;
    issues.push({
      severity: "high",
      code: "extension-published-after-cutoff",
      context: event.id,
      message: "Extension was published after the original cutoff, so some solvers could have stopped work early.",
    });
  }

  if (eventDeadlineMs !== currentMs) {
    valid = false;
    issues.push({
      severity: "critical",
      code: "deadline-event-mismatch",
      context: event.id,
      message: "Extension event deadline does not match the active challenge deadline.",
    });
  }

  const teams = eligibleTeams(challenge);
  const noticesByTeam = new Map((event.notices || []).map((notice) => [notice.teamId, notice]));
  const noticeCoverage = teams.map((team) => {
    const notice = noticesByTeam.get(team.id);
    if (!notice) {
      valid = false;
      issues.push({
        severity: "critical",
        code: "missing-team-notice",
        context: `${event.id}:${team.id}`,
        message: `${team.name} did not receive the deadline-extension notice.`,
      });
      return { teamId: team.id, status: "missing" };
    }

    const notifiedAt = parseTime(notice.notifiedAt, "notice.notifiedAt", issues, `${event.id}:${team.id}`);
    const visibleDeadlineMs = parseTime(
      notice.visibleDeadline,
      "notice.visibleDeadline",
      issues,
      `${event.id}:${team.id}`,
    );
    const lateByMinutes = Math.max(0, Math.ceil((notifiedAt - publishedAt) / MINUTE_MS));
    const noticeStatus = lateByMinutes > (challenge.noticeSlaMinutes || 60) ? "late" : "on-time";

    if (noticeStatus === "late") {
      valid = false;
      issues.push({
        severity: "high",
        code: "late-team-notice",
        context: `${event.id}:${team.id}`,
        message: `${team.name} received the extension notice ${lateByMinutes} minutes after publication.`,
      });
    }

    if (visibleDeadlineMs !== currentMs) {
      valid = false;
      issues.push({
        severity: "critical",
        code: "inconsistent-visible-deadline",
        context: `${event.id}:${team.id}`,
        message: `${team.name} saw a different deadline than the active challenge deadline.`,
      });
    }

    return {
      teamId: team.id,
      status: noticeStatus,
      lateByMinutes,
    };
  });

  if (!challenge.freezeWindow || !challenge.freezeWindow.originalSnapshotHash) {
    valid = false;
    issues.push({
      severity: "high",
      code: "missing-original-freeze",
      message: "Original evidence freeze snapshot is missing.",
    });
  }

  if (!challenge.freezeWindow || !challenge.freezeWindow.reopenedAt || !challenge.freezeWindow.reopenedSnapshotHash) {
    valid = false;
    issues.push({
      severity: "high",
      code: "missing-extension-freeze-reopen",
      message: "Deadline extension did not create a new freeze snapshot for the extended window.",
    });
  }

  if (!valid) {
    actions.push("Hold award release until every eligible team has equal extension evidence.");
  }

  return { extensionRequired: true, valid, event, noticeCoverage };
}

function evaluateSubmissions(challenge, originalMs, currentMs, extensionValid, issues, actions) {
  return (challenge.submissions || []).map((submission) => {
    const submittedAtMs = parseTime(submission.submittedAt, "submission.submittedAt", issues, submission.id);
    let decision = "accept-original-window";
    let reason = "Submitted before the original cutoff.";

    if (submittedAtMs > currentMs) {
      decision = submission.status === "accepted" ? "hold-accepted-after-current-cutoff" : "reject-late";
      reason = "Submitted after the active challenge cutoff.";
      if (submission.status === "accepted") {
        issues.push({
          severity: "critical",
          code: "accepted-after-current-cutoff",
          context: submission.id,
          message: `${submission.id} was accepted after the current challenge deadline.`,
        });
        actions.push(`Remove ${submission.id} from scoring or run an explicit arbitration exception.`);
      }
    } else if (submittedAtMs > originalMs) {
      if (extensionValid) {
        decision = "accept-valid-extension-window";
        reason = "Submitted after the original cutoff but inside a valid public extension.";
      } else if (submission.status === "accepted") {
        decision = "hold-accepted-under-invalid-extension";
        reason = "Submission used an extension that failed fairness checks.";
        issues.push({
          severity: "critical",
          code: "accepted-under-invalid-extension",
          context: submission.id,
          message: `${submission.id} was accepted after the original cutoff without a valid equal extension.`,
        });
      } else {
        decision = "reject-late";
        reason = "Submitted after the original cutoff and no valid extension applies.";
      }
    }

    return {
      submissionId: submission.id,
      teamId: submission.teamId,
      submittedAt: submission.submittedAt,
      status: submission.status,
      decision,
      reason,
    };
  });
}

function scoreFromIssues(issues) {
  const weights = {
    critical: 35,
    high: 18,
    medium: 8,
    low: 3,
  };
  const deduction = issues.reduce((sum, issue) => sum + (weights[issue.severity] || 5), 0);
  return Math.max(0, 100 - deduction);
}

function decisionFromIssues(issues, submissionDecisions) {
  const hasCritical = issues.some((issue) => issue.severity === "critical");
  const hasHigh = issues.some((issue) => issue.severity === "high");
  const hasRejectableLate = submissionDecisions.some((submission) => submission.decision === "reject-late");

  if (hasCritical) return "hold-arbitration";
  if (hasHigh) return "needs-fairness-review";
  if (hasRejectableLate) return "reject-late-submissions";
  return "clear-for-scoring";
}

function evaluateChallenge(challenge) {
  const issues = [];
  const actions = [];
  const originalMs = parseTime(challenge.originalDeadline, "originalDeadline", issues, challenge.id);
  const currentMs = parseTime(challenge.currentDeadline, "currentDeadline", issues, challenge.id);

  if (currentMs < originalMs) {
    issues.push({
      severity: "critical",
      code: "deadline-shortened",
      message: "Current deadline is earlier than the original deadline.",
    });
    actions.push("Restore the original cutoff or collect explicit consent from all eligible teams.");
  }

  const extension = evaluateExtension(challenge, originalMs, currentMs, issues, actions);
  const submissions = evaluateSubmissions(challenge, originalMs, currentMs, extension.valid, issues, actions);
  const score = scoreFromIssues(issues);
  const decision = decisionFromIssues(issues, submissions);

  if (actions.length === 0 && decision === "clear-for-scoring") {
    actions.push("Proceed to scoring with the normalized current deadline.");
  }

  return {
    challengeId: challenge.id,
    title: challenge.title,
    originalDeadline: challenge.originalDeadline,
    currentDeadline: challenge.currentDeadline,
    decision,
    fairnessScore: score,
    extension,
    submissions,
    issueCounts: issues.reduce((counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      return counts;
    }, {}),
    issues,
    actions: Array.from(new Set(actions)),
  };
}

function evaluateChallenges(challenges) {
  const results = challenges.map(evaluateChallenge);
  const summary = {
    challengeCount: results.length,
    clearForScoring: results.filter((result) => result.decision === "clear-for-scoring").length,
    heldForArbitration: results.filter((result) => result.decision === "hold-arbitration").length,
    needsFairnessReview: results.filter((result) => result.decision === "needs-fairness-review").length,
    rejectLateSubmissionSets: results.filter((result) => result.decision === "reject-late-submissions").length,
    averageFairnessScore: Math.round(results.reduce((sum, result) => sum + result.fairnessScore, 0) / results.length),
  };

  return {
    generatedAt: new Date("2026-05-28T00:00:00Z").toISOString(),
    requirementMap: [
      "Challenge posting portal: validates timeline and extension policy before sponsor changes are published.",
      "Submission engine: classifies original-window, valid-extension, and late submissions deterministically.",
      "Arbitration and reward distribution: holds scoring or award release when deadline fairness evidence is incomplete.",
      "Audit logs: emits reviewer-ready actions, issue codes, and freeze-window expectations.",
    ],
    summary,
    results,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Deadline Fairness Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Challenges reviewed: ${report.summary.challengeCount}`,
    `- Clear for scoring: ${report.summary.clearForScoring}`,
    `- Held for arbitration: ${report.summary.heldForArbitration}`,
    `- Needs fairness review: ${report.summary.needsFairnessReview}`,
    `- Late-submission rejection sets: ${report.summary.rejectLateSubmissionSets}`,
    `- Average fairness score: ${report.summary.averageFairnessScore}`,
    "",
    "## Requirement Map",
    "",
    ...report.requirementMap.map((item) => `- ${item}`),
    "",
    "## Challenge Decisions",
    "",
  ];

  for (const result of report.results) {
    lines.push(`### ${result.title}`);
    lines.push("");
    lines.push(`- Decision: ${result.decision}`);
    lines.push(`- Fairness score: ${result.fairnessScore}`);
    lines.push(`- Original deadline: ${result.originalDeadline}`);
    lines.push(`- Current deadline: ${result.currentDeadline}`);
    lines.push(`- Issues: ${result.issues.length}`);
    for (const action of result.actions) {
      lines.push(`- Action: ${action}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderSvgReport(report) {
  const width = 1120;
  const rowHeight = 92;
  const height = 160 + report.results.length * rowHeight;
  const rows = report.results
    .map((result, index) => {
      const y = 118 + index * rowHeight;
      const barWidth = Math.max(24, Math.round(result.fairnessScore * 5.2));
      const color =
        result.decision === "clear-for-scoring"
          ? "#2f9e44"
          : result.decision === "reject-late-submissions"
            ? "#f08c00"
            : "#d6336c";
      return `
  <g transform="translate(40 ${y})">
    <text x="0" y="0" class="title">${escapeHtml(result.title)}</text>
    <text x="0" y="26" class="meta">Decision: ${escapeHtml(result.decision)} | Issues: ${result.issues.length}</text>
    <rect x="420" y="-18" width="540" height="22" rx="4" fill="#e9ecef"/>
    <rect x="420" y="-18" width="${barWidth}" height="22" rx="4" fill="${color}"/>
    <text x="980" y="0" class="score">${result.fairnessScore}</text>
  </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .page { fill: #f8f9fa; }
    .heading { font: 700 34px Arial, sans-serif; fill: #17202a; }
    .sub { font: 16px Arial, sans-serif; fill: #495057; }
    .title { font: 700 18px Arial, sans-serif; fill: #212529; }
    .meta { font: 14px Arial, sans-serif; fill: #495057; }
    .score { font: 700 18px Arial, sans-serif; fill: #212529; text-anchor: end; }
  </style>
  <rect class="page" width="${width}" height="${height}"/>
  <text x="40" y="54" class="heading">Scientific Bounty Deadline Fairness Guard</text>
  <text x="40" y="84" class="sub">Equal extension notice, explicit timezones, late submission handling, and freeze-window audit checks.</text>
${rows}
</svg>
`;
}

module.exports = {
  evaluateChallenge,
  evaluateChallenges,
  renderMarkdownReport,
  renderSvgReport,
  hasExplicitTimezone,
  HOUR_MS,
};
