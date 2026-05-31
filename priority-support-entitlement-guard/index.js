const fs = require('fs');
const path = require('path');

const PREMIUM_PLANS = new Set(['lab-plus', 'institution-enterprise', 'government-enterprise']);
const SENSITIVE_DATA = new Set(['restricted-human-data', 'export-controlled', 'clinical']);
const SLA_MINUTES = {
  standard: { p1: 480, p2: 1440, p3: 2880 },
  priority: { p1: 60, p2: 240, p3: 720 },
  enterprise: { p1: 30, p2: 120, p3: 480 },
};

function addFinding(findings, severity, code, caseId, message, evidence = {}) {
  findings.push({ severity, code, caseId, message, evidence });
}

function evaluateSupportCase(supportCase, policy) {
  const findings = [];
  const account = supportCase.account || {};
  const request = supportCase.request || {};
  const finance = supportCase.finance || {};
  const data = supportCase.data || {};
  const plan = account.plan || 'free';
  const priorityRequested = request.priorityRequested === true;
  const hasPremiumPlan = PREMIUM_PLANS.has(plan);
  const hasSupportAddOn = account.supportAddOn === true;
  const eligibleRequester = account.supportRoster?.includes(request.requesterId) || request.requesterRole === 'institution-admin';
  const unpaidBalance = Number(finance.unpaidBalance || 0);
  const supportMinutesUsed = Number(finance.supportMinutesUsed || 0);
  const supportMinutesIncluded = Number(finance.supportMinutesIncluded || 0);
  const overageMinutes = Math.max(0, supportMinutesUsed + Number(request.estimatedMinutes || 0) - supportMinutesIncluded);
  const severity = String(request.severity || 'p3').toLowerCase();
  const targetTier = plan.includes('enterprise') && hasSupportAddOn ? 'enterprise' : hasSupportAddOn ? 'priority' : 'standard';
  const requestedResponseMinutes = Number(request.requestedResponseMinutes || Infinity);
  const entitledResponseMinutes = SLA_MINUTES[targetTier]?.[severity] || SLA_MINUTES.standard.p3;

  if (priorityRequested && !hasPremiumPlan && !hasSupportAddOn) {
    addFinding(
      findings,
      'blocker',
      'priority-support-not-entitled',
      supportCase.id,
      'Case requests paid priority handling but the account lacks a premium plan or support add-on.',
      { plan, supportAddOn: hasSupportAddOn },
    );
  }

  if (priorityRequested && unpaidBalance > policy.unpaidBalanceHoldThreshold) {
    addFinding(
      findings,
      'blocker',
      'unpaid-invoice-premium-hold',
      supportCase.id,
      'Unpaid invoices exceed the hold threshold for premium support handling.',
      { unpaidBalance, threshold: policy.unpaidBalanceHoldThreshold },
    );
  }

  if (priorityRequested && !eligibleRequester) {
    addFinding(
      findings,
      'hold',
      'requester-not-on-support-roster',
      supportCase.id,
      'Requester is not on the paid support roster or institution-admin role.',
      { requesterId: request.requesterId, requesterRole: request.requesterRole },
    );
  }

  if (requestedResponseMinutes < entitledResponseMinutes) {
    addFinding(
      findings,
      'hold',
      'requested-sla-exceeds-entitlement',
      supportCase.id,
      'Requested SLA response is faster than the account entitlement allows.',
      { requestedResponseMinutes, entitledResponseMinutes, targetTier, severity },
    );
  }

  if (SENSITIVE_DATA.has(data.classification) && !data.secureRoutingApproved) {
    addFinding(
      findings,
      'blocker',
      'sensitive-data-routing-missing',
      supportCase.id,
      'Sensitive support case is missing secure routing approval before premium handling.',
      { classification: data.classification },
    );
  }

  if (request.enterpriseEscalation === true && !request.escalationApprovalId) {
    addFinding(
      findings,
      'hold',
      'enterprise-escalation-approval-missing',
      supportCase.id,
      'Enterprise escalation was requested without an approval record.',
      { severity, plan },
    );
  }

  if (overageMinutes > 0 && !finance.overageApproved) {
    addFinding(
      findings,
      'hold',
      'support-overage-approval-missing',
      supportCase.id,
      'Support minutes would exceed the paid allowance without overage approval.',
      { overageMinutes, supportMinutesIncluded },
    );
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const holds = findings.filter((finding) => finding.severity === 'hold');
  const billableOverage = overageMinutes > 0 && finance.overageApproved ? overageMinutes * policy.supportOverageRate : 0;
  const decision = blockers.length
    ? 'hold-premium-support'
    : holds.length
      ? 'review-support-entitlement'
      : billableOverage > 0
        ? 'allow-with-overage-billing'
        : priorityRequested
          ? 'allow-priority-support'
          : 'route-standard-support';

  return {
    id: supportCase.id,
    accountId: account.id,
    plan,
    severity,
    targetTier,
    decision,
    priorityRequested,
    entitledResponseMinutes,
    requestedResponseMinutes,
    overageMinutes,
    billableOverage,
    findings,
  };
}

function evaluateSupportPacket(packet) {
  const policy = {
    unpaidBalanceHoldThreshold: packet.policy?.unpaidBalanceHoldThreshold ?? 100,
    supportOverageRate: packet.policy?.supportOverageRate ?? 3.5,
  };
  const caseResults = packet.cases.map((supportCase) => evaluateSupportCase(supportCase, policy));
  const findings = caseResults.flatMap((result) => result.findings);
  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const holds = findings.filter((finding) => finding.severity === 'hold');
  const billableOverage = caseResults.reduce((total, result) => total + result.billableOverage, 0);
  const decision = blockers.length
    ? 'hold-priority-support-routing'
    : holds.length
      ? 'review-priority-support-routing'
      : 'publish-priority-support-routing';

  return {
    program: packet.program,
    generatedAt: packet.generatedAt,
    decision,
    summary: {
      casesChecked: caseResults.length,
      blockers: blockers.length,
      holds: holds.length,
      billableOverage,
      allowedPriorityCases: caseResults.filter((result) => result.decision === 'allow-priority-support').length,
      standardRoutedCases: caseResults.filter((result) => result.decision === 'route-standard-support').length,
    },
    caseResults,
    findings,
    remediation: buildRemediation(findings),
  };
}

function buildRemediation(findings) {
  const actions = [];
  const has = (code) => findings.some((finding) => finding.code === code);
  if (has('priority-support-not-entitled')) actions.push('Route non-entitled cases to standard support or require a paid support add-on.');
  if (has('unpaid-invoice-premium-hold')) actions.push('Hold premium handling until finance clears unpaid invoices or grants an exception.');
  if (has('requester-not-on-support-roster')) actions.push('Ask an institution admin to add the requester to the paid support roster.');
  if (has('requested-sla-exceeds-entitlement')) actions.push('Adjust the SLA target to the account tier or record an approved paid escalation.');
  if (has('sensitive-data-routing-missing')) actions.push('Send sensitive cases through the approved restricted-data support queue before engineering access.');
  if (has('enterprise-escalation-approval-missing')) actions.push('Attach an enterprise escalation approval before using premium escalation resources.');
  if (has('support-overage-approval-missing')) actions.push('Collect overage approval or defer non-urgent support work until the next included allowance period.');
  return actions;
}

function renderMarkdown(audit) {
  const lines = [
    '# Priority Support Entitlement Guard',
    '',
    `Program: ${audit.program.name}`,
    `Decision: ${audit.decision}`,
    '',
    '## Summary',
    '',
    `- Cases checked: ${audit.summary.casesChecked}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Holds: ${audit.summary.holds}`,
    `- Allowed priority cases: ${audit.summary.allowedPriorityCases}`,
    `- Standard routed cases: ${audit.summary.standardRoutedCases}`,
    `- Billable overage: $${audit.summary.billableOverage.toFixed(2)}`,
    '',
    '## Case Decisions',
    '',
  ];

  for (const result of audit.caseResults) {
    lines.push(`- ${result.decision}: ${result.id} (${result.plan}, ${result.severity}, ${result.targetTier})`);
  }

  lines.push('', '## Findings', '');
  if (!audit.findings.length) {
    lines.push('No findings. Priority support routing can be published.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.code} (${finding.caseId}): ${finding.message}`);
    }
  }

  lines.push('', '## Remediation', '');
  for (const action of audit.remediation) lines.push(`- ${action}`);
  return `${lines.join('\n')}\n`;
}

function renderSvg(audit) {
  const statusColor = audit.decision === 'publish-priority-support-routing' ? '#16a34a' : audit.decision === 'review-priority-support-routing' ? '#ca8a04' : '#dc2626';
  const rows = audit.caseResults.slice(0, 7).map((result, index) => {
    const y = 190 + index * 36;
    const color = result.decision.startsWith('allow') || result.decision === 'route-standard-support' ? '#16a34a' : result.decision.startsWith('review') ? '#ca8a04' : '#dc2626';
    return `<text x="64" y="${y}" font-size="18" fill="#0f172a">${escapeXml(result.id)} ${escapeXml(result.plan)}</text><text x="640" y="${y}" font-size="18" fill="${color}" font-weight="700">${escapeXml(result.decision)}</text>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="32" y="28" width="896" height="96" rx="12" fill="#0f172a"/>
  <text x="64" y="72" font-size="30" fill="#f8fafc" font-family="Arial, sans-serif" font-weight="700">Priority Support Entitlement Guard</text>
  <text x="64" y="104" font-size="17" fill="#cbd5e1" font-family="Arial, sans-serif">${escapeXml(audit.program.name)}</text>
  <circle cx="744" cy="76" r="22" fill="${statusColor}"/>
  <text x="780" y="83" font-size="20" fill="#f8fafc" font-family="Arial, sans-serif" font-weight="700">${escapeXml(audit.decision)}</text>
  <text x="64" y="154" font-size="20" fill="#334155" font-family="Arial, sans-serif">${audit.summary.blockers} blockers; ${audit.summary.holds} holds; $${audit.summary.billableOverage.toFixed(2)} support overage</text>
  ${rows}
  <rect x="32" y="470" width="896" height="42" rx="8" fill="#e2e8f0"/>
  <text x="64" y="497" font-size="18" fill="#334155" font-family="Arial, sans-serif">Premium support is granted only when paid entitlements, finance state, SLA, and secure routing align.</text>
</svg>
`;
}

function writeReports(audit, outputDir = path.join(__dirname, 'reports')) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'support-entitlement-audit.json');
  const markdownPath = path.join(outputDir, 'support-entitlement-packet.md');
  const svgPath = path.join(outputDir, 'summary.svg');
  fs.writeFileSync(jsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(audit));
  fs.writeFileSync(svgPath, renderSvg(audit));
  return { jsonPath, markdownPath, svgPath };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  evaluateSupportCase,
  evaluateSupportPacket,
  renderMarkdown,
  renderSvg,
  writeReports,
};
