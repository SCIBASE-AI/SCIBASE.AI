const DEFAULT_POLICY = {
  staleArtifactReviewDays: 7,
  annualizationFactor: 12,
};

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sumBy(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function artifactHasDeletionConflict(artifact, deletionRequests) {
  return Boolean(artifact.legalHold && deletionRequests.some((request) => request.artifactID === artifact.id));
}

function evaluateAccount(account, policy = DEFAULT_POLICY) {
  const privateMeteredGB = account.usage.privateProjectGB + account.usage.datasetSnapshotGB;
  const privateBillableGB = privateMeteredGB + account.usage.unmeteredExternalBucketGB;
  const privateOverageGB = Math.max(0, privateBillableGB - account.contract.privateProjectIncludedGB);
  const artifactOverageGB = Math.max(0, account.usage.reproducibilityArtifactGB - account.contract.artifactIncludedGB);
  const licensedCacheOverageGB = Math.max(0, account.usage.licensedExportCacheGB - account.contract.licensedCacheIncludedGB);

  const privateChargeUSD = privateOverageGB * account.contract.privateOverageRateUSD;
  const artifactChargeUSD = artifactOverageGB * account.contract.artifactOverageRateUSD;
  const licensedCacheChargeUSD = licensedCacheOverageGB * account.contract.licensedCacheRateUSD;
  const totalChargeUSD = roundMoney(privateChargeUSD + artifactChargeUSD + licensedCacheChargeUSD);
  const unmeteredLeakageUSD = roundMoney(account.usage.unmeteredExternalBucketGB * account.contract.privateOverageRateUSD);

  const staleArtifacts = account.artifacts.filter((artifact) => !artifact.legalHold && artifact.ageDays > artifact.retentionDays + policy.staleArtifactReviewDays);
  const deletionHoldConflicts = account.artifacts.filter((artifact) => artifactHasDeletionConflict(artifact, account.deletionRequests));
  const purgeCandidateGB = roundMoney(sumBy(staleArtifacts, (artifact) => artifact.gb));

  const reasons = [];
  if (privateOverageGB > 0) {
    reasons.push(`${privateOverageGB} GB private storage over quota`);
  }
  if (artifactOverageGB > 0) {
    reasons.push(`${artifactOverageGB} GB reproducibility artifact storage over quota`);
  }
  if (licensedCacheOverageGB > 0) {
    reasons.push(`${licensedCacheOverageGB} GB licensed export cache over quota`);
  }
  if (account.usage.unmeteredExternalBucketGB > 0) {
    reasons.push(`${account.usage.unmeteredExternalBucketGB} GB external bucket usage missing billable meter tags`);
  }
  if (staleArtifacts.length > 0) {
    reasons.push(`${staleArtifacts.length} stale artifact(s) past retention grace`);
  }
  if (deletionHoldConflicts.length > 0) {
    reasons.push(`${deletionHoldConflicts.length} deletion request(s) blocked by legal hold`);
  }

  let decision = 'monitor';
  if (deletionHoldConflicts.length > 0 || account.usage.unmeteredExternalBucketGB > 0 || staleArtifacts.length > 0) {
    decision = 'hold_for_ops_review';
  } else if (totalChargeUSD >= account.contract.invoiceMinimumUSD) {
    decision = 'invoice_ready';
  }

  const recommendedActions = [];
  if (totalChargeUSD >= account.contract.invoiceMinimumUSD) {
    recommendedActions.push(`prepare ${account.billingPeriod} storage overage line item for $${totalChargeUSD}`);
  }
  if (account.usage.unmeteredExternalBucketGB > 0) {
    recommendedActions.push('attach meter tags to external bucket storage before invoice release');
  }
  if (staleArtifacts.length > 0) {
    recommendedActions.push(`review or purge ${purgeCandidateGB} GB of stale artifacts`);
  }
  if (deletionHoldConflicts.length > 0) {
    recommendedActions.push('route deletion-hold conflict to compliance owner before changing retention state');
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('no billing action required this period');
  }

  return {
    accountID: account.accountID,
    institution: account.institution,
    plan: account.plan,
    billingPeriod: account.billingPeriod,
    decision,
    reasons,
    usage: {
      privateMeteredGB,
      privateBillableGB,
      artifactBillableGB: account.usage.reproducibilityArtifactGB,
      licensedCacheBillableGB: account.usage.licensedExportCacheGB,
      unmeteredExternalBucketGB: account.usage.unmeteredExternalBucketGB,
    },
    overage: {
      privateOverageGB,
      artifactOverageGB,
      licensedCacheOverageGB,
    },
    chargesUSD: {
      privateStorage: roundMoney(privateChargeUSD),
      reproducibilityArtifacts: roundMoney(artifactChargeUSD),
      licensedExportCache: roundMoney(licensedCacheChargeUSD),
      total: totalChargeUSD,
      annualizedRunRate: roundMoney(totalChargeUSD * policy.annualizationFactor),
      unmeteredLeakage: unmeteredLeakageUSD,
    },
    controls: {
      staleArtifacts: staleArtifacts.map((artifact) => artifact.id),
      deletionHoldConflicts: deletionHoldConflicts.map((artifact) => artifact.id),
      purgeCandidateGB,
    },
    recommendedActions,
  };
}

function evaluateStorageOverage(accounts, policy = DEFAULT_POLICY) {
  const accountResults = accounts.map((account) => evaluateAccount(account, policy));
  const summary = {
    accountsEvaluated: accountResults.length,
    invoiceReadyCount: accountResults.filter((account) => account.decision === 'invoice_ready').length,
    holdCount: accountResults.filter((account) => account.decision === 'hold_for_ops_review').length,
    monitorCount: accountResults.filter((account) => account.decision === 'monitor').length,
    monthlyRecoverableUSD: roundMoney(sumBy(accountResults, (account) => account.chargesUSD.total)),
    annualizedRecoverableUSD: roundMoney(sumBy(accountResults, (account) => account.chargesUSD.annualizedRunRate)),
    unmeteredLeakageUSD: roundMoney(sumBy(accountResults, (account) => account.chargesUSD.unmeteredLeakage)),
    purgeCandidateGB: roundMoney(sumBy(accountResults, (account) => account.controls.purgeCandidateGB)),
    deletionHoldConflicts: sumBy(accountResults, (account) => account.controls.deletionHoldConflicts.length),
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    accounts: accountResults,
  };
}

function formatCurrency(value) {
  return `$${roundMoney(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function buildMarkdownReport(evaluation) {
  const lines = [
    '# Storage Overage Billing Guard Report',
    '',
    `Generated: ${evaluation.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Accounts evaluated: ${evaluation.summary.accountsEvaluated}`,
    `- Invoice-ready accounts: ${evaluation.summary.invoiceReadyCount}`,
    `- Ops-review holds: ${evaluation.summary.holdCount}`,
    `- Monthly recoverable storage revenue: ${formatCurrency(evaluation.summary.monthlyRecoverableUSD)}`,
    `- Annualized run rate: ${formatCurrency(evaluation.summary.annualizedRecoverableUSD)}`,
    `- Unmetered leakage caught: ${formatCurrency(evaluation.summary.unmeteredLeakageUSD)}`,
    `- Purge candidates: ${evaluation.summary.purgeCandidateGB} GB`,
    `- Deletion-hold conflicts: ${evaluation.summary.deletionHoldConflicts}`,
    '',
    '## Account Decisions',
    '',
    '| Institution | Decision | Charge | Overage | Actions |',
    '| --- | --- | ---: | --- | --- |',
  ];

  evaluation.accounts.forEach((account) => {
    const overage = [
      `${account.overage.privateOverageGB} GB private`,
      `${account.overage.artifactOverageGB} GB artifacts`,
      `${account.overage.licensedCacheOverageGB} GB licensed cache`,
    ].join('<br>');
    lines.push(`| ${account.institution} | ${account.decision} | ${formatCurrency(account.chargesUSD.total)} | ${overage} | ${account.recommendedActions.join('<br>')} |`);
  });

  return `${lines.join('\n')}\n`;
}

function buildSummarySVG(evaluation) {
  const maxCharge = Math.max(...evaluation.accounts.map((account) => account.chargesUSD.total), 1);
  const bars = evaluation.accounts.map((account, index) => {
    const width = Math.max(12, Math.round((account.chargesUSD.total / maxCharge) * 520));
    const y = 185 + index * 76;
    const color = account.decision === 'hold_for_ops_review' ? '#D97706' : account.decision === 'invoice_ready' ? '#0E7490' : '#64748B';
    return [
      `<text x="70" y="${y - 10}" font-size="18" font-family="Arial" fill="#111827">${account.institution}</text>`,
      `<rect x="70" y="${y}" width="${width}" height="24" rx="6" fill="${color}" />`,
      `<text x="${90 + width}" y="${y + 18}" font-size="16" font-family="Arial" fill="#111827">${formatCurrency(account.chargesUSD.total)} · ${account.decision}</text>`,
    ].join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="540" viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg">
  <rect width="960" height="540" fill="#F8FAFC"/>
  <rect x="48" y="42" width="864" height="456" rx="20" fill="#FFFFFF" stroke="#CBD5E1"/>
  <text x="70" y="92" font-size="30" font-family="Arial" font-weight="700" fill="#0F172A">Storage Overage Billing Guard</text>
  <text x="70" y="126" font-size="18" font-family="Arial" fill="#475569">Monthly recoverable: ${formatCurrency(evaluation.summary.monthlyRecoverableUSD)} · Annualized: ${formatCurrency(evaluation.summary.annualizedRecoverableUSD)}</text>
  <text x="70" y="152" font-size="16" font-family="Arial" fill="#475569">Holds: ${evaluation.summary.holdCount} · Unmetered leakage: ${formatCurrency(evaluation.summary.unmeteredLeakageUSD)} · Purge candidates: ${evaluation.summary.purgeCandidateGB} GB</text>
  ${bars.join('\n')}
</svg>
`;
}

module.exports = {
  DEFAULT_POLICY,
  buildMarkdownReport,
  buildSummarySVG,
  evaluateAccount,
  evaluateStorageOverage,
  formatCurrency,
  roundMoney,
};
