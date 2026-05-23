const crypto = require('node:crypto');

const RANDOMIZATION_FINDINGS = new Set([
  'missing-randomization-sequence',
  'missing-allocation-concealment',
  'arm-size-imbalance',
  'stratification-imbalance',
]);

const BLINDING_FINDINGS = new Set([
  'missing-blinding-role',
  'arm-label-leakage',
  'early-unblinding-event',
]);

const EXCLUSION_FINDINGS = new Set([
  'unblinded-post-randomization-exclusion',
]);

const BALANCE_FINDINGS = new Set([
  'arm-size-imbalance',
  'stratification-imbalance',
]);

function cleanText(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isClinicalStudy(study) {
  const text = `${study.design || ''} ${study.population || ''}`.toLowerCase();
  return /clinical|trial|patient|participant|human/.test(text) && !/preclinical|animal|mouse|rat/.test(text);
}

function percentArmImbalance(arms) {
  const counts = asArray(arms)
    .map((arm) => Number(arm.enrolled || 0))
    .filter((count) => Number.isFinite(count) && count > 0);
  if (counts.length < 2) return 0;
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return max === 0 ? 0 : ((max - min) / max) * 100;
}

function percentStratumImbalance(arms, stratumName) {
  const counts = asArray(arms)
    .map((arm) => Number(arm.strata?.[stratumName] || 0))
    .filter((count) => Number.isFinite(count) && count > 0);
  if (counts.length < 2) return 0;
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return max === 0 ? 0 : ((max - min) / max) * 100;
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || 'major',
    ...finding,
  });
}

function evaluateStudy(study) {
  const findings = [];
  const randomization = study.randomization || {};
  const blinding = study.blinding || {};

  if (!randomization.sequenceEvidence) {
    addFinding(findings, {
      type: 'missing-randomization-sequence',
      severity: 'critical',
      studyId: study.id,
      message: 'Randomization sequence evidence is missing from the reviewer packet.',
      action: 'attach_randomization_sequence',
    });
  }

  if (!randomization.allocationConcealment) {
    addFinding(findings, {
      type: 'missing-allocation-concealment',
      severity: 'critical',
      studyId: study.id,
      message: 'Allocation concealment is not documented before outcome review.',
      action: 'document_allocation_concealment',
    });
  }

  const maxArmImbalancePercent = Number(randomization.maxArmImbalancePercent || 25);
  const armImbalance = percentArmImbalance(study.arms);
  if (armImbalance > maxArmImbalancePercent) {
    addFinding(findings, {
      type: 'arm-size-imbalance',
      severity: 'major',
      studyId: study.id,
      metric: Number(armImbalance.toFixed(1)),
      threshold: maxArmImbalancePercent,
      message: `Arm sizes differ by ${armImbalance.toFixed(1)}%, above the configured ${maxArmImbalancePercent}% threshold.`,
      action: 'explain_randomization_imbalance',
    });
  }

  for (const factor of asArray(randomization.stratificationFactors)) {
    const imbalance = percentStratumImbalance(study.arms, factor);
    if (imbalance > 50) {
      addFinding(findings, {
        type: 'stratification-imbalance',
        severity: 'major',
        studyId: study.id,
        stratum: factor,
        metric: Number(imbalance.toFixed(1)),
        threshold: 50,
        message: `Stratum ${factor} differs by ${imbalance.toFixed(1)}% between arms.`,
        action: 'review_stratification_balance',
      });
    }
  }

  const requiredRoles = isClinicalStudy(study)
    ? ['participant', 'careProvider', 'outcomeAssessor', 'analyst']
    : ['outcomeAssessor', 'analyst'];
  const missingRoles = requiredRoles.filter((role) => blinding[role] !== true);
  if (missingRoles.length > 0) {
    addFinding(findings, {
      type: 'missing-blinding-role',
      severity: 'major',
      studyId: study.id,
      roles: missingRoles,
      message: `Blinding is missing for ${missingRoles.join(', ')}.`,
      action: 'document_blinding_roles',
    });
  }

  const exposures = asArray(blinding.armLabelExposure);
  if (exposures.length > 0) {
    addFinding(findings, {
      type: 'arm-label-leakage',
      severity: 'major',
      studyId: study.id,
      artifacts: exposures.map((item) => item.artifact || 'unknown artifact'),
      message: 'Arm labels are visible in analysis or reviewer artifacts before endpoint lock.',
      action: 'mask_arm_labels_before_analysis',
    });
  }

  for (const event of asArray(blinding.unblindingEvents)) {
    if (event.beforePrimaryEndpointLock) {
      addFinding(findings, {
        type: 'early-unblinding-event',
        severity: 'major',
        studyId: study.id,
        role: event.role || 'unknown role',
        occurredAt: event.occurredAt || 'unknown date',
        message: 'Unblinding occurred before primary endpoint lock.',
        action: 'explain_unblinding_event',
      });
    }
  }

  for (const exclusion of asArray(study.exclusions)) {
    if (exclusion.afterRandomization && !exclusion.blindedDecision) {
      addFinding(findings, {
        type: 'unblinded-post-randomization-exclusion',
        severity: 'major',
        studyId: study.id,
        participantId: exclusion.participantId || 'unknown participant',
        reason: exclusion.reason || 'not provided',
        message: 'Post-randomization exclusion lacks blinded decision evidence.',
        action: 'justify_unblinded_exclusion',
      });
    }
  }

  return findings;
}

function summarize(findings, studyCount) {
  return {
    studyCount,
    randomizationIssues: findings.filter((finding) => RANDOMIZATION_FINDINGS.has(finding.type)).length,
    blindingIssues: findings.filter((finding) => BLINDING_FINDINGS.has(finding.type)).length,
    exclusionIssues: findings.filter((finding) => EXCLUSION_FINDINGS.has(finding.type)).length,
    balanceIssues: findings.filter((finding) => BALANCE_FINDINGS.has(finding.type)).length,
  };
}

function calculateReadinessScore(findings) {
  const score = findings.reduce((total, finding) => {
    if (finding.severity === 'critical') return total - 25;
    if (finding.severity === 'major') return total - 15;
    return total - 8;
  }, 100);
  return Math.max(0, score);
}

function chooseDecision(findings) {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return 'hold-for-review';
  }
  if (findings.length > 0) {
    return 'needs-author-response';
  }
  return 'approved';
}

function buildRequiredActions(findings) {
  const seen = new Set();
  return findings
    .map((finding) => ({
      type: finding.action,
      studyId: finding.studyId,
      findingType: finding.type,
      message: actionMessage(finding),
    }))
    .filter((action) => {
      const key = `${action.type}:${action.studyId}:${action.findingType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function actionMessage(finding) {
  const messages = {
    attach_randomization_sequence: 'Attach sequence generation evidence or randomization service export.',
    document_allocation_concealment: 'Document who concealed allocation and when assignments became visible.',
    explain_randomization_imbalance: 'Explain observed arm imbalance and whether it affects the primary endpoint.',
    review_stratification_balance: 'Review stratification balance and update the analysis caveat.',
    document_blinding_roles: 'Document blinded roles or explain why a role could not be blinded.',
    mask_arm_labels_before_analysis: 'Mask labels in notebooks, tables, and reviewer packets before endpoint lock.',
    explain_unblinding_event: 'Explain unblinding timing, affected roles, and sensitivity analysis impact.',
    justify_unblinded_exclusion: 'Justify post-randomization exclusions with blinded adjudication evidence.',
  };
  return messages[finding.action] || finding.message;
}

function buildDigest(input) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

function evaluateRandomizationBlindingIntegrity(packet) {
  const studies = asArray(packet.studies);
  const findings = studies.flatMap(evaluateStudy);
  const summary = summarize(findings, studies.length);
  const decision = chooseDecision(findings);
  const readinessScore = decision === 'approved' ? 100 : calculateReadinessScore(findings);

  return {
    manuscriptId: cleanText(packet.manuscriptId) || 'unknown-manuscript',
    generatedAt: packet.generatedAt || new Date().toISOString(),
    decision,
    readinessScore,
    summary,
    findings,
    requiredActions: buildRequiredActions(findings),
    auditDigest: buildDigest({studies, findings, summary, decision}),
  };
}

function buildReviewerPacket(result) {
  const lines = [
    '# Randomization Blinding Integrity Assistant Report',
    '',
    `Manuscript: ${result.manuscriptId}`,
    `Generated: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    `Readiness score: ${result.readinessScore}`,
    `Findings: ${result.findings.length}`,
    `Audit digest: ${result.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Studies reviewed: ${result.summary.studyCount}`,
    `- Randomization issues: ${result.summary.randomizationIssues}`,
    `- Blinding issues: ${result.summary.blindingIssues}`,
    `- Exclusion issues: ${result.summary.exclusionIssues}`,
    `- Balance issues: ${result.summary.balanceIssues}`,
    '',
    '## Findings',
    '',
  ];

  if (result.findings.length === 0) {
    lines.push('- No randomization or blinding integrity findings.');
  } else {
    for (const finding of result.findings) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.type} in ${finding.studyId}: ${finding.message}`);
    }
  }

  lines.push('', '## Required Actions', '');
  if (result.requiredActions.length === 0) {
    lines.push('- No author action required.');
  } else {
    for (const action of result.requiredActions) {
      lines.push(`- ${action.type} (${action.studyId}): ${action.message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  evaluateRandomizationBlindingIntegrity,
  buildReviewerPacket,
};
