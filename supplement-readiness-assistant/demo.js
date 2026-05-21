const fs = require('fs');
const path = require('path');
const { evaluateSupplementReadiness } = require('./index');
const { blockedSupplementPackage } = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportDir, { recursive: true });

const result = evaluateSupplementReadiness(blockedSupplementPackage);
const packetPath = path.join(reportDir, 'supplement-readiness-packet.json');
const reportPath = path.join(reportDir, 'supplement-readiness-report.md');
const svgPath = path.join(reportDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);

const claimRows = result.claimResults
  .map((claim) => `| ${claim.id} | ${claim.status} | ${claim.linkedArtifacts.join(', ') || 'none'} | ${claim.blockers.join(', ') || '-'} |`)
  .join('\n');
const artifactRows = result.artifactResults
  .map((artifact) => `| ${artifact.id} | ${artifact.kind} | ${artifact.status} | ${artifact.blockers.join(', ') || '-'} | ${artifact.warnings.join(', ') || '-'} |`)
  .join('\n');
const actionRows = result.reviewerActions.map((action) => `- ${action}`).join('\n');

fs.writeFileSync(
  reportPath,
  `# Supplement Readiness Report

Status: ${result.status}
Readiness score: ${result.readinessScore}
Audit digest: ${result.auditDigest}

## Manuscript

Title: ${result.manuscript.title}
Domain: ${result.manuscript.domain}
Package: ${result.supplementPackage.id} ${result.supplementPackage.version}

## Coverage

- Claims ready: ${result.coverage.claimsReady}/${result.coverage.claimsTotal}
- Artifacts passing: ${result.coverage.artifactsPassing}/${result.coverage.artifactsTotal}
- Missing required artifact kinds: ${result.coverage.missingRequiredKinds.join(', ') || 'none'}

## Claim Review

| Claim | Status | Linked artifacts | Blockers |
| --- | --- | --- | --- |
${claimRows}

## Artifact Review

| Artifact | Kind | Status | Blockers | Warnings |
| --- | --- | --- | --- | --- |
${artifactRows}

## Blockers

${result.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Reviewer Actions

${actionRows}
`,
);

const blockerCount = result.blockers.length;
const warningCount = result.warnings.length;
const readyClaims = result.coverage.claimsReady;
const totalClaims = result.coverage.claimsTotal;
fs.writeFileSync(
  svgPath,
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="60" y="56" width="840" height="428" rx="18" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="92" y="112" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#0f172a">Supplement Readiness Assistant</text>
  <text x="92" y="154" font-family="Arial, sans-serif" font-size="18" fill="#475569">Status: ${result.status} | Score: ${result.readinessScore} | Claims: ${readyClaims}/${totalClaims}</text>
  <g transform="translate(92 205)">
    <rect width="230" height="132" rx="12" fill="#fee2e2" stroke="#ef4444"/>
    <text x="24" y="54" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#991b1b">${blockerCount}</text>
    <text x="24" y="92" font-family="Arial, sans-serif" font-size="18" fill="#991b1b">publication blockers</text>
  </g>
  <g transform="translate(365 205)">
    <rect width="230" height="132" rx="12" fill="#fef3c7" stroke="#f59e0b"/>
    <text x="24" y="54" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#92400e">${warningCount}</text>
    <text x="24" y="92" font-family="Arial, sans-serif" font-size="18" fill="#92400e">review warnings</text>
  </g>
  <g transform="translate(638 205)">
    <rect width="230" height="132" rx="12" fill="#dcfce7" stroke="#22c55e"/>
    <text x="24" y="54" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#166534">${readyClaims}</text>
    <text x="24" y="92" font-family="Arial, sans-serif" font-size="18" fill="#166534">claims ready</text>
  </g>
  <text x="92" y="402" font-family="Arial, sans-serif" font-size="17" fill="#334155">Digest: ${result.auditDigest.slice(0, 32)}...</text>
  <text x="92" y="434" font-family="Arial, sans-serif" font-size="17" fill="#334155">Reviewer packet: JSON + Markdown + SVG + MP4 demo</text>
</svg>
`,
);

console.log(`status=${result.status}`);
console.log(`readinessScore=${result.readinessScore}`);
console.log(`claimsReady=${result.coverage.claimsReady}/${result.coverage.claimsTotal}`);
console.log(`blockers=${result.blockers.length}`);
console.log(`warnings=${result.warnings.length}`);
console.log(`auditDigest=${result.auditDigest}`);
console.log(`reports=${reportDir}`);
