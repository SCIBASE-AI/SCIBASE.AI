const path = require('path');
const { evaluateSummary, writeReports } = require('./index');
const { unsafePacket } = require('./sample-data');

function runDemo(outputDir = path.join(__dirname, 'reports')) {
  const audit = evaluateSummary(unsafePacket);
  const reports = writeReports(audit, outputDir);
  console.log(`Decision: ${audit.decision}`);
  console.log(`Sentences checked: ${audit.summary.sentences}`);
  console.log(`Reading grade: ${audit.summary.readingGrade}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`Holds: ${audit.summary.holds}`);
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
