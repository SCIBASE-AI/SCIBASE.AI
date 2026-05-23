const crypto = require('node:crypto');

function stableDigest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function daysBetween(start, end) {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  return (endTime - startTime) / (24 * 60 * 60 * 1000);
}

function addFinding(result, request, finding) {
  result.findings.push({
    requestId: request.id,
    customerId: request.customerId,
    ...finding,
  });
}

function addAction(result, action) {
  if (!result.requiredActions.some((item) => item.type === action.type && item.requestId === action.requestId)) {
    result.requiredActions.push(action);
  }
}

function evaluatePaymentAuthorizationFreshness(packet) {
  const requests = Array.isArray(packet?.chargeRequests) ? packet.chargeRequests : [];
  const generatedAt = packet?.generatedAt || new Date(0).toISOString();
  const result = {
    batchId: packet?.batchId || 'unknown-payment-batch',
    generatedAt,
    decision: 'approved',
    authorizationScore: 100,
    summary: {
      requestsReviewed: requests.length,
      blockedCharges: 0,
      reviewCharges: 0,
      expiredInstruments: 0,
      staleMandates: 0,
      authorizationIssues: 0,
      varianceIssues: 0,
    },
    findings: [],
    requiredActions: [],
  };

  for (const request of requests) {
    const instrument = request.paymentInstrument || {};
    const blockerTypes = new Set();
    const reviewTypes = new Set();

    if (instrument.type === 'card') {
      if (instrument.expiresAt && Date.parse(instrument.expiresAt) < Date.parse(generatedAt)) {
        result.summary.expiredInstruments += 1;
        blockerTypes.add('instrument');
        addFinding(result, request, {
          type: 'expired-payment-instrument',
          severity: 'blocker',
          message: `Saved card expired at ${instrument.expiresAt}.`,
        });
        addAction(result, {
          type: 'collect_updated_payment_method',
          requestId: request.id,
          owner: 'billing_ops',
        });
      }

      const scaAge = daysBetween(instrument.scaAuthenticatedAt, generatedAt);
      if (scaAge !== null && scaAge > Number(instrument.scaMaxAgeDays || 0)) {
        result.summary.staleMandates += 1;
        blockerTypes.add('mandate');
        addFinding(result, request, {
          type: 'stale-sca-mandate',
          severity: 'blocker',
          message: `SCA authentication age is ${scaAge.toFixed(1)} days, above ${instrument.scaMaxAgeDays} days.`,
        });
        addAction(result, {
          type: 'refresh_sca_mandate',
          requestId: request.id,
          owner: 'billing_ops',
        });
      }
    }

    if (instrument.type === 'ach' || instrument.type === 'direct_debit') {
      if (!instrument.mandateSignedAt) {
        result.summary.authorizationIssues += 1;
        reviewTypes.add('mandate');
        addFinding(result, request, {
          type: 'missing-debit-mandate',
          severity: 'major',
          message: 'ACH/direct-debit charge lacks signed debit authorization evidence.',
        });
        addAction(result, {
          type: 'collect_debit_mandate',
          requestId: request.id,
          owner: 'finance_ops',
        });
      }

      const covered = new Set(Array.isArray(instrument.mandateCoversStreams)
        ? instrument.mandateCoversStreams
        : []);
      if (!covered.has(request.revenueStream)) {
        result.summary.authorizationIssues += 1;
        reviewTypes.add('mandate');
        addFinding(result, request, {
          type: 'mandate-scope-mismatch',
          severity: 'major',
          message: `Mandate does not cover ${request.revenueStream}.`,
        });
        addAction(result, {
          type: 'update_mandate_scope',
          requestId: request.id,
          owner: 'finance_ops',
        });
      }
    }

    if (instrument.autopayConsent === false) {
      result.summary.authorizationIssues += 1;
      reviewTypes.add('consent');
      addFinding(result, request, {
        type: 'missing-autopay-consent',
        severity: 'major',
        message: 'Autopay charge lacks active customer consent.',
      });
      addAction(result, {
        type: 'collect_autopay_consent',
        requestId: request.id,
        owner: 'billing_ops',
      });
    }

    const threshold = Number(request.varianceThresholdPercent ?? 0);
    if (Number.isFinite(request.authorizedAmount) && request.authorizedAmount > 0) {
      const variance = Math.abs(Number(request.amount || 0) - request.authorizedAmount) / request.authorizedAmount * 100;
      if (variance > threshold && !request.customerNoticeSentAt) {
        result.summary.varianceIssues += 1;
        blockerTypes.add('variance');
        addFinding(result, request, {
          type: 'amount-variance-without-notice',
          severity: 'blocker',
          message: `Charge amount variance is ${variance.toFixed(1)}%, above ${threshold}% without customer notice.`,
        });
        addAction(result, {
          type: 'send_customer_charge_notice',
          requestId: request.id,
          owner: 'billing_ops',
        });
      }
    }

    if (request.authorizedCurrency && request.currency !== request.authorizedCurrency && !request.customerNoticeSentAt) {
      result.summary.varianceIssues += 1;
      blockerTypes.add('variance');
      addFinding(result, request, {
        type: 'currency-variance-without-notice',
        severity: 'blocker',
        message: `Charge currency ${request.currency} differs from authorized ${request.authorizedCurrency} without customer notice.`,
      });
      addAction(result, {
        type: 'reauthorize_currency',
        requestId: request.id,
        owner: 'billing_ops',
      });
    }

    if (blockerTypes.size > 0) {
      result.summary.blockedCharges += 1;
      addFinding(result, request, {
        type: 'unsafe-charge-release',
        severity: 'blocker',
        message: 'Charge release is blocked until payment authorization freshness issues are resolved.',
      });
      addAction(result, {
        type: 'hold_charge_release',
        requestId: request.id,
        owner: 'finance_ops',
      });
    } else if (reviewTypes.size > 0) {
      result.summary.reviewCharges += 1;
    }
  }

  const penalty =
    result.summary.expiredInstruments * 25
    + result.summary.staleMandates * 20
    + result.summary.authorizationIssues * 15
    + result.summary.varianceIssues * 20
    + result.summary.blockedCharges * 20;
  result.authorizationScore = Math.max(0, 100 - penalty);

  if (result.summary.blockedCharges > 0) result.decision = 'block-unsafe-charges';
  else if (result.summary.reviewCharges > 0 || result.summary.authorizationIssues > 0) result.decision = 'needs-finance-review';

  result.auditDigest = stableDigest({
    batchId: result.batchId,
    generatedAt: result.generatedAt,
    decision: result.decision,
    score: result.authorizationScore,
    findings: result.findings.map((finding) => [finding.requestId, finding.type, finding.severity]),
    actions: result.requiredActions.map((action) => [action.requestId, action.type]),
  });

  return result;
}

function buildFinancePacket(result) {
  const findingRows = result.findings.length
    ? result.findings.map((finding) => `- ${finding.severity}: ${finding.type} on ${finding.requestId} - ${finding.message}`).join('\n')
    : '- none';
  const actionRows = result.requiredActions.length
    ? result.requiredActions.map((action) => `- ${action.type} for ${action.requestId} (${action.owner})`).join('\n')
    : '- none';

  return [
    '# Payment Authorization Freshness Guard Report',
    '',
    `Batch: ${result.batchId}`,
    `Generated at: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    `Authorization score: ${result.authorizationScore}`,
    `Findings: ${result.findings.length}`,
    `Required actions: ${result.requiredActions.length}`,
    `Audit digest: ${result.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Requests reviewed: ${result.summary.requestsReviewed}`,
    `- Blocked charges: ${result.summary.blockedCharges}`,
    `- Review charges: ${result.summary.reviewCharges}`,
    `- Expired instruments: ${result.summary.expiredInstruments}`,
    `- Stale mandates: ${result.summary.staleMandates}`,
    `- Authorization issues: ${result.summary.authorizationIssues}`,
    `- Variance issues: ${result.summary.varianceIssues}`,
    '',
    '## Findings',
    '',
    findingRows,
    '',
    '## Required Actions',
    '',
    actionRows,
    '',
  ].join('\n');
}

function buildSummarySvg(result) {
  const scoreWidth = Math.max(24, Math.min(760, Math.round(result.authorizationScore * 7.6)));
  const findingWidth = Math.max(24, Math.min(760, result.findings.length * 76));
  const actionWidth = Math.max(24, Math.min(760, result.requiredActions.length * 76));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Payment authorization freshness guard summary">
  <rect width="960" height="540" fill="#1d2330"/>
  <rect x="48" y="44" width="864" height="452" rx="6" fill="#f8fafc" opacity="0.94"/>
  <text x="78" y="98" font-family="Arial, sans-serif" font-size="28" fill="#1d2330" font-weight="700">Payment Authorization Freshness</text>
  <text x="78" y="132" font-family="Arial, sans-serif" font-size="16" fill="#3d4657">Decision: ${escapeXml(result.decision)} | Digest: ${escapeXml(result.auditDigest)}</text>
  <text x="78" y="188" font-family="Arial, sans-serif" font-size="18" fill="#1d2330">Authorization score</text>
  <rect x="78" y="206" width="760" height="34" fill="#dbe4f0"/>
  <rect x="78" y="206" width="${scoreWidth}" height="34" fill="#2f855a"/>
  <text x="852" y="230" font-family="Arial, sans-serif" font-size="18" fill="#1d2330">${result.authorizationScore}</text>
  <text x="78" y="294" font-family="Arial, sans-serif" font-size="18" fill="#1d2330">Findings</text>
  <rect x="78" y="312" width="760" height="34" fill="#dbe4f0"/>
  <rect x="78" y="312" width="${findingWidth}" height="34" fill="#b45309"/>
  <text x="852" y="336" font-family="Arial, sans-serif" font-size="18" fill="#1d2330">${result.findings.length}</text>
  <text x="78" y="400" font-family="Arial, sans-serif" font-size="18" fill="#1d2330">Required actions</text>
  <rect x="78" y="418" width="760" height="34" fill="#dbe4f0"/>
  <rect x="78" y="418" width="${actionWidth}" height="34" fill="#1d4ed8"/>
  <text x="852" y="442" font-family="Arial, sans-serif" font-size="18" fill="#1d2330">${result.requiredActions.length}</text>
</svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  evaluatePaymentAuthorizationFreshness,
  buildFinancePacket,
  buildSummarySvg,
};
