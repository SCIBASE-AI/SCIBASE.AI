const path = require('path');
const { evaluateRepository, writeReports } = require('./index');
const { repository } = require('./sample-data');

function runDemo(outputDir = path.join(__dirname, 'reports')) {
  const audit = evaluateRepository(repository);
  const reports = writeReports(audit, outputDir);

  console.log(`Decision: ${audit.decision}`);
  console.log(`Checked ${audit.summary.lfsFilesChecked} Git LFS files`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`Holds: ${audit.summary.holds}`);
  console.log(`Reports written:`);
  console.log(`- ${reports.jsonPath}`);
  console.log(`- ${reports.markdownPath}`);
  console.log(`- ${reports.svgPath}`);

  return { audit, reports };
}

if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };
