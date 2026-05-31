const crypto = require('crypto');

const MATERIAL_FIELDS = new Set([
  'problemStatement',
  'deliverables',
  'rubric',
  'eligibility',
  'prizeSchedule',
  'ndaTerms',
  'dataRoomTerms'
]);

const FIELD_LABELS = {
  problemStatement: 'problem statement',
  deliverables: 'deliverables',
  rubric: 'scoring rubric',
  eligibility: 'solver eligibility',
  prizeSchedule: 'prize schedule',
  ndaTerms: 'NDA terms',
  dataRoomTerms: 'data-room terms'
};

const NOTICE_HOURS = 72;

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

function hoursBetween(start, end) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 36e5;
}

function addFinding(findings, severity, code, message, evidence = {}) {
  findings.push({ severity, code, message, evidence });
}

function changedMaterialFields(request) {
  return Object.keys(request.changes || {}).filter((field) => MATERIAL_FIELDS.has(field));
}

function rubricWeightTotal(rubric = []) {
  return rubric.reduce((sum, item) => sum + Number(item.weight || 0), 0);
}

function compareRubric(previous = [], next = []) {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const nextById = new Map(next.map((item) => [item.id, item]));
  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, item] of nextById) {
    if (!previousById.has(id)) {
      added.push(id);
      continue;
    }
    const before = previousById.get(id);
    if (before.weight !== item.weight || before.maxPoints !== item.maxPoints || before.label !== item.label) {
      changed.push({
        id,
        before: { label: before.label, weight: before.weight, maxPoints: before.maxPoints },
        after: { label: item.label, weight: item.weight, maxPoints: item.maxPoints }
      });
    }
  }

  for (const id of previousById.keys()) {
    if (!nextById.has(id)) {
      removed.push(id);
    }
  }

  return {
    added,
    removed,
    changed,
    beforeTotal: rubricWeightTotal(previous),
    afterTotal: rubricWeightTotal(next)
  };
}

function activeTeams(participants = []) {
  return participants.filter((team) => ['registered', 'submitted', 'finalist'].includes(team.status));
}

function submittedTeams(participants = []) {
  return participants.filter((team) => team.submittedAt);
}

function notificationGaps(request, participants = []) {
  const notified = new Set((request.notice || {}).teamNotices || []);
  return activeTeams(participants)
    .filter((team) => !notified.has(team.teamId))
    .map((team) => team.teamId);
}

function consentGaps(request, participants = []) {
  const consented = new Set((request.notice || {}).teamConsents || []);
  return activeTeams(participants)
    .filter((team) => !consented.has(team.teamId))
    .map((team) => team.teamId);
}

function approvalGaps(request) {
  const approvals = request.approvals || {};
  const gaps = [];
  if (!approvals.sponsor) gaps.push('sponsor approval');
  if (!approvals.independentReviewer) gaps.push('independent reviewer approval');
  if (!approvals.auditLog) gaps.push('immutable audit log');
  return gaps;
}

function evaluateChangeRequest(challenge, request) {
  const findings = [];
  const materialFields = changedMaterialFields(request);
  const launchedAt = new Date(challenge.launchedAt);
  const requestedAt = new Date(request.requestedAt);
  const effectiveAt = new Date(request.effectiveAt || request.requestedAt);
  const afterLaunch = requestedAt >= launchedAt;
  const submissions = submittedTeams(challenge.participants);
  const freezeDigestBefore = digest(challenge.baseline);
  const freezeDigestAfter = digest({ ...challenge.baseline, ...request.changes });

  if (materialFields.length === 0) {
    addFinding(findings, 'info', 'NON_MATERIAL_CHANGE', 'Only non-material copy or metadata fields changed.', {
      changedFields: Object.keys(request.changes || {})
    });
  }

  if (afterLaunch && materialFields.length > 0) {
    addFinding(findings, 'medium', 'MATERIAL_CHANGE_AFTER_LAUNCH', 'Material challenge fields changed after public launch.', {
      changedFields: materialFields.map((field) => FIELD_LABELS[field] || field),
      requestedAt: request.requestedAt,
      launchedAt: challenge.launchedAt
    });

    const gaps = approvalGaps(request);
    if (gaps.length > 0) {
      addFinding(findings, 'critical', 'MISSING_CHANGE_APPROVALS', 'Post-launch material changes need sponsor, reviewer, and audit evidence.', {
        missing: gaps
      });
    }
  }

  const missingNotice = notificationGaps(request, challenge.participants);
  if (materialFields.length > 0 && missingNotice.length > 0) {
    addFinding(findings, 'critical', 'UNEQUAL_SOLVER_NOTICE', 'Active solver teams were not all notified before the change takes effect.', {
      teams: missingNotice
    });
  }

  const noticeHours = request.notice && request.notice.sentAt ? hoursBetween(request.notice.sentAt, effectiveAt) : 0;
  if (materialFields.length > 0 && noticeHours < NOTICE_HOURS) {
    addFinding(findings, 'high', 'SHORT_NOTICE_WINDOW', 'Material changes need at least 72 hours notice or an explicit deadline extension.', {
      noticeHours,
      minimumHours: NOTICE_HOURS,
      deadlineExtensionHours: request.deadlineExtensionHours || 0
    });
  }

  if (request.requiresSolverConsent) {
    const missingConsent = consentGaps(request, challenge.participants);
    if (missingConsent.length > 0) {
      addFinding(findings, 'high', 'MISSING_SOLVER_CONSENT', 'Material scope changes requiring consent are missing active-team acknowledgements.', {
        teams: missingConsent
      });
    }
  }

  if (submissions.length > 0 && materialFields.length > 0 && !request.grandfatherSubmittedWork) {
    addFinding(findings, 'critical', 'SUBMITTED_WORK_NOT_GRANDFATHERED', 'Teams that already submitted work must be scored under the original scope or explicitly grandfathered.', {
      submittedTeams: submissions.map((team) => team.teamId)
    });
  }

  if (request.changes && request.changes.rubric) {
    const comparison = compareRubric(challenge.baseline.rubric, request.changes.rubric);
    if (comparison.afterTotal !== 100) {
      addFinding(findings, 'critical', 'RUBRIC_WEIGHT_TOTAL_INVALID', 'Changed rubric weights must total 100 before scoring.', {
        afterTotal: comparison.afterTotal
      });
    }
    if (comparison.added.length || comparison.removed.length || comparison.changed.length) {
      addFinding(findings, 'medium', 'RUBRIC_CRITERIA_CHANGED', 'Rubric criteria changed and must be visible in the reviewer packet.', comparison);
    }
  }

  if (request.changes && request.changes.eligibility && !request.grandfatherRegisteredTeams) {
    addFinding(findings, 'high', 'ELIGIBILITY_NARROWED_WITHOUT_GRANDFATHERING', 'Eligibility changes must not disqualify already registered teams without grandfathering.', {
      activeTeams: activeTeams(challenge.participants).map((team) => team.teamId)
    });
  }

  if (request.changes && request.changes.prizeSchedule) {
    const finance = request.approvals && request.approvals.financeEscrow;
    if (!finance) {
      addFinding(findings, 'critical', 'PRIZE_CHANGE_WITHOUT_ESCROW_EVIDENCE', 'Prize or payout schedule changes need finance/escrow evidence before scoring proceeds.', {
        prizeSchedule: request.changes.prizeSchedule
      });
    }
  }

  if (request.changes && (request.changes.ndaTerms || request.changes.dataRoomTerms)) {
    if (!request.equalDataRoomAccess) {
      addFinding(findings, 'high', 'DATA_ROOM_ACCESS_NOT_RECONFIRMED', 'NDA or data-room changes require equal re-access evidence for every active team.', {
        changedFields: ['ndaTerms', 'dataRoomTerms'].filter((field) => request.changes[field])
      });
    }
  }

  const hasCritical = findings.some((finding) => finding.severity === 'critical');
  const hasHigh = findings.some((finding) => finding.severity === 'high');
  const hasMedium = findings.some((finding) => finding.severity === 'medium');
  const decision = hasCritical || hasHigh ? 'hold' : hasMedium ? 'review' : 'allow';

  return {
    challengeId: challenge.challengeId,
    requestId: request.id,
    decision,
    materialFields,
    freezeDigestBefore,
    freezeDigestAfter,
    findingCounts: countFindings(findings),
    findings,
    actions: buildActions(decision, findings, request)
  };
}

function countFindings(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
}

function buildActions(decision, findings, request) {
  if (decision === 'allow') {
    return ['Record audit digest', 'Publish change packet', 'Continue normal scoring'];
  }

  const actions = new Set(['Pause scoring for affected challenge', 'Publish reviewer-visible change packet']);
  for (const finding of findings) {
    if (finding.code === 'UNEQUAL_SOLVER_NOTICE') actions.add('Notify every active solver team');
    if (finding.code === 'MISSING_SOLVER_CONSENT') actions.add('Collect consent or extend/reopen the deadline');
    if (finding.code === 'SUBMITTED_WORK_NOT_GRANDFATHERED') actions.add('Grandfather submitted work under original scope');
    if (finding.code === 'MISSING_CHANGE_APPROVALS') actions.add('Attach sponsor, independent reviewer, and immutable audit approvals');
    if (finding.code === 'PRIZE_CHANGE_WITHOUT_ESCROW_EVIDENCE') actions.add('Attach finance escrow evidence');
    if (finding.code === 'DATA_ROOM_ACCESS_NOT_RECONFIRMED') actions.add('Reconfirm equal data-room access');
  }

  if ((request.deadlineExtensionHours || 0) < NOTICE_HOURS) {
    actions.add('Add a deadline extension matching the notice window');
  }

  return Array.from(actions);
}

function evaluateScopeChangeControl(input) {
  const results = input.changeRequests.map((request) => evaluateChangeRequest(input.challenge, request));
  const decisionRank = { allow: 0, review: 1, hold: 2 };
  const overallDecision = results.reduce(
    (current, result) => (decisionRank[result.decision] > decisionRank[current] ? result.decision : current),
    'allow'
  );

  return {
    generatedAt: input.generatedAt || new Date().toISOString(),
    challengeId: input.challenge.challengeId,
    title: input.challenge.title,
    overallDecision,
    requestCount: results.length,
    results,
    reviewerPacket: buildReviewerPacket(input.challenge, results)
  };
}

function buildReviewerPacket(challenge, results) {
  return {
    challengeId: challenge.challengeId,
    launchedAt: challenge.launchedAt,
    baselineDigest: digest(challenge.baseline),
    activeTeams: activeTeams(challenge.participants).map((team) => team.teamId),
    submittedTeams: submittedTeams(challenge.participants).map((team) => team.teamId),
    heldRequests: results.filter((result) => result.decision === 'hold').map((result) => result.requestId),
    reviewRequests: results.filter((result) => result.decision === 'review').map((result) => result.requestId),
    allowRequests: results.filter((result) => result.decision === 'allow').map((result) => result.requestId)
  };
}

function formatMarkdownReport(evaluation) {
  const lines = [
    `# Scope Change Review: ${evaluation.title}`,
    '',
    `Overall decision: **${evaluation.overallDecision.toUpperCase()}**`,
    `Challenge: \`${evaluation.challengeId}\``,
    `Generated: ${evaluation.generatedAt}`,
    '',
    '## Requests'
  ];

  for (const result of evaluation.results) {
    lines.push('', `### ${result.requestId}`, '');
    lines.push(`Decision: **${result.decision.toUpperCase()}**`);
    lines.push(`Material fields: ${result.materialFields.length ? result.materialFields.join(', ') : 'none'}`);
    lines.push(`Freeze digest before: \`${result.freezeDigestBefore}\``);
    lines.push(`Freeze digest after: \`${result.freezeDigestAfter}\``);
    lines.push('');
    lines.push('Findings:');
    for (const finding of result.findings) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
    }
    lines.push('');
    lines.push('Actions:');
    for (const action of result.actions) {
      lines.push(`- ${action}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function formatSvgSummary(evaluation) {
  const colors = {
    allow: '#15803d',
    review: '#a16207',
    hold: '#b91c1c'
  };
  const rows = evaluation.results
    .map((result, index) => {
      const y = 170 + index * 58;
      return [
        `<rect x="48" y="${y - 30}" width="864" height="44" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>`,
        `<text x="68" y="${y - 4}" font-size="18" font-family="Arial" fill="#0f172a">${escapeXml(result.requestId)}</text>`,
        `<text x="270" y="${y - 4}" font-size="18" font-family="Arial" font-weight="700" fill="${colors[result.decision]}">${result.decision.toUpperCase()}</text>`,
        `<text x="420" y="${y - 4}" font-size="15" font-family="Arial" fill="#475569">${escapeXml(result.actions[0] || 'Record audit')}</text>`
      ].join('');
    })
    .join('');

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">',
    '<rect width="960" height="540" fill="#ffffff"/>',
    '<rect x="0" y="0" width="960" height="112" fill="#0f172a"/>',
    '<text x="48" y="58" font-size="30" font-family="Arial" font-weight="700" fill="#f8fafc">Scientific bounty scope-change guard</text>',
    `<text x="48" y="88" font-size="16" font-family="Arial" fill="#cbd5e1">Overall decision: ${evaluation.overallDecision.toUpperCase()} | Requests: ${evaluation.requestCount}</text>`,
    '<text x="48" y="142" font-size="18" font-family="Arial" font-weight="700" fill="#334155">Reviewer queue</text>',
    rows,
    '<text x="48" y="502" font-size="14" font-family="Arial" fill="#64748b">Synthetic data only. Blocks goalpost-moving changes before scoring or payout.</text>',
    '</svg>'
  ].join('\n');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  evaluateScopeChangeControl,
  evaluateChangeRequest,
  compareRubric,
  formatMarkdownReport,
  formatSvgSummary,
  stableStringify,
  digest
};

