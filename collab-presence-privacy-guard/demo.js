const fs = require('fs');
const path = require('path');
const { evaluatePresencePrivacy } = require('./index');
const { riskyPresenceRoom } = require('./sample-data');

const reportDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportDir, { recursive: true });

const result = evaluatePresencePrivacy(riskyPresenceRoom);
const packetPath = path.join(reportDir, 'presence-privacy-packet.json');
const reportPath = path.join(reportDir, 'presence-privacy-report.md');
const svgPath = path.join(reportDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);

const evaluationRows = result.evaluations
  .map((entry) => `| ${entry.viewerId} | ${entry.userId} | ${entry.status} | ${entry.sanitizedLocation.sectionTitle} | ${entry.blockers.join(', ') || '-'} |`)
  .join('\n');

fs.writeFileSync(
  reportPath,
  `# Collaborative Presence Privacy Report

Status: ${result.status}
Audit digest: ${result.auditDigest}

## Room

Title: ${result.room.title}

## Broadcast Summary

- Safe broadcasts: ${result.safeBroadcasts}
- Warning broadcasts: ${result.warningBroadcasts}
- Blocked broadcasts: ${result.blockedBroadcasts}

## Viewer Evaluation

| Viewer | Presence user | Status | Broadcast location | Blockers |
| --- | --- | --- | --- | --- |
${evaluationRows}

## Blockers

${result.blockers.map((blocker) => `- ${blocker}`).join('\n')}

## Warnings

${result.warnings.map((warning) => `- ${warning}`).join('\n')}

## Reviewer Actions

${result.reviewerActions.map((action) => `- ${action}`).join('\n')}
`,
);

fs.writeFileSync(
  svgPath,
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="58" y="52" width="844" height="436" rx="18" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="90" y="112" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#0f172a">Collaborative Presence Privacy Guard</text>
  <text x="90" y="154" font-family="Arial, sans-serif" font-size="18" fill="#475569">Status: ${result.status} | Room: ${result.room.id}</text>
  <g transform="translate(90 202)">
    <rect width="234" height="126" rx="12" fill="#fee2e2" stroke="#ef4444"/>
    <text x="24" y="52" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#991b1b">${result.blockedBroadcasts}</text>
    <text x="24" y="90" font-family="Arial, sans-serif" font-size="17" fill="#991b1b">blocked broadcasts</text>
  </g>
  <g transform="translate(363 202)">
    <rect width="234" height="126" rx="12" fill="#fef3c7" stroke="#f59e0b"/>
    <text x="24" y="52" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#92400e">${result.warningBroadcasts}</text>
    <text x="24" y="90" font-family="Arial, sans-serif" font-size="17" fill="#92400e">warning broadcasts</text>
  </g>
  <g transform="translate(636 202)">
    <rect width="234" height="126" rx="12" fill="#dcfce7" stroke="#22c55e"/>
    <text x="24" y="52" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#166534">${result.safeBroadcasts}</text>
    <text x="24" y="90" font-family="Arial, sans-serif" font-size="17" fill="#166534">safe broadcasts</text>
  </g>
  <text x="90" y="392" font-family="Arial, sans-serif" font-size="17" fill="#334155">Redacts section titles, cursor anchors, and anonymous identities before broadcast.</text>
  <text x="90" y="426" font-family="Arial, sans-serif" font-size="17" fill="#334155">Digest: ${result.auditDigest.slice(0, 32)}...</text>
</svg>
`,
);

console.log(`status=${result.status}`);
console.log(`safe=${result.safeBroadcasts}`);
console.log(`warnings=${result.warningBroadcasts}`);
console.log(`blocked=${result.blockedBroadcasts}`);
console.log(`auditDigest=${result.auditDigest}`);
console.log(`reports=${reportDir}`);
