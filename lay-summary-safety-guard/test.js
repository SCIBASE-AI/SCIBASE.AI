const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  evaluateSummary,
  evidenceCoverage,
  fleschKincaidGrade,
  renderMarkdown,
  renderSvg,
  splitSentences,
  tokenize,
  writeReports,
} = require('./index');
const { safePacket, unsafePacket } = require('./sample-data');

function runTests() {
  assert.deepStrictEqual(tokenize('Blood-signal changes!'), ['blood-signal', 'changes']);
  assert.strictEqual(splitSentences('One. Two? Three!').length, 3);
  assert(fleschKincaidGrade('This is a short plain sentence.') < 8);

  const coverage = evidenceCoverage('The cohort had cytokine flare risk signals.', unsafePacket.sourceEvidence);
  assert.strictEqual(coverage.id, 'E1');
  assert(coverage.score > 0.2);

  const unsafeAudit = evaluateSummary(unsafePacket);
  assert.strictEqual(unsafeAudit.decision, 'block-public-share');
  assert.strictEqual(unsafeAudit.shareable, false);
  const unsafeCodes = new Set(unsafeAudit.findings.map((finding) => finding.code));
  assert(unsafeCodes.has('causal-overstatement'));
  assert(unsafeCodes.has('medical-advice-risk'));
  assert(unsafeCodes.has('uncertainty-missing'));
  assert(unsafeCodes.has('jargon-not-explained'));
  assert(unsafeCodes.has('required-limitation-missing'));

  const safeAudit = evaluateSummary(safePacket);
  assert.strictEqual(safeAudit.decision, 'approve-lay-summary');
  assert.strictEqual(safeAudit.findings.length, 0);

  const markdown = renderMarkdown(unsafeAudit);
  assert(markdown.includes('Layperson Summary Safety Guard'));
  assert(markdown.includes('block-public-share'));

  const svg = renderSvg(unsafeAudit);
  assert(svg.includes('<svg'));
  assert(svg.includes('Layperson Summary Safety Guard'));

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lay-summary-'));
  const reports = writeReports(unsafeAudit, tempDir);
  assert(fs.existsSync(reports.jsonPath));
  assert(fs.existsSync(reports.markdownPath));
  assert(fs.existsSync(reports.svgPath));
  const written = JSON.parse(fs.readFileSync(reports.jsonPath, 'utf8'));
  assert.strictEqual(written.decision, 'block-public-share');
}

if (require.main === module) {
  runTests();
  console.log('lay-summary-safety-guard tests passed');
}

module.exports = { runTests };
