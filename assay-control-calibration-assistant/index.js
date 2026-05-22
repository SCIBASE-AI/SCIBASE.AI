function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeControlType(value) {
  return String(value || '').trim().toLowerCase();
}

function roundMetric(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function severityCounts(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
}

function reviewerAction(type, target, reason) {
  return {type, target, reason};
}

function evaluateAssayControlCalibration(input) {
  const assays = normalizeList(input.assays);
  const findings = [];
  const requiredActions = [];
  let controlCount = 0;

  for (const assay of assays) {
    const controls = normalizeList(assay.controls);
    const requiredControls = normalizeList(assay.requiredControls).map(normalizeControlType);
    const controlsByType = new Map();
    controlCount += controls.length;

    for (const control of controls) {
      const type = normalizeControlType(control.type);
      if (!controlsByType.has(type)) {
        controlsByType.set(type, []);
      }
      controlsByType.get(type).push(control);
    }

    for (const requiredType of requiredControls) {
      if (!controlsByType.has(requiredType)) {
        findings.push({
          type: 'missing-control',
          severity: 'critical',
          assayId: assay.id,
          controlType: requiredType,
          message: `${assay.id} lacks required ${requiredType} control evidence`,
        });
        requiredActions.push(reviewerAction(
          'attach_control_evidence',
          `${assay.id}:${requiredType}`,
          'reviewers need explicit control evidence before assay results are released'
        ));
      }
    }

    for (const control of controls) {
      if (normalizeControlType(control.status) && normalizeControlType(control.status) !== 'pass') {
        findings.push({
          type: 'failed-control',
          severity: 'major',
          assayId: assay.id,
          controlId: control.id || '',
          controlType: normalizeControlType(control.type),
          status: normalizeControlType(control.status),
          message: `${assay.id} has failed ${control.type} control ${control.id || ''}`.trim(),
        });
        requiredActions.push(reviewerAction(
          'repeat_or_explain_control',
          `${assay.id}:${control.id || control.type}`,
          'failed control must be repeated or justified before reviewer approval'
        ));
      }
    }

    const calibration = assay.calibration || null;
    if (!calibration) {
      findings.push({
        type: 'missing-calibration',
        severity: 'critical',
        assayId: assay.id,
        message: `${assay.id} lacks linked calibration evidence`,
      });
      requiredActions.push(reviewerAction(
        'attach_calibration_evidence',
        assay.id,
        'assay packets need a calibration curve or standard evidence'
      ));
    } else {
      const acceptedRange = normalizeList(calibration.acceptedRange);
      const minimumFit = Number(acceptedRange[0] || 0);
      const rSquared = Number(calibration.rSquared || 0);
      if (minimumFit > 0 && rSquared < minimumFit) {
        findings.push({
          type: 'weak-calibration-fit',
          severity: 'major',
          assayId: assay.id,
          curveId: calibration.curveId || '',
          observedRSquared: roundMetric(rSquared),
          requiredMinimumRSquared: roundMetric(minimumFit),
          message: `${assay.id} calibration fit ${roundMetric(rSquared)} is below ${roundMetric(minimumFit)}`,
        });
        requiredActions.push(reviewerAction(
          'provide_standard_curve_evidence',
          `${assay.id}:${calibration.curveId || 'calibration'}`,
          'weak standard curve fit needs source standards or recalibration evidence'
        ));
      }

      if (Number(calibration.standards || 0) > 0 && Number(calibration.standards || 0) < 4) {
        findings.push({
          type: 'insufficient-calibration-standards',
          severity: 'major',
          assayId: assay.id,
          curveId: calibration.curveId || '',
          standards: Number(calibration.standards || 0),
          message: `${assay.id} calibration has fewer than four standards`,
        });
        requiredActions.push(reviewerAction(
          'add_calibration_standards',
          `${assay.id}:${calibration.curveId || 'calibration'}`,
          'calibration curve needs enough standards to support reviewer confidence'
        ));
      }

      const driftPercent = Number(calibration.driftPercent || 0);
      const maxDriftPercent = Number(calibration.maxDriftPercent || 0);
      if (maxDriftPercent > 0 && driftPercent > maxDriftPercent) {
        findings.push({
          type: 'calibration-drift',
          severity: 'major',
          assayId: assay.id,
          curveId: calibration.curveId || '',
          driftPercent: roundMetric(driftPercent),
          maxDriftPercent: roundMetric(maxDriftPercent),
          message: `${assay.id} calibration drift ${roundMetric(driftPercent)}% exceeds ${roundMetric(maxDriftPercent)}%`,
        });
        requiredActions.push(reviewerAction(
          'rerun_or_explain_calibration',
          `${assay.id}:${calibration.curveId || 'calibration'}`,
          'calibration drift must be rerun or explained before release'
        ));
      }
    }

    for (const replicate of normalizeList(assay.qcReplicates)) {
      const observed = Number(replicate.coefficientOfVariation || 0);
      const maximum = Number(replicate.maxCoefficientOfVariation || 0);
      if (maximum > 0 && observed > maximum) {
        findings.push({
          type: 'high-qc-variation',
          severity: 'major',
          assayId: assay.id,
          replicateId: replicate.id || '',
          coefficientOfVariation: roundMetric(observed),
          maxCoefficientOfVariation: roundMetric(maximum),
          message: `${assay.id} QC replicate ${replicate.id || ''} CV ${roundMetric(observed)} exceeds ${roundMetric(maximum)}`.trim(),
        });
        requiredActions.push(reviewerAction(
          'repeat_qc_or_explain_variation',
          `${assay.id}:${replicate.id || 'qc-replicate'}`,
          'high replicate variation needs repeat evidence or reviewer-facing explanation'
        ));
      }
    }
  }

  const counts = severityCounts(findings);
  const criticalCount = counts.critical || 0;
  const majorCount = counts.major || 0;
  const minorCount = counts.minor || 0;
  const decision = criticalCount > 0
    ? 'hold-for-review'
    : findings.length > 0
      ? 'needs-author-response'
      : 'approved';
  const readinessScore = Math.max(0, 100 - criticalCount * 30 - majorCount * 15 - minorCount * 5);

  return {
    manuscriptId: input.manuscriptId,
    generatedAt: input.generatedAt,
    decision,
    readinessScore,
    findings,
    requiredActions,
    summary: {
      assayCount: assays.length,
      controlCount,
      missingControls: findings.filter((finding) => finding.type === 'missing-control').length,
      failedControls: findings.filter((finding) => finding.type === 'failed-control').length,
      calibrationIssues: findings.filter((finding) => [
        'missing-calibration',
        'weak-calibration-fit',
        'insufficient-calibration-standards',
        'calibration-drift',
      ].includes(finding.type)).length,
      qcIssues: findings.filter((finding) => finding.type === 'high-qc-variation').length,
      severityCounts: counts,
    },
  };
}

function buildReviewerPacket(result) {
  const lines = [
    '# Assay Control Calibration Assistant Report',
    '',
    `Manuscript: ${result.manuscriptId}`,
    `Generated: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    `Readiness score: ${result.readinessScore}`,
    '',
    '## Packet Summary',
    '',
    `Assays: ${result.summary.assayCount}`,
    `Controls: ${result.summary.controlCount}`,
    `Missing controls: ${result.summary.missingControls}`,
    `Failed controls: ${result.summary.failedControls}`,
    `Calibration issues: ${result.summary.calibrationIssues}`,
    `QC issues: ${result.summary.qcIssues}`,
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
  evaluateAssayControlCalibration,
  buildReviewerPacket,
};
