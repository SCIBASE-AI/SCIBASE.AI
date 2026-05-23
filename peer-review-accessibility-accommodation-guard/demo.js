const fs = require('node:fs');
const path = require('node:path');

const {
  evaluatePeerReviewAccessibilityAccommodation,
  buildReviewerPacket,
  buildSummarySvg,
} = require('./index');
const {samplePacket} = require('./sample-data');

const REPORT_DIR = path.join(__dirname, 'reports');

function main() {
  fs.mkdirSync(REPORT_DIR, {recursive: true});
  const result = evaluatePeerReviewAccessibilityAccommodation(samplePacket);
  fs.writeFileSync(path.join(REPORT_DIR, 'accessibility-accommodation-packet.json'), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, 'accessibility-accommodation-report.md'), buildReviewerPacket(result));
  fs.writeFileSync(path.join(REPORT_DIR, 'summary.svg'), buildSummarySvg(result));
  console.log(`decision=${result.decision}`);
  console.log(`fairness=${result.fairnessScore}`);
  console.log(`findings=${result.findings.length}`);
  console.log(`actions=${result.requiredActions.length}`);
  console.log(`digest=${result.auditDigest}`);
}

if (require.main === module) {
  main();
}
