const path = require('path');
const { evaluateReputationPacket, writeReports } = require('./index');
const { reputationPacket } = require('./sample-data');

function runDemo(outputDir = path.join(__dirname, 'reports')) {
  const audit = evaluateReputationPacket(reputationPacket);
  const reports = writeReports(audit, outputDir);
  console.log(`Decision: ${audit.decision}`);
  console.log(`Contributions checked: ${audit.summary.contributionsChecked}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`Holds: ${audit.summary.holds}`);
  console.log(`Withheld points: ${audit.summary.withheldPoints}`);
  console.log('Reports written:');
  console.log(`- ${reports.jsonPath}`);
  console.log(`- ${reports.markdownPath}`);
  console.log(`- ${reports.svgPath}`);
  return { audit, reports };
}

if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };
