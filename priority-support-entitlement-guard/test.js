const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  evaluateSupportCase,
  evaluateSupportPacket,
  renderMarkdown,
  renderSvg,
  writeReports,
} = require('./index');
const { cleanPacket, supportPacket } = require('./sample-data');

function runTests() {
  const cleanAudit = evaluateSupportPacket(cleanPacket);
  assert.strictEqual(cleanAudit.decision, 'publish-priority-support-routing');
  assert.strictEqual(cleanAudit.summary.blockers, 0);
  assert.strictEqual(cleanAudit.summary.standardRoutedCases, 1);

  const audit = evaluateSupportPacket(supportPacket);
  assert.strictEqual(audit.decision, 'hold-priority-support-routing');
  assert.strictEqual(audit.summary.casesChecked, 4);
  assert.strictEqual(audit.summary.allowedPriorityCases, 1);
  assert(audit.summary.billableOverage > 300);

  const codes = new Set(audit.findings.map((finding) => finding.code));
  assert(codes.has('priority-support-not-entitled'));
  assert(codes.has('unpaid-invoice-premium-hold'));
  assert(codes.has('requester-not-on-support-roster'));
  assert(codes.has('requested-sla-exceeds-entitlement'));
  assert(codes.has('sensitive-data-routing-missing'));
  assert(codes.has('enterprise-escalation-approval-missing'));

  const firstResult = evaluateSupportCase(supportPacket.cases[0], {
    unpaidBalanceHoldThreshold: 100,
    supportOverageRate: 4.25,
  });
  assert.strictEqual(firstResult.decision, 'allow-priority-support');
  assert.strictEqual(firstResult.targetTier, 'enterprise');

  const overageResult = evaluateSupportCase(supportPacket.cases[2], {
    unpaidBalanceHoldThreshold: 100,
    supportOverageRate: 4.25,
  });
  assert.strictEqual(overageResult.decision, 'allow-with-overage-billing');
  assert.strictEqual(overageResult.billableOverage, 340);

  const markdown = renderMarkdown(audit);
  assert(markdown.includes('Priority Support Entitlement Guard'));
  assert(markdown.includes('hold-priority-support-routing'));

  const svg = renderSvg(audit);
  assert(svg.includes('<svg'));
  assert(svg.includes('Priority Support Entitlement Guard'));

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'support-entitlement-'));
  const reports = writeReports(audit, tempDir);
  assert(fs.existsSync(reports.jsonPath));
  assert(fs.existsSync(reports.markdownPath));
  assert(fs.existsSync(reports.svgPath));
  const written = JSON.parse(fs.readFileSync(reports.jsonPath, 'utf8'));
  assert.strictEqual(written.decision, 'hold-priority-support-routing');
}

if (require.main === module) {
  runTests();
  console.log('priority-support-entitlement-guard tests passed');
}

module.exports = { runTests };
