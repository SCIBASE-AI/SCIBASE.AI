const fs = require('node:fs');
const path = require('node:path');

const {
  evaluatePaymentAuthorizationFreshness,
  buildFinancePacket,
  buildSummarySvg,
} = require('./index');
const {sampleBatch} = require('./sample-data');

const REPORT_DIR = path.join(__dirname, 'reports');

function main() {
  fs.mkdirSync(REPORT_DIR, {recursive: true});
  const result = evaluatePaymentAuthorizationFreshness(sampleBatch);
  fs.writeFileSync(path.join(REPORT_DIR, 'payment-authorization-packet.json'), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, 'payment-authorization-report.md'), buildFinancePacket(result));
  fs.writeFileSync(path.join(REPORT_DIR, 'summary.svg'), buildSummarySvg(result));
  console.log(`decision=${result.decision}`);
  console.log(`authorization=${result.authorizationScore}`);
  console.log(`findings=${result.findings.length}`);
  console.log(`actions=${result.requiredActions.length}`);
  console.log(`digest=${result.auditDigest}`);
}

if (require.main === module) {
  main();
}
