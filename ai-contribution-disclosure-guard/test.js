const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  evaluateContribution,
  evaluateReputationPacket,
  renderMarkdown,
  renderSvg,
  writeReports,
} = require('./index');
const { cleanPacket, reputationPacket } = require('./sample-data');

function runTests() {
  const cleanAudit = evaluateReputationPacket(cleanPacket);
  assert.strictEqual(cleanAudit.decision, 'publish-reputation-update');
  assert.strictEqual(cleanAudit.summary.withheldPoints, 0);

  const audit = evaluateReputationPacket(reputationPacket);
  assert.strictEqual(audit.decision, 'hold-reputation-update');
  assert.strictEqual(audit.summary.contributionsChecked, 4);
  assert.strictEqual(audit.summary.basePoints, 160);
  assert(audit.summary.withheldPoints > 80);

  const codes = new Set(audit.findings.map((finding) => finding.code));
  assert(codes.has('ai-assistance-undisclosed'));
  assert(codes.has('human-verification-missing'));
  assert(codes.has('generated-text-signal-undisclosed'));
  assert(codes.has('artifact-provenance-missing'));
  assert(codes.has('credit-role-evidence-missing'));

  const firstResult = evaluateContribution(reputationPacket.contributions[0], { minimumReviewQuality: 0.72 });
  assert.strictEqual(firstResult.decision, 'allow-reputation-credit');
  assert.strictEqual(firstResult.awardedPoints, firstResult.basePoints);

  const markdown = renderMarkdown(audit);
  assert(markdown.includes('AI-Assisted Contribution Disclosure Guard'));
  assert(markdown.includes('hold-reputation-update'));

  const svg = renderSvg(audit);
  assert(svg.includes('<svg'));
  assert(svg.includes('AI Contribution Disclosure Guard'));

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-disclosure-'));
  const reports = writeReports(audit, tempDir);
  assert(fs.existsSync(reports.jsonPath));
  assert(fs.existsSync(reports.markdownPath));
  assert(fs.existsSync(reports.svgPath));
  const written = JSON.parse(fs.readFileSync(reports.jsonPath, 'utf8'));
  assert.strictEqual(written.decision, 'hold-reputation-update');
}

if (require.main === module) {
  runTests();
  console.log('ai-contribution-disclosure-guard tests passed');
}

module.exports = { runTests };
