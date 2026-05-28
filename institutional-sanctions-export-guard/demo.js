const fs = require('fs');
const path = require('path');
const {
  evaluateEligibility,
  buildSampleInstitutionalBatch
} = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluateEligibility(buildSampleInstitutionalBatch());

const packetPath = path.join(reportsDir, 'eligibility-packet.json');
const reportPath = path.join(reportsDir, 'eligibility-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);

const decisions = result.customerDecisions
  .map((decision) => `- ${decision.id}: ${decision.decision}${decision.flags.length ? ` (${decision.flags.join(', ')})` : ''}`)
  .join('\n');

const tasks = result.complianceTasks
  .map((task) => `- ${task.id} (${task.priority}): ${task.requiredAction}`)
  .join('\n');

const markdown = `# Institutional Sanctions Export Guard

Batch: ${result.batchId}
Generated: ${result.generatedAt}

## Summary

- Total requests evaluated: ${result.summary.totalRequests}
- Compliance holds: ${result.summary.complianceHolds}
- Manual billing reviews: ${result.summary.manualReviews}
- Recognizable revenue: $${result.summary.recognizableRevenueUsd}
- Deferred revenue: $${result.summary.deferredRevenueUsd}
- Recommended action: ${result.summary.recommendedAction}
- Audit digest: ${result.auditPacket.auditDigest}

## Eligibility Decisions

${decisions}

## Compliance Tasks

${tasks}

## Privacy Notes

Buyer contacts, tax identifiers, private payment references, and live customer records are not emitted. The packet uses synthetic data only and makes no external sanctions, payment, bank, or identity-provider calls.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#18202f"/>
  <rect x="60" y="70" width="1160" height="580" rx="18" fill="#243149" stroke="#9ec5ff" stroke-width="4"/>
  <text x="100" y="145" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Institutional Sanctions Export Guard</text>
  <text x="100" y="215" fill="#e8f1ff" font-family="Arial, sans-serif" font-size="28">Compliance holds: ${result.summary.complianceHolds}</text>
  <text x="100" y="265" fill="#e8f1ff" font-family="Arial, sans-serif" font-size="28">Manual billing reviews: ${result.summary.manualReviews}</text>
  <text x="100" y="315" fill="#e8f1ff" font-family="Arial, sans-serif" font-size="28">Recognizable revenue: $${result.summary.recognizableRevenueUsd}</text>
  <text x="100" y="365" fill="#ffe59a" font-family="Arial, sans-serif" font-size="28">Action: ${result.summary.recommendedAction}</text>
  <text x="100" y="445" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Blocks invoices and entitlements until eligibility is cleared.</text>
  <text x="100" y="500" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Synthetic-only audit packet; no live payment or sanctions calls.</text>
  <text x="100" y="560" fill="#b9d2ff" font-family="Arial, sans-serif" font-size="18">${result.auditPacket.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Recommended action: ${result.summary.recommendedAction}`);
