const fs = require("fs");
const path = require("path");
const graph = require("./sample-data");
const {
  inspectOrganismBoundaryGraph,
  renderMarkdownReport,
  renderSvgReport,
} = require("./index");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = inspectOrganismBoundaryGraph(graph);
const jsonPath = path.join(reportDir, "organism-boundary-review.json");
const markdownPath = path.join(reportDir, "organism-boundary-review.md");
const svgPath = path.join(reportDir, "organism-boundary-review.svg");

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdownReport(report));
fs.writeFileSync(svgPath, renderSvgReport(report));

console.log(`wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(
  `summary: ${report.summary.edgeSuppress} suppressed edges, ${report.summary.edgeReview} review edge`
);
