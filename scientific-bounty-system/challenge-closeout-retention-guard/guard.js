'use strict';

const severityWeight = {
  critical: 5,
  high: 3,
  medium: 2,
  low: 1
};

const severityOrder = ['critical', 'high', 'medium', 'low'];

function daysBetween(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / msPerDay);
}

function addFinding(findings, challenge, code, severity, domain, evidence, action) {
  findings.push({
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    code,
    severity,
    domain,
    evidence,
    action,
    closeoutHold: severity === 'critical' || severity === 'high'
  });
}

function evaluateChallenge(challenge, now = '2026-05-28T00:00:00Z') {
  const findings = [];
  const daysSinceClose = daysBetween(challenge.closeout.closedAt, now);
  const revokeDeadlineDays = challenge.policy.revokeAccessWithinDays;
  const retainAppealDays = challenge.policy.retainAppealRecordsDays;

  for (const grant of challenge.dataGrants) {
    if (grant.active && daysSinceClose > revokeDeadlineDays) {
      addFinding(
        findings,
        challenge,
        'active-data-room-access-after-closeout',
        'critical',
        'access revocation',
        `${grant.actor} still has ${grant.role} access to ${grant.datasetId} ${daysSinceClose} days after closeout; policy requires revocation within ${revokeDeadlineDays} days.`,
        'Revoke access, rotate shared credentials, and record the revocation event before closeout is accepted.'
      );
    }

    if (grant.classification === 'restricted' && grant.closeoutDisposition === 'unresolved') {
      addFinding(
        findings,
        challenge,
        'restricted-data-disposition-missing',
        'high',
        'data retention',
        `${grant.datasetId} is restricted and has no destruction, return, or legal-hold disposition.`,
        'Collect a destruction certificate, return receipt, or legal-hold order for the restricted dataset.'
      );
    }

    if (grant.closeoutDisposition === 'destroyed' && !grant.evidenceId) {
      addFinding(
        findings,
        challenge,
        'destruction-evidence-missing',
        'high',
        'data retention',
        `${grant.datasetId} is marked destroyed without a certificate or audit evidence identifier.`,
        'Attach the destruction certificate hash or reviewer-verifiable evidence identifier.'
      );
    }
  }

  if (challenge.settlement.status !== 'funded' && challenge.ipTransfer.status === 'transferred') {
    addFinding(
      findings,
      challenge,
      'ip-transferred-before-funded-settlement',
      'critical',
      'IP transfer',
      `IP status is transferred while settlement status is ${challenge.settlement.status}.`,
      'Reverse the transfer state or block sponsor use until funded settlement is recorded.'
    );
  }

  if (challenge.closeout.outcome === 'cancelled' && !challenge.solverProtection.partialCompensationDecision) {
    addFinding(
      findings,
      challenge,
      'cancelled-challenge-compensation-missing',
      'high',
      'solver protection',
      'The challenge was cancelled after work started, but no partial-compensation decision is recorded.',
      'Record partial compensation, refund, or no-compensation rationale before final closeout.'
    );
  }

  if (challenge.closeout.outcome === 'no-award' && !challenge.solverProtection.noAwardReasonPublished) {
    addFinding(
      findings,
      challenge,
      'no-award-reason-not-published',
      'medium',
      'solver protection',
      'No-award closeout does not include a solver-visible reason packet.',
      'Publish a solver-facing reason packet that preserves private sponsor data.'
    );
  }

  const appealAge = daysBetween(challenge.closeout.closedAt, challenge.records.appealRecordsRetainUntil);
  if (appealAge < retainAppealDays) {
    addFinding(
      findings,
      challenge,
      'appeal-record-retention-too-short',
      'high',
      'appeal records',
      `Appeal records are retained for ${appealAge} days, below the ${retainAppealDays}-day policy.`,
      'Extend arbitration and appeal record retention before deleting review evidence.'
    );
  }

  if (challenge.publicDisclosure.enabled && challenge.publicDisclosure.privateChallenge && !challenge.publicDisclosure.redactionApproved) {
    addFinding(
      findings,
      challenge,
      'private-challenge-disclosure-unredacted',
      'high',
      'public disclosure',
      'Public disclosure is enabled for a private challenge without approved redactions.',
      'Block announcement until sponsor data, solver trade secrets, and reviewer identities are redacted.'
    );
  }

  if (challenge.records.auditDigestStatus !== 'signed') {
    addFinding(
      findings,
      challenge,
      'closeout-audit-digest-unsigned',
      'medium',
      'audit evidence',
      `Closeout audit digest status is ${challenge.records.auditDigestStatus}.`,
      'Sign the closeout digest after revocation, retention, and settlement checks complete.'
    );
  }

  return {
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    outcome: challenge.closeout.outcome,
    daysSinceClose,
    findings
  };
}

function summarizeFindings(findings) {
  return severityOrder.reduce((summary, severity) => {
    summary[severity] = findings.filter((finding) => finding.severity === severity).length;
    return summary;
  }, {});
}

function buildCloseoutActions(findings) {
  const actions = new Set();

  for (const finding of findings) {
    if (finding.domain === 'access revocation') actions.add('Revoke stale data-room and reviewer access, then rotate shared challenge credentials.');
    if (finding.domain === 'data retention') actions.add('Collect destruction, return, or legal-hold evidence for restricted sponsor datasets.');
    if (finding.domain === 'IP transfer') actions.add('Gate IP transfer and sponsor use until funded settlement is recorded.');
    if (finding.domain === 'solver protection') actions.add('Publish solver-facing closeout rationale and compensation decisions.');
    if (finding.domain === 'appeal records') actions.add('Retain arbitration records through the policy appeal window.');
    if (finding.domain === 'public disclosure') actions.add('Approve redactions before publishing private-challenge outcomes.');
  }

  return [...actions].sort();
}

function analyzeCloseoutRecords(packet) {
  const challenges = packet.challenges.map((challenge) => evaluateChallenge(challenge, packet.generatedAt));
  const findings = challenges.flatMap((challenge) => challenge.findings);
  const riskScore = findings.reduce((score, finding) => score + severityWeight[finding.severity], 0);
  const decision = findings.some((finding) => finding.closeoutHold)
    ? 'hold-closeout'
    : 'closeout-ready';

  return {
    generatedBy: 'challenge-closeout-retention-guard',
    packetId: packet.packetId,
    generatedAt: packet.generatedAt,
    decision,
    riskScore,
    severityCounts: summarizeFindings(findings),
    challenges: challenges.map(({ findings: _findings, ...challenge }) => challenge),
    findings,
    closeoutActions: buildCloseoutActions(findings)
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Challenge Closeout Retention Guard',
    '',
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}`,
    '',
    '## Severity Counts',
    '',
    '| Severity | Count |',
    '| --- | ---: |',
    ...severityOrder.map((severity) => `| ${severity} | ${report.severityCounts[severity]} |`),
    '',
    '## Challenge Summary',
    '',
    '| Challenge | Outcome | Days Since Close |',
    '| --- | --- | ---: |',
    ...report.challenges.map((challenge) => `| ${challenge.challengeTitle} | ${challenge.outcome} | ${challenge.daysSinceClose} |`),
    '',
    '## Findings',
    ''
  ];

  for (const finding of report.findings) {
    lines.push(`### ${finding.severity.toUpperCase()}: ${finding.code}`);
    lines.push(`Challenge: ${finding.challengeTitle}`);
    lines.push(`Evidence: ${finding.evidence}`);
    lines.push(`Action: ${finding.action}`);
    lines.push('');
  }

  lines.push('## Closeout Actions');
  lines.push('');
  for (const action of report.closeoutActions) {
    lines.push(`- ${action}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderSvg(report) {
  const total = Math.max(1, report.findings.length);
  const colors = {
    critical: '#991b1b',
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#2563eb'
  };
  const bars = severityOrder.map((severity, index) => {
    const count = report.severityCounts[severity];
    const width = 30 + Math.round((count / total) * 300);
    const y = 92 + index * 42;
    return `<text x="34" y="${y + 18}" font-family="monospace" font-size="15" fill="#1f2937">${severity}</text><rect x="142" y="${y}" width="${width}" height="24" rx="3" fill="${colors[severity]}"/><text x="${154 + width}" y="${y + 18}" font-family="monospace" font-size="14" fill="#111827">${count}</text>`;
  }).join('\n');

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="320" viewBox="0 0 720 320" role="img" aria-label="Challenge closeout retention summary">',
    '<rect width="720" height="320" fill="#f8fafc"/>',
    '<rect x="18" y="18" width="684" height="284" rx="8" fill="#ffffff" stroke="#cbd5e1"/>',
    '<text x="34" y="54" font-family="monospace" font-size="22" font-weight="700" fill="#0f172a">Challenge Closeout Guard</text>',
    `<text x="34" y="78" font-family="monospace" font-size="14" fill="#475569">Decision: ${report.decision}</text>`,
    bars,
    `<text x="34" y="282" font-family="monospace" font-size="14" fill="#475569">Risk score: ${report.riskScore} | Challenges: ${report.challenges.length} | Findings: ${report.findings.length}</text>`,
    '</svg>',
    ''
  ].join('\n');
}

module.exports = {
  analyzeCloseoutRecords,
  evaluateChallenge,
  renderMarkdown,
  renderSvg
};
