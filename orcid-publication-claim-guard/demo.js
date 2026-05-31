const fs = require("fs");
const path = require("path");
const {
  evaluatePublicationClaims,
  renderMarkdownReport,
  renderSvgReport,
} = require("./index");
const {
  existingClaims,
  importedPublications,
  researchers,
} = require("./sample-data");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = evaluatePublicationClaims({
  researcher: researchers[0],
  publications: importedPublications,
  existingClaims,
});

fs.writeFileSync(
  path.join(reportDir, "orcid-publication-claim-review.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
fs.writeFileSync(
  path.join(reportDir, "orcid-publication-claim-review.md"),
  `${renderMarkdownReport(report)}\n`
);
fs.writeFileSync(
  path.join(reportDir, "orcid-publication-claim-review.svg"),
  renderSvgReport(report)
);

console.log(
  `wrote ${report.summary.total} publication decisions to ${path.relative(process.cwd(), reportDir)}`
);
