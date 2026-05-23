const fs = require('node:fs');
const path = require('node:path');
const {analyzeReleasePacket} = require('./index');
const {blockedReleasePacket, cleanReleasePacket} = require('./sample-data');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, {recursive: true});

const blocked = analyzeReleasePacket(blockedReleasePacket);
const clean = analyzeReleasePacket(cleanReleasePacket);
const packet = {
  generatedAt: new Date('2026-05-23T00:00:00.000Z').toISOString(),
  guard: 'challenge-embargo-release-guard',
  results: [blocked, clean],
};

fs.writeFileSync(path.join(reportsDir, 'embargo-release-packet.json'), `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, 'embargo-release-report.md'), renderMarkdown(packet));
fs.writeFileSync(path.join(reportsDir, 'summary.svg'), renderSvg(blocked, clean));

console.log(`blocked=${blocked.status} blockers=${blocked.summary.blockers} heldArtifacts=${blocked.summary.artifactsHeld}`);
console.log(`clean=${clean.status} blockers=${clean.summary.blockers} warnings=${clean.summary.warnings}`);
console.log(`reports=${reportsDir}`);

function renderMarkdown(data) {
  const rows = data.results.map((result) => (
    `| ${result.challengeId} | ${result.status} | ${result.summary.blockers} | ${result.summary.warnings} | ${result.summary.artifactsHeld} | ${result.digest} |`
  ));
  const actions = data.results
    .flatMap((result) => result.actions.map((action) => `- ${result.challengeId}: ${action}`))
    .join('\n');

  return `# Challenge Embargo Release Guard

This reviewer packet evaluates whether post-award scientific bounty release packets can expose winner announcements, datasets, notebooks, and open-source packages without violating active sponsor embargoes, patent/publication holds, NDA release terms, solver public-name consent, funder deadlines, or artifact redaction requirements.

| Challenge | Status | Blockers | Warnings | Held artifacts | Digest |
| --- | --- | ---: | ---: | ---: | --- |
${rows.join('\n')}

## Reviewer Actions

${actions || '- No remediation required.'}

## Scope Boundaries

- Synthetic data only.
- No network calls, credentials, real sponsor documents, or live challenge state.
- Distinct from award transparency: this gate decides whether release artifacts may leave embargoed/private state, not how ranks are explained.
`;
}

function renderSvg(blocked, clean) {
  const safe = (text) => String(text).replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[char]));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f7f7f2"/>
  <rect x="72" y="72" width="1136" height="576" rx="18" fill="#ffffff" stroke="#222" stroke-width="3"/>
  <text x="112" y="135" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="#1f2933">Challenge embargo release guard</text>
  <text x="112" y="188" font-family="Arial, sans-serif" font-size="26" fill="#374151">Post-award release packets stay private until embargo, IP, NDA, and artifact evidence clears.</text>
  <g transform="translate(112 250)">
    <rect width="488" height="260" rx="14" fill="#fff1f0" stroke="#b42318" stroke-width="3"/>
    <text x="32" y="58" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#b42318">Held release</text>
    <text x="32" y="112" font-family="Arial, sans-serif" font-size="25" fill="#1f2933">${safe(blocked.challengeId)}</text>
    <text x="32" y="162" font-family="Arial, sans-serif" font-size="25" fill="#1f2933">Blockers: ${blocked.summary.blockers}</text>
    <text x="32" y="204" font-family="Arial, sans-serif" font-size="25" fill="#1f2933">Held artifacts: ${blocked.summary.artifactsHeld}</text>
  </g>
  <g transform="translate(680 250)">
    <rect width="488" height="260" rx="14" fill="#eefaf2" stroke="#147d3f" stroke-width="3"/>
    <text x="32" y="58" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#147d3f">Release ready</text>
    <text x="32" y="112" font-family="Arial, sans-serif" font-size="25" fill="#1f2933">${safe(clean.challengeId)}</text>
    <text x="32" y="162" font-family="Arial, sans-serif" font-size="25" fill="#1f2933">Blockers: ${clean.summary.blockers}</text>
    <text x="32" y="204" font-family="Arial, sans-serif" font-size="25" fill="#1f2933">Warnings: ${clean.summary.warnings}</text>
  </g>
  <text x="112" y="586" font-family="Arial, sans-serif" font-size="24" fill="#4b5563">Reviewer artifacts: JSON packet, Markdown report, SVG summary, H.264 demo video.</text>
</svg>
`;
}
