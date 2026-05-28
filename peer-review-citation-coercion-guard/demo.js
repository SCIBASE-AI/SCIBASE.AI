const fs = require('fs');
const path = require('path');
const {
  evaluateCitationCoercion,
  buildSampleReviewPacket
} = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const packet = buildSampleReviewPacket();
const result = evaluateCitationCoercion(packet);

const packetPath = path.join(reportsDir, 'citation-coercion-packet.json');
const reportPath = path.join(reportsDir, 'citation-coercion-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);

const flaggedReviews = result.reviewDecisions
  .filter((decision) => decision.decision === 'steward-review-required')
  .map((decision) => `- ${decision.id}: ${decision.flags.join(', ')}`)
  .join('\n');

const taskList = result.stewardTasks
  .map((task) => `- ${task.id} (${task.priority}): ${task.requiredAction}`)
  .join('\n');

const authorProtections = result.authorProtections
  .map((protection) => `- ${protection.projectId}: ${protection.blockedUpdates.join(', ')}`)
  .join('\n');

const markdown = `# Peer Review Citation Coercion Guard

Packet: ${result.packetId}
Generated: ${result.generatedAt}

## Summary

- Total reviews evaluated: ${result.summary.totalReviews}
- Flagged reviews: ${result.summary.flaggedReviews}
- Held reviewer credit: ${result.summary.heldReviewerCredit}
- Protected projects: ${result.summary.protectedProjects}
- Recommended action: ${result.summary.recommendedAction}
- Audit digest: ${result.auditPacket.auditDigest}

## Flagged Citation Pressure

${flaggedReviews}

## Steward Tasks

${taskList}

## Author Protections

${authorProtections}

## Privacy Notes

Double-blind reviewer identifiers are replaced with anonymous labels before reports, tasks, and timeline events are emitted. The packet uses synthetic data only and does not contain credentials, private profile emails, live user data, external API calls, payment systems, or real review records.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#13221c"/>
  <rect x="60" y="70" width="1160" height="580" rx="18" fill="#1d342c" stroke="#8ee6b5" stroke-width="4"/>
  <text x="100" y="145" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Peer Review Citation Coercion Guard</text>
  <text x="100" y="215" fill="#d9fff0" font-family="Arial, sans-serif" font-size="28">Flagged reviews: ${result.summary.flaggedReviews} / ${result.summary.totalReviews}</text>
  <text x="100" y="265" fill="#d9fff0" font-family="Arial, sans-serif" font-size="28">Held reviewer credit: ${result.summary.heldReviewerCredit}</text>
  <text x="100" y="315" fill="#d9fff0" font-family="Arial, sans-serif" font-size="28">Protected projects: ${result.summary.protectedProjects}</text>
  <text x="100" y="365" fill="#ffe59a" font-family="Arial, sans-serif" font-size="28">Action: ${result.summary.recommendedAction}</text>
  <text x="100" y="445" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Detects self-citation demands, reciprocal pressure, and journal quota coercion.</text>
  <text x="100" y="500" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Blind reviewer labels are preserved without raw identity leakage.</text>
  <text x="100" y="560" fill="#a8dcc8" font-family="Arial, sans-serif" font-size="18">${result.auditPacket.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Recommended action: ${result.summary.recommendedAction}`);
