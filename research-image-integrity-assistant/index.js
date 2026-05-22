function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function roundMicrometers(value) {
  return Math.round(value * 100) / 100;
}

function panelReference(figure, panel) {
  return `${figure.id}:${panel.id}`;
}

function imageIntegrityAction(type, target, reason) {
  return {type, target, reason};
}

function severityCounts(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
}

function evaluateImageIntegrity(input) {
  const figures = normalizeList(input.figures);
  const rawImages = normalizeList(input.rawImages);
  const processingLogs = normalizeList(input.processingLogs);
  const rawById = new Map(rawImages.map((image) => [image.id, image]));
  const logById = new Map(processingLogs.map((log) => [log.id, log]));
  const findings = [];
  const requiredActions = [];
  const panelsByHash = new Map();
  let panelCount = 0;

  for (const figure of figures) {
    for (const panel of normalizeList(figure.panels)) {
      panelCount += 1;
      if (panel.perceptualHash) {
        const panelSet = panelsByHash.get(panel.perceptualHash) || [];
        panelSet.push({figure, panel});
        panelsByHash.set(panel.perceptualHash, panelSet);
      }
    }
  }

  for (const [perceptualHash, panelSet] of panelsByHash.entries()) {
    if (panelSet.length > 1) {
      const panels = panelSet.map(({figure, panel}) => panelReference(figure, panel));
      findings.push({
        type: 'duplicate-panel',
        severity: 'critical',
        panels,
        perceptualHash,
        message: `Panels share perceptual hash ${perceptualHash}`,
      });
      requiredActions.push(imageIntegrityAction(
        'verify_panel_uniqueness',
        panels.join(', '),
        'duplicated image panels need raw-data review before peer-review release'
      ));
    }
  }

  for (const figure of figures) {
    for (const panel of normalizeList(figure.panels)) {
      const ref = panelReference(figure, panel);
      const rawImage = rawById.get(panel.rawImageId);
      const processingLog = logById.get(panel.processingLogId);

      if (!rawImage) {
        findings.push({
          type: 'missing-raw-provenance',
          severity: 'critical',
          panel: ref,
          rawImageId: panel.rawImageId || '',
          message: `${ref} lacks linked raw image provenance`,
        });
        requiredActions.push(imageIntegrityAction(
          'attach_raw_image_provenance',
          ref,
          'reviewers need raw-image checksum, capture time, and pixel-size metadata'
        ));
      }

      if (!processingLog) {
        findings.push({
          type: 'missing-processing-log',
          severity: 'critical',
          panel: ref,
          processingLogId: panel.processingLogId || '',
          message: `${ref} lacks a linked processing history`,
        });
        requiredActions.push(imageIntegrityAction(
          'attach_processing_log',
          ref,
          'reviewers need auditable crop, contrast, and adjustment history'
        ));
      }

      if (rawImage && panel.scaleBarPixels > 0 && panel.scaleBarMicrometers > 0) {
        const expectedMicrometers = roundMicrometers(panel.scaleBarPixels * rawImage.pixelSizeMicrometers);
        const declaredMicrometers = roundMicrometers(panel.scaleBarMicrometers);
        const relativeDifference = expectedMicrometers === 0
          ? 0
          : Math.abs(declaredMicrometers - expectedMicrometers) / expectedMicrometers;

        if (relativeDifference > 0.05) {
          findings.push({
            type: 'scale-bar-mismatch',
            severity: 'major',
            panel: ref,
            expectedMicrometers,
            declaredMicrometers,
            pixelSizeMicrometers: rawImage.pixelSizeMicrometers,
            scaleBarPixels: panel.scaleBarPixels,
            message: `${ref} declares ${declaredMicrometers} um but metadata implies ${expectedMicrometers} um`,
          });
          requiredActions.push(imageIntegrityAction(
            'reconcile_scale_bar_metadata',
            ref,
            'declared scale bar must match raw pixel-size metadata before reviewer approval'
          ));
        }
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
  const integrityScore = Math.max(0, 100 - criticalCount * 35 - majorCount * 20 - minorCount * 10);

  return {
    manuscriptId: input.manuscriptId,
    generatedAt: input.generatedAt,
    decision,
    integrityScore,
    findings,
    requiredActions,
    summary: {
      figureCount: figures.length,
      panelCount,
      rawImageCount: rawImages.length,
      processingLogCount: processingLogs.length,
      duplicatePanelGroups: findings.filter((finding) => finding.type === 'duplicate-panel').length,
      missingRawProvenance: findings.filter((finding) => finding.type === 'missing-raw-provenance').length,
      missingProcessingLogs: findings.filter((finding) => finding.type === 'missing-processing-log').length,
      scaleBarMismatches: findings.filter((finding) => finding.type === 'scale-bar-mismatch').length,
      severityCounts: counts,
    },
  };
}

function buildReviewerReport(result) {
  const lines = [
    '# Research Image Integrity Assistant Report',
    '',
    `Manuscript: ${result.manuscriptId}`,
    `Generated: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    `Integrity score: ${result.integrityScore}`,
    '',
    '## Packet Summary',
    '',
    `Figures: ${result.summary.figureCount}`,
    `Panels: ${result.summary.panelCount}`,
    `Raw images: ${result.summary.rawImageCount}`,
    `Processing logs: ${result.summary.processingLogCount}`,
    `Duplicate panel groups: ${result.summary.duplicatePanelGroups}`,
    `Scale-bar mismatches: ${result.summary.scaleBarMismatches}`,
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
  evaluateImageIntegrity,
  buildReviewerReport,
};
