'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { evaluatePortfolio } = require('./index');

const reportDir = path.join(__dirname, 'reports');
const asOfDate = '2026-05-22';

const advisories = [
  {
    id: 'ADV-PANDAS-001',
    packageName: 'pandas',
    affectedRange: '<2.2.2',
    severity: 'high',
    cve: 'CVE-2026-1001',
    exploitMaturity: 'public_poc',
    fixedVersion: '2.2.2',
    affectsRuntime: true
  },
  {
    id: 'ADV-TORCH-002',
    packageName: 'torch',
    affectedRange: '<2.4.0',
    severity: 'critical',
    cve: 'CVE-2026-2400',
    exploitMaturity: 'known_exploited',
    fixedVersion: '2.4.0',
    affectsRuntime: true
  },
  {
    id: 'ADV-PLOTLY-003',
    packageName: 'plotly',
    affectedRange: '<5.20.0',
    severity: 'medium',
    cve: 'CVE-2026-2002',
    exploitMaturity: 'theoretical',
    fixedVersion: '5.20.0',
    affectsRuntime: false
  }
];

const artifacts = [
  {
    id: 'ART-NB-440',
    type: 'notebook',
    language: 'python',
    executionSurfaces: ['preview', 'reproduce_button'],
    lockfile: { present: true, generatedAt: '2026-05-10', digest: 'lock-nb-440' },
    sbom: [
      { name: 'pandas', version: '2.1.4', scope: 'notebook', direct: true },
      { name: 'numpy', version: '1.26.4', scope: 'notebook', direct: true }
    ]
  },
  {
    id: 'ART-MODEL-880',
    type: 'model-training-code',
    language: 'python',
    executionSurfaces: ['scheduled_rerun', 'export_bundle'],
    lockfile: { present: true, generatedAt: '2026-04-30', digest: 'lock-model-880' },
    sbom: [
      { name: 'torch', version: '2.2.1', scope: 'model-serving', direct: true },
      { name: 'scikit-learn', version: '1.5.0', scope: 'notebook', direct: true }
    ]
  },
  {
    id: 'ART-CODE-120',
    type: 'code',
    language: 'javascript',
    executionSurfaces: ['export_bundle'],
    lockfile: { present: true, generatedAt: '2025-12-01', digest: 'lock-code-120' },
    sbom: [
      { name: 'plotly', version: '5.18.0', scope: 'dev', direct: false }
    ]
  },
  {
    id: 'ART-NB-510',
    type: 'notebook',
    language: 'r',
    executionSurfaces: ['preview'],
    lockfile: { present: false },
    sbom: []
  },
  {
    id: 'ART-NB-700',
    type: 'notebook',
    language: 'python',
    executionSurfaces: ['preview', 'reproduce_button', 'export_bundle'],
    lockfile: { present: true, generatedAt: '2026-05-12', digest: 'lock-clean-700' },
    sbom: [
      { name: 'pandas', version: '2.2.3', scope: 'notebook', direct: true },
      { name: 'numpy', version: '1.26.4', scope: 'notebook', direct: true }
    ]
  }
];

fs.mkdirSync(reportDir, { recursive: true });

const portfolio = evaluatePortfolio(artifacts, { asOfDate, advisories });
const jsonPath = path.join(reportDir, 'dependency-advisory-packet.json');
const markdownPath = path.join(reportDir, 'dependency-advisory-report.md');
const svgPath = path.join(reportDir, 'summary.svg');
const mp4Path = path.join(reportDir, 'demo.mp4');

fs.writeFileSync(jsonPath, `${JSON.stringify(portfolio, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdown(portfolio));
fs.writeFileSync(svgPath, renderSvg(portfolio));
renderVideo(portfolio, mp4Path);

console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), mp4Path)}`);

function renderMarkdown(portfolio) {
  return [
    '# Dependency Advisory SBOM Guard Report',
    '',
    `As of: ${portfolio.asOfDate}`,
    `Portfolio digest: \`${portfolio.auditDigest}\``,
    '',
    '## Summary',
    '',
    `- Artifacts reviewed: ${portfolio.artifactCount}`,
    `- Advisory findings: ${portfolio.findingCount}`,
    `- Blocked artifacts: ${portfolio.blockedArtifacts.join(', ') || 'none'}`,
    `- Actions: ${Object.entries(portfolio.byAction).map(([action, count]) => `${action}=${count}`).join(', ')}`,
    '',
    '## Artifact Decisions',
    '',
    '| Artifact | Type | Action | Severity | Findings | Reason |',
    '| --- | --- | --- | --- | ---: | --- |',
    ...portfolio.packets.map((packet) => `| ${packet.artifactId} | ${packet.artifactType} | ${packet.action} | ${packet.severity} | ${packet.findingCount} | ${packet.reason} |`),
    '',
    '## Guardrails',
    '',
    '- Uses synthetic SBOM, lockfile, and advisory records only.',
    '- Does not call package registries, vulnerability scanners, external SBOM services, or execution sandboxes.',
    '- Holds executable previews, reproduce buttons, scheduled reruns, and export bundles when critical runtime advisories match.',
    '- Preserves deterministic audit digests for reviewer packets.',
    ''
  ].join('\n');
}

function renderSvg(portfolio) {
  const blocked = portfolio.blockedArtifacts.length;
  const actions = Object.entries(portfolio.byAction)
    .map(([action, count]) => `${escapeXml(action)} (${count})`)
    .join(' / ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Dependency advisory SBOM guard summary</title>
  <desc id="desc">Synthetic SBOM advisory quarantine decisions for scientific code hosting.</desc>
  <rect width="1280" height="720" fill="#082f49"/>
  <rect x="70" y="70" width="1140" height="580" rx="18" fill="#f8fafc"/>
  <text x="110" y="140" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#111827">Dependency advisory SBOM guard</text>
  <text x="110" y="195" font-family="Arial, sans-serif" font-size="26" fill="#334155">Hosted code and notebook advisory checks before previews, reruns, and exports</text>
  <rect x="110" y="245" width="310" height="150" rx="14" fill="#dbeafe"/>
  <text x="135" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1e3a8a">${portfolio.artifactCount} artifacts</text>
  <text x="135" y="350" font-family="Arial, sans-serif" font-size="26" fill="#1e40af">${portfolio.findingCount} findings</text>
  <rect x="465" y="245" width="310" height="150" rx="14" fill="#fee2e2"/>
  <text x="490" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#7f1d1d">${blocked} blocked</text>
  <text x="490" y="350" font-family="Arial, sans-serif" font-size="26" fill="#991b1b">execution held</text>
  <rect x="820" y="245" width="310" height="150" rx="14" fill="#dcfce7"/>
  <text x="845" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#14532d">No network</text>
  <text x="845" y="350" font-family="Arial, sans-serif" font-size="26" fill="#166534">synthetic SBOM</text>
  <text x="110" y="465" font-family="Arial, sans-serif" font-size="24" fill="#111827">Actions: ${actions}</text>
  <text x="110" y="590" font-family="Arial, sans-serif" font-size="20" fill="#475569">Digest: ${portfolio.auditDigest.slice(0, 32)}...</text>
</svg>
`;
}

function renderVideo(portfolio, outputPath) {
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const filters = [
    drawText(font, 'SCIBASE #14 Scientific Data & Code Hosting', 64, 70, 40, 'white'),
    drawText(font, 'Dependency advisory and SBOM quarantine gate', 64, 135, 34, 'white'),
    drawText(font, `Reviewed ${portfolio.artifactCount} synthetic artifacts`, 84, 235, 34, '0xdbeafe'),
    drawText(font, `${portfolio.findingCount} advisory findings matched`, 84, 300, 34, '0xfef3c7'),
    drawText(font, `Blocked ${portfolio.blockedArtifacts.length} executable surfaces`, 84, 365, 34, '0xfecaca'),
    drawText(font, 'Checks SBOM ranges, lockfile freshness, runtime scope, exploit maturity', 84, 455, 27, '0xdcfce7'),
    drawText(font, 'No registry, scanner, external SBOM, sandbox, or network calls', 84, 515, 27, '0xe0f2fe'),
    drawText(font, `Audit digest ${portfolio.auditDigest.slice(0, 24)}`, 84, 590, 24, '0xcbd5e1')
  ].join(',');

  const result = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x082f49:s=1280x720:d=4:r=25',
    '-vf', filters,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    outputPath
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`ffmpeg failed to render demo.mp4:\n${message}`);
  }
}

function drawText(font, text, x, y, size, color) {
  return `drawtext=fontfile='${font}':text='${escapeDrawText(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}

function escapeDrawText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,')
    .replace(/&/g, '\\&');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
