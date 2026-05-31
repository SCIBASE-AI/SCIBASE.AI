const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  LFS_POINTER_VERSION,
  evaluateRepository,
  parseLfsPointer,
  renderMarkdown,
  renderSvg,
  writeReports,
} = require('./index');
const { OIDS, pointer, repository } = require('./sample-data');

function runTests() {
  const parsed = parseLfsPointer(pointer(OIDS.baselineCsv, 1024));
  assert.strictEqual(parsed.valid, true);
  assert.strictEqual(parsed.version, LFS_POINTER_VERSION);
  assert.strictEqual(parsed.oid, OIDS.baselineCsv);
  assert.strictEqual(parsed.size, 1024);

  const malformed = parseLfsPointer('version https://example.invalid\nsize nope\noid md5:abc');
  assert.strictEqual(malformed.valid, false);
  assert(malformed.errors.includes('version-invalid'));
  assert(malformed.errors.includes('oid-missing-sha256-prefix'));
  assert(malformed.errors.includes('oid-invalid-sha256'));
  assert(malformed.errors.includes('size-invalid'));

  const audit = evaluateRepository(repository);
  assert.strictEqual(audit.decision, 'block-release');
  assert.strictEqual(audit.releaseEligible, false);
  assert.strictEqual(audit.summary.lfsFilesChecked, 7);
  assert(audit.summary.blockers >= 4);
  assert(audit.summary.holds >= 3);
  assert.strictEqual(audit.summary.passed, 1);

  const codes = new Set(audit.findings.map((finding) => finding.code));
  assert(codes.has('lfs-checksum-mismatch'));
  assert(codes.has('lfs-size-mismatch'));
  assert(codes.has('lfs-object-missing'));
  assert(codes.has('pointer-malformed'));
  assert(codes.has('release-manifest-missing'));
  assert(codes.has('doi-export-coverage-missing'));
  assert(codes.has('lfs-retention-too-short'));
  assert(codes.has('lfs-quota-risk'));

  const markdown = renderMarkdown(audit);
  assert(markdown.includes('Git LFS Pointer Integrity Guard'));
  assert(markdown.includes('block-release'));
  assert(markdown.includes('models/cell-segmentation.bin'));

  const svg = renderSvg(audit);
  assert(svg.includes('<svg'));
  assert(svg.includes('Git LFS Pointer Integrity Guard'));

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfs-integrity-'));
  const reports = writeReports(audit, tempDir);
  assert(fs.existsSync(reports.jsonPath));
  assert(fs.existsSync(reports.markdownPath));
  assert(fs.existsSync(reports.svgPath));

  const writtenAudit = JSON.parse(fs.readFileSync(reports.jsonPath, 'utf8'));
  assert.strictEqual(writtenAudit.decision, 'block-release');
}

if (require.main === module) {
  runTests();
  console.log('lfs-pointer-integrity-guard tests passed');
}

module.exports = { runTests };
