const path = require('path');
const { evaluateSupportPacket, writeReports } = require('./index');
const { supportPacket } = require('./sample-data');

function runDemo(outputDir = path.join(__dirname, 'reports')) {
  const audit = evaluateSupportPacket(supportPacket);
  const reports = writeReports(audit, outputDir);
  console.log(`Decision: ${audit.decision}`);
  console.log(`Cases checked: ${audit.summary.casesChecked}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`Holds: ${audit.summary.holds}`);
  console.log(`Billable overage: $${audit.summary.billableOverage.toFixed(2)}`);
  console.log('Reports written:');
  console.log(`- ${reports.jsonPath}`);
  console.log(`- ${reports.markdownPath}`);
  console.log(`- ${reports.svgPath}`);
  return { audit, reports };
}

if (require.main === module) runDemo();

module.exports = { runDemo };
