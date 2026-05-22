const staleDropDays = 14;

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function guardAction(type, target, reason) {
  return {type, target, reason};
}

function daysBetween(start, end) {
  return Math.floor((Date.parse(end) - Date.parse(start)) / 86400000);
}

function isInsideWindow(timestamp, window) {
  if (!timestamp || !window) {
    return false;
  }
  return Date.parse(timestamp) >= Date.parse(window.opensAt) && Date.parse(timestamp) <= Date.parse(window.closesAt);
}

function countByType(findings, type) {
  return findings.filter((finding) => finding.type === type).length;
}

function severityCounts(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
}

function evaluateLmsSyncGuard(input) {
  const roster = normalizeList(input.roster);
  const passbackEvents = normalizeList(input.passbackEvents);
  const webhookReceipts = normalizeList(input.webhookReceipts);
  const approvedSections = new Set(normalizeList(input.approvedSections));
  const receiptByEvent = new Map(webhookReceipts.map((receipt) => [receipt.eventId, receipt]));
  const findings = [];
  const requiredActions = [];

  for (const enrollment of roster) {
    if (!approvedSections.has(enrollment.sectionId)) {
      findings.push({
        type: 'out-of-scope-section',
        severity: 'critical',
        userId: enrollment.userId,
        sectionId: enrollment.sectionId,
        message: `${enrollment.userId} is enrolled in unapproved section ${enrollment.sectionId}`,
      });
      requiredActions.push(guardAction(
        'remove_out_of_scope_enrollment',
        enrollment.userId,
        'LMS sync must stay inside approved institutional course sections'
      ));
    }

    if (enrollment.status === 'dropped' && enrollment.lastChangedAt && daysBetween(enrollment.lastChangedAt, input.generatedAt) > staleDropDays) {
      findings.push({
        type: 'stale-dropped-enrollment',
        severity: 'major',
        userId: enrollment.userId,
        lastChangedAt: enrollment.lastChangedAt,
        message: `${enrollment.userId} has stale dropped enrollment state from ${enrollment.lastChangedAt}`,
      });
      requiredActions.push(guardAction(
        'confirm_dropped_enrollment',
        enrollment.userId,
        'stale dropped students need admin confirmation before roster sync'
      ));
    }

    if (!enrollment.orcid) {
      findings.push({
        type: 'missing-orcid-linkage',
        severity: 'major',
        userId: enrollment.userId,
        message: `${enrollment.userId} lacks ORCID/profile linkage for enterprise reporting`,
      });
      requiredActions.push(guardAction(
        'link_orcid_profile',
        enrollment.userId,
        'enterprise reporting needs stable researcher identity linkage'
      ));
    }

    if (!enrollment.consent) {
      findings.push({
        type: 'missing-ferpa-consent',
        severity: 'critical',
        userId: enrollment.userId,
        message: `${enrollment.userId} lacks FERPA-safe sync consent`,
      });
      requiredActions.push(guardAction(
        'confirm_lms_sync_consent',
        enrollment.userId,
        'student roster data cannot sync without consent evidence'
      ));
    }
  }

  for (const event of passbackEvents) {
    if (!approvedSections.has(event.sectionId)) {
      findings.push({
        type: 'passback-section-out-of-scope',
        severity: 'critical',
        eventId: event.eventId,
        sectionId: event.sectionId,
        message: `${event.eventId} targets unapproved section ${event.sectionId}`,
      });
      requiredActions.push(guardAction(
        'block_passback_event',
        event.eventId,
        'grade passback section must be approved for this institution'
      ));
    }

    if (!isInsideWindow(event.releasedAt, input.gradeReleaseWindow)) {
      findings.push({
        type: 'grade-release-window-violation',
        severity: 'major',
        eventId: event.eventId,
        releasedAt: event.releasedAt,
        message: `${event.eventId} released outside configured grade window`,
      });
      requiredActions.push(guardAction(
        'hold_grade_passback',
        event.eventId,
        'grade releases must occur inside the approved LMS release window'
      ));
    }

    const receipt = receiptByEvent.get(event.eventId);
    if (!receipt || !receipt.acknowledged) {
      findings.push({
        type: 'missing-webhook-acknowledgement',
        severity: 'major',
        eventId: event.eventId,
        message: `${event.eventId} lacks acknowledged LMS webhook receipt`,
      });
      requiredActions.push(guardAction(
        'replay_or_confirm_webhook',
        event.eventId,
        'grade passback must have an acknowledged LMS webhook receipt'
      ));
    }
  }

  const counts = severityCounts(findings);
  const criticalCount = counts.critical || 0;
  const majorCount = counts.major || 0;
  const decision = criticalCount > 0
    ? 'block-sync'
    : findings.some((finding) => finding.type.includes('passback') || finding.type.includes('grade') || finding.type.includes('webhook'))
      ? 'hold-passback'
      : majorCount > 0
        ? 'needs-admin-review'
        : 'approve-sync';
  const syncReadinessScore = Math.max(0, 100 - criticalCount * 40 - majorCount * 20);

  return {
    syncId: input.syncId,
    generatedAt: input.generatedAt,
    institution: input.institution,
    decision,
    syncReadinessScore,
    findings,
    requiredActions,
    summary: {
      rosterCount: roster.length,
      passbackEventCount: passbackEvents.length,
      webhookReceiptCount: webhookReceipts.length,
      approvedSectionCount: approvedSections.size,
      outOfScopeEnrollments: countByType(findings, 'out-of-scope-section'),
      staleDrops: countByType(findings, 'stale-dropped-enrollment'),
      missingOrcidLinks: countByType(findings, 'missing-orcid-linkage'),
      passbackHolds: findings.filter((finding) => finding.type.includes('passback') || finding.type.includes('grade') || finding.type.includes('webhook')).length,
      severityCounts: counts,
    },
  };
}

function buildLmsSyncReport(result) {
  const lines = [
    '# Enterprise LMS Roster Passback Guard Report',
    '',
    `Sync: ${result.syncId}`,
    `Institution: ${result.institution}`,
    `Generated: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    `Sync readiness score: ${result.syncReadinessScore}`,
    '',
    '## Summary',
    '',
    `Roster entries: ${result.summary.rosterCount}`,
    `Passback events: ${result.summary.passbackEventCount}`,
    `Webhook receipts: ${result.summary.webhookReceiptCount}`,
    `Approved sections: ${result.summary.approvedSectionCount}`,
    `Findings: ${result.findings.length}`,
    '',
    '## Findings',
    '',
    ...(result.findings.length
      ? result.findings.map((finding) => `- ${finding.severity}: ${finding.type} - ${finding.message}`)
      : ['- None']),
    '',
    '## Required Actions',
    '',
    ...(result.requiredActions.length
      ? result.requiredActions.map((action) => `- ${action.type}: ${action.target} (${action.reason})`)
      : ['- None']),
    '',
  ];
  return lines.join('\n');
}

module.exports = {
  evaluateLmsSyncGuard,
  buildLmsSyncReport,
};
