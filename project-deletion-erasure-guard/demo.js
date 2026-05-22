'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { evaluateBatch } = require('./index');

const reportDir = path.join(__dirname, 'reports');
const asOfDate = '2026-05-22';

const requests = [
  {
    id: 'DEL-PRJ-441',
    type: 'project_deletion',
    requestedAt: '2026-05-21',
    actor: { projectRole: 'owner', identityVerified: true, mfaVerifiedAt: '2026-05-21' },
    project: {
      id: 'proj-private-draft',
      title: 'Private Draft Workspace',
      visibility: 'private',
      activeCollaborators: 0,
      coOwners: [{ id: 'owner-1', consent: 'approved' }],
      citations: { doi: null, publicCitations: 0, downstreamForks: 0 }
    },
    holds: [],
    linkedProjects: [],
    anonymousReviewEscrow: {},
    recoveryWindowDays: 30
  },
  {
    id: 'DEL-PRJ-552',
    type: 'project_deletion',
    requestedAt: '2026-05-20',
    actor: { projectRole: 'owner', identityVerified: true, mfaVerifiedAt: '2026-05-19' },
    project: {
      id: 'proj-clinical-study',
      title: 'Clinical Study Materials',
      visibility: 'institutional-only',
      activeCollaborators: 4,
      coOwners: [{ id: 'owner-1', consent: 'approved' }, { id: 'owner-2', consent: 'pending' }],
      citations: { doi: null, publicCitations: 0, downstreamForks: 0 }
    },
    holds: [
      { type: 'irb_retention', status: 'active', expiresAt: '2027-02-01' },
      { type: 'funder_retention', status: 'active', expiresAt: '2028-06-30' }
    ],
    linkedProjects: [],
    anonymousReviewEscrow: {},
    recoveryWindowDays: 30
  },
  {
    id: 'DEL-PRJ-620',
    type: 'project_deletion',
    requestedAt: '2026-05-21',
    actor: { projectRole: 'admin', identityVerified: true, mfaVerifiedAt: '2026-05-20' },
    project: {
      id: 'proj-public-model',
      title: 'Published Model Release',
      visibility: 'public',
      activeCollaborators: 0,
      coOwners: [{ id: 'owner-1', consent: 'approved' }],
      citations: {
        doi: '10.5555/scibase.model.620',
        publicCitations: 28,
        downstreamForks: 3
      }
    },
    holds: [],
    linkedProjects: [],
    anonymousReviewEscrow: {},
    recoveryWindowDays: 30
  },
  {
    id: 'ERASE-USER-118',
    type: 'profile_erasure',
    requestedAt: '2026-05-19',
    actor: { projectRole: 'owner', identityVerified: true, mfaVerifiedAt: '2026-05-18' },
    project: null,
    holds: [],
    linkedProjects: [
      { id: 'proj-public-model', role: 'author' },
      { id: 'proj-peer-review', role: 'reviewer' }
    ],
    anonymousReviewEscrow: {},
    recoveryWindowDays: 30
  },
  {
    id: 'ERASE-USER-221',
    type: 'profile_erasure',
    requestedAt: '2026-05-21',
    actor: { projectRole: 'owner', identityVerified: true, mfaVerifiedAt: '2026-05-21' },
    project: null,
    holds: [],
    linkedProjects: [],
    anonymousReviewEscrow: {
      activePseudonyms: 2,
      pendingAppeals: 1,
      deanonymizationHolds: 0
    },
    recoveryWindowDays: 30
  }
];

fs.mkdirSync(reportDir, { recursive: true });

const batch = evaluateBatch(requests, { asOfDate });
const jsonPath = path.join(reportDir, 'deletion-erasure-packet.json');
const markdownPath = path.join(reportDir, 'deletion-erasure-report.md');
const svgPath = path.join(reportDir, 'summary.svg');
const mp4Path = path.join(reportDir, 'demo.mp4');

fs.writeFileSync(jsonPath, `${JSON.stringify(batch, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdown(batch));
fs.writeFileSync(svgPath, renderSvg(batch));
renderVideo(batch, mp4Path);

console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), markdownPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), svgPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), mp4Path)}`);

function renderMarkdown(batch) {
  return [
    '# Project Deletion And Erasure Guard Report',
    '',
    `As of: ${batch.asOfDate}`,
    `Batch digest: \`${batch.auditDigest}\``,
    '',
    '## Summary',
    '',
    `- Requests reviewed: ${batch.requestCount}`,
    `- Blocked requests: ${batch.blockedRequests.join(', ') || 'none'}`,
    `- Decisions: ${Object.entries(batch.byAction).map(([action, count]) => `${action}=${count}`).join(', ')}`,
    `- Modes: ${Object.entries(batch.byMode).map(([mode, count]) => `${mode}=${count}`).join(', ')}`,
    '',
    '## Request Decisions',
    '',
    '| Request | Type | Action | Severity | Mode | Reason |',
    '| --- | --- | --- | --- | --- | --- |',
    ...batch.packets.map((packet) => `| ${packet.requestId} | ${packet.type} | ${packet.action} | ${packet.severity} | ${packet.finalizationMode} | ${packet.reason} |`),
    '',
    '## Guardrails',
    '',
    '- Uses synthetic project, profile, consent, hold, and escrow records only.',
    '- Does not call OAuth, SAML, ORCID, identity providers, live projects, or production access-control systems.',
    '- Blocks destructive finalization while retention/legal/IRB/funder holds or authority gaps remain.',
    '- Preserves citation tombstones and minimized audit receipts rather than erasing public scientific attribution.',
    ''
  ].join('\n');
}

function renderSvg(batch) {
  const blocked = batch.blockedRequests.length;
  const actions = Object.entries(batch.byAction)
    .map(([action, count]) => `${escapeXml(action)} (${count})`)
    .join(' / ');
  const modes = Object.entries(batch.byMode)
    .map(([mode, count]) => `${escapeXml(mode)} (${count})`)
    .join(' / ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Project deletion and erasure guard summary</title>
  <desc id="desc">Synthetic deletion and profile erasure finalization decisions.</desc>
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="70" y="70" width="1140" height="580" rx="18" fill="#f9fafb"/>
  <text x="110" y="140" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#111827">Deletion and erasure guard</text>
  <text x="110" y="195" font-family="Arial, sans-serif" font-size="26" fill="#374151">Retention holds, co-owner consent, citation tombstones, escrow preservation</text>
  <rect x="110" y="245" width="310" height="150" rx="14" fill="#dbeafe"/>
  <text x="135" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1e3a8a">${batch.requestCount} requests</text>
  <text x="135" y="350" font-family="Arial, sans-serif" font-size="26" fill="#1e40af">reviewed locally</text>
  <rect x="465" y="245" width="310" height="150" rx="14" fill="#fee2e2"/>
  <text x="490" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#7f1d1d">${blocked} blocked</text>
  <text x="490" y="350" font-family="Arial, sans-serif" font-size="26" fill="#991b1b">before deletion</text>
  <rect x="820" y="245" width="310" height="150" rx="14" fill="#dcfce7"/>
  <text x="845" y="300" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#14532d">No live data</text>
  <text x="845" y="350" font-family="Arial, sans-serif" font-size="26" fill="#166534">synthetic only</text>
  <text x="110" y="465" font-family="Arial, sans-serif" font-size="24" fill="#111827">Actions: ${actions}</text>
  <text x="110" y="525" font-family="Arial, sans-serif" font-size="24" fill="#111827">Modes: ${modes}</text>
  <text x="110" y="590" font-family="Arial, sans-serif" font-size="20" fill="#4b5563">Digest: ${batch.auditDigest.slice(0, 32)}...</text>
</svg>
`;
}

function renderVideo(batch, outputPath) {
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const filters = [
    drawText(font, 'SCIBASE #11 User & Project Management', 64, 70, 42, 'white'),
    drawText(font, 'Project deletion and profile erasure finalization guard', 64, 135, 32, 'white'),
    drawText(font, `Reviewed ${batch.requestCount} synthetic deletion/erasure requests`, 84, 235, 34, '0xdbeafe'),
    drawText(font, `Blocked ${batch.blockedRequests.length} destructive finalizations`, 84, 300, 34, '0xfecaca'),
    drawText(font, 'Checks: identity, MFA, retention holds, co-owner consent, citation tombstones', 84, 385, 27, '0xdcfce7'),
    drawText(font, 'Escrow and attribution are preserved with minimized audit receipts', 84, 445, 27, '0xe0f2fe'),
    drawText(font, 'No live users, projects, OAuth, SAML, ORCID, or access-control calls', 84, 505, 27, '0xfef3c7'),
    drawText(font, `Audit digest ${batch.auditDigest.slice(0, 24)}`, 84, 590, 24, '0xcbd5e1')
  ].join(',');

  const result = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x111827:s=1280x720:d=4:r=25',
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
