const REQUIRED_EVIDENCE = ['sponsor_acceptance', 'deliverable_packet', 'finance_owner'];

function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}

function evaluateMilestone(record) {
  const findings = [];
  const evidence = new Set(record.evidence || []);
  const invoice = record.invoice || {};
  const contract = record.contract || {};

  if (!contract.active) findings.push('contract is not active');
  if (!record.poValid) findings.push('purchase order is missing or expired');
  if (record.requiresEthicsApproval && !record.ethicsApprovalCurrent) findings.push('ethics approval is missing or stale');

  for (const item of REQUIRED_EVIDENCE) {
    if (!evidence.has(item)) findings.push(`missing ${item.replaceAll('_', ' ')}`);
  }

  if (invoice.currency !== contract.currency) findings.push('invoice currency does not match contract');
  if (invoice.amount > record.milestoneCap) findings.push('invoice exceeds milestone cap');
  if (record.unappliedCredits > 0) findings.push('open credits must be applied before invoicing');
  if (record.duplicateInvoiceHash) findings.push('possible duplicate invoice hash');

  const noticeAge = daysBetween(record.budgetNoticeSentAt, record.invoiceDate);
  if (Number.isFinite(noticeAge) && noticeAge < contract.noticeDays) {
    findings.push(`budget notice is only ${noticeAge} days old`);
  }

  if (findings.some((finding) => finding.includes('duplicate') || finding.includes('contract is not active'))) {
    return { action: 'BLOCK_INVOICE', findings };
  }

  if (findings.length > 0) {
    return { action: 'HOLD_FOR_REVIEW', findings };
  }

  return { action: 'RELEASE_INVOICE', findings: ['ready to invoice'] };
}

function evaluatePortfolio(records) {
  return records.map((record) => ({
    id: record.id,
    sponsor: record.sponsor,
    milestone: record.milestone,
    ...evaluateMilestone(record),
  }));
}

function renderMarkdownReport(results) {
  const lines = [
    '# Grant milestone billing release check',
    '',
    '| Project | Sponsor | Milestone | Action | Notes |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const result of results) {
    lines.push(`| ${result.id} | ${result.sponsor} | ${result.milestone} | ${result.action} | ${result.findings.join('; ')} |`);
  }

  return `${lines.join('\n')}\n`;
}

module.exports = { evaluateMilestone, evaluatePortfolio, renderMarkdownReport };
