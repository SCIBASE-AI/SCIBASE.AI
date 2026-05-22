const SEVERITY_WEIGHTS = {
  critical: 40,
  high: 24,
  medium: 12,
  low: 5
};

function daysBetween(a, b) {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Math.floor((right - left) / (24 * 60 * 60 * 1000));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function domainFromEmail(email) {
  const value = normalizeEmail(email);
  return value.includes("@") ? value.split("@").pop() : "";
}

function addFinding(findings, severity, rule, message, action, exposure = 0, userIds = []) {
  findings.push({
    severity,
    rule,
    message,
    action,
    estimatedExposure: Math.round(exposure * 100) / 100,
    userIds
  });
}

function isDomainApproved(domain, approvals) {
  return approvals.domainApprovals.some((approval) => approval.domain === domain && approval.status === "approved");
}

function hasOverageApproval(seatClass, approvals) {
  return approvals.overageApprovals.some(
    (approval) => approval.seatClass === seatClass && approval.status === "approved"
  );
}

function isTemporaryAccessApproved(user, approvals, asOfDate) {
  const approval = approvals.temporaryAccessApprovals.find((item) => item.userId === user.id);
  if (!approval || approval.status !== "approved") {
    return false;
  }
  return daysBetween(asOfDate, approval.expiresAt) >= 0;
}

function groupActiveSeats(users) {
  return users
    .filter((user) => user.status === "active")
    .reduce((totals, user) => {
      totals[user.seatClass] = (totals[user.seatClass] || 0) + 1;
      return totals;
    }, {});
}

function findDuplicateIdentities(users) {
  const byEmail = new Map();
  for (const user of users.filter((item) => item.status === "active")) {
    const key = normalizeEmail(user.email);
    if (!byEmail.has(key)) {
      byEmail.set(key, []);
    }
    byEmail.get(key).push(user);
  }
  return [...byEmail.values()].filter((items) => items.length > 1);
}

function evaluateRoster(project) {
  const findings = [];
  const { contract, roster, usage, approvals } = project;
  const activeBySeatClass = groupActiveSeats(roster.users);
  const allowedDomains = new Set(contract.allowedDomains);

  for (const [seatClass, entitlement] of Object.entries(contract.seatEntitlements)) {
    const activeCount = activeBySeatClass[seatClass] || 0;
    const overage = activeCount - entitlement;
    if (overage > 0 && !hasOverageApproval(seatClass, approvals)) {
      addFinding(
        findings,
        "high",
        "unapproved-seat-overage",
        `${activeCount} active ${seatClass} seats exceed the contracted ${entitlement} seat entitlement by ${overage}.`,
        "Hold renewal true-up until finance approves overage billing or seats are reclaimed.",
        overage * (contract.seatRates[seatClass] || 0),
        roster.users.filter((user) => user.status === "active" && user.seatClass === seatClass).map((user) => user.id)
      );
    }
  }

  for (const user of roster.users) {
    if (user.status !== "active") {
      continue;
    }

    const domain = domainFromEmail(user.email);
    if (!allowedDomains.has(domain) && !isDomainApproved(domain, approvals)) {
      addFinding(
        findings,
        "critical",
        "unapproved-seat-domain",
        `${user.email} uses domain ${domain}, which is outside the signed analytics license domains.`,
        "Remove the seat or attach a signed domain addendum before renewal billing.",
        contract.seatRates[user.seatClass] || 0,
        [user.id]
      );
    }

    if (user.temporaryUntil && daysBetween(project.asOfDate, user.temporaryUntil) < 0 && !isTemporaryAccessApproved(user, approvals, project.asOfDate)) {
      addFinding(
        findings,
        "medium",
        "expired-temporary-access",
        `${user.email} still has active access after temporary access expired on ${user.temporaryUntil}.`,
        "Disable the temporary seat or convert it into a paid named seat before renewal.",
        contract.seatRates[user.seatClass] || 0,
        [user.id]
      );
    }

    if (daysBetween(user.lastSeenAt, project.asOfDate) > contract.inactivityReclaimDays) {
      addFinding(
        findings,
        "low",
        "inactive-paid-seat",
        `${user.email} has not used analytics access since ${user.lastSeenAt}.`,
        "Queue the seat for renewal roster confirmation or reclaim before the true-up invoice.",
        contract.seatRates[user.seatClass] || 0,
        [user.id]
      );
    }

    const usageRecord = usage.byUser[user.id] || { apiQueries: 0, dashboardSessions: 0 };
    if (usageRecord.apiQueries > 0 && user.seatClass !== "api") {
      addFinding(
        findings,
        "high",
        "api-usage-without-api-seat",
        `${user.email} generated ${usageRecord.apiQueries} analytics API queries while assigned to a ${user.seatClass} seat.`,
        "Reclassify the user to an API seat or remove API keys before billing the renewal period.",
        contract.seatRates.api - (contract.seatRates[user.seatClass] || 0),
        [user.id]
      );
    }
  }

  for (const duplicateGroup of findDuplicateIdentities(roster.users)) {
    addFinding(
      findings,
      "medium",
      "duplicate-named-seat",
      `${duplicateGroup[0].email} appears as ${duplicateGroup.length} active named seats.`,
      "Collapse duplicate identity records before seat counts are sent to finance.",
      (duplicateGroup.length - 1) * (contract.seatRates[duplicateGroup[0].seatClass] || 0),
      duplicateGroup.map((user) => user.id)
    );
  }

  const totalExposure = findings.reduce((sum, finding) => sum + finding.estimatedExposure, 0);
  const severitySummary = findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  return {
    activeBySeatClass,
    contractedSeatEntitlements: contract.seatEntitlements,
    findings,
    severitySummary,
    estimatedRevenueExposure: Math.round(totalExposure * 100) / 100,
    score: Math.max(0, 100 - findings.reduce((sum, finding) => sum + SEVERITY_WEIGHTS[finding.severity], 0))
  };
}

function decisionFromScore(score, severitySummary) {
  if (severitySummary.critical > 0) {
    return "block-renewal-until-seat-evidence-is-clean";
  }
  if (score < 70) {
    return "hold-renewal-true-up-for-finance-review";
  }
  if (score < 88) {
    return "review-seat-exceptions-before-invoice";
  }
  return "renewal-roster-ready";
}

function buildFinanceActions(findings) {
  return findings.map((finding) => ({
    priority: finding.severity === "critical" || finding.severity === "high" ? "blocking" : "review",
    rule: finding.rule,
    action: finding.action,
    estimatedExposure: finding.estimatedExposure,
    userIds: finding.userIds
  }));
}

function buildReviewPacket(project) {
  const evaluation = evaluateRoster(project);
  return {
    guard: "analytics-license-seat-roster-guard",
    issue: "SCIBASE-AI/SCIBASE.AI#20",
    customer: project.contract.customer,
    asOfDate: project.asOfDate,
    renewalDate: project.contract.renewalDate,
    decision: decisionFromScore(evaluation.score, evaluation.severitySummary),
    score: evaluation.score,
    activeBySeatClass: evaluation.activeBySeatClass,
    contractedSeatEntitlements: evaluation.contractedSeatEntitlements,
    estimatedRevenueExposure: evaluation.estimatedRevenueExposure,
    findings: evaluation.findings,
    financeActions: buildFinanceActions(evaluation.findings),
    safety: [
      "Synthetic roster and usage data only",
      "No Stripe, PayPal, bank, ACH, ERP, SSO, SCIM, or analytics provider calls",
      "No private customer data, payment credentials, tax IDs, or live invoice mutations"
    ]
  };
}

function renderMarkdownReport(packet) {
  const lines = [
    `# Analytics License Seat Roster Guard`,
    ``,
    `Customer: ${packet.customer}`,
    `Issue: ${packet.issue}`,
    `Decision: ${packet.decision}`,
    `Score: ${packet.score}`,
    `Estimated revenue exposure: $${packet.estimatedRevenueExposure}`,
    ``,
    `## Seat Counts`,
    ``,
    `| Seat class | Active | Contracted |`,
    `| --- | ---: | ---: |`
  ];

  for (const seatClass of Object.keys(packet.contractedSeatEntitlements)) {
    lines.push(
      `| ${seatClass} | ${packet.activeBySeatClass[seatClass] || 0} | ${packet.contractedSeatEntitlements[seatClass]} |`
    );
  }

  lines.push(``, `## Findings`, ``);
  for (const finding of packet.findings) {
    lines.push(`- **${finding.severity} / ${finding.rule}**: ${finding.message}`);
    lines.push(`  - Action: ${finding.action}`);
    lines.push(`  - Exposure: $${finding.estimatedExposure}`);
  }

  lines.push(``, `## Safety`, ``);
  for (const item of packet.safety) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const exposureWidth = Math.min(760, Math.max(40, packet.estimatedRevenueExposure / 12));
  const criticalCount = packet.findings.filter((finding) => finding.severity === "critical").length;
  const highCount = packet.findings.filter((finding) => finding.severity === "high").length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Analytics license seat roster guard summary">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="68" font-family="Arial" font-size="34" font-weight="700" fill="#0f172a">Analytics License Seat Roster Guard</text>
  <text x="48" y="104" font-family="Arial" font-size="18" fill="#475569">${packet.customer} renewal evidence packet</text>
  <rect x="48" y="142" width="864" height="92" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="180" font-family="Arial" font-size="22" font-weight="700" fill="#be123c">${packet.decision}</text>
  <text x="76" y="212" font-family="Arial" font-size="18" fill="#334155">Score ${packet.score} | Critical ${criticalCount} | High ${highCount}</text>
  <rect x="48" y="274" width="864" height="74" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="306" font-family="Arial" font-size="18" fill="#334155">Estimated revenue exposure</text>
  <rect x="76" y="322" width="760" height="14" rx="7" fill="#e2e8f0"/>
  <rect x="76" y="322" width="${exposureWidth}" height="14" rx="7" fill="#0f766e"/>
  <text x="852" y="337" font-family="Arial" font-size="16" text-anchor="end" fill="#0f172a">$${packet.estimatedRevenueExposure}</text>
  <rect x="48" y="388" width="864" height="76" rx="8" fill="#ecfeff" stroke="#67e8f9"/>
  <text x="76" y="421" font-family="Arial" font-size="18" font-weight="700" fill="#155e75">Synthetic-only finance review</text>
  <text x="76" y="449" font-family="Arial" font-size="16" fill="#155e75">No live billing, SSO, SCIM, payment processor, or private customer data.</text>
</svg>
`;
}

module.exports = {
  buildReviewPacket,
  decisionFromScore,
  evaluateRoster,
  renderMarkdownReport,
  renderSvgSummary
};
