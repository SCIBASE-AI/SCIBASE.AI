'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildMarkdownReport, buildSvgSummary, evaluateBatch } = require('../src');

const root = path.join(__dirname, '..');
const examplesPath = path.join(root, 'examples', 'dossier-packets.json');
const artifactsDir = path.join(root, 'artifacts');
const packet = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));
const batch = evaluateBatch(packet);

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, 'promotion-dossier-results.json'),
  `${JSON.stringify(batch, null, 2)}\n`
);
fs.writeFileSync(
  path.join(artifactsDir, 'promotion-dossier-report.md'),
  buildMarkdownReport(batch)
);
fs.writeFileSync(
  path.join(artifactsDir, 'promotion-dossier-summary.svg'),
  buildSvgSummary(batch)
);
fs.writeFileSync(
  path.join(artifactsDir, 'demo-transcript.md'),
  [
    '# Demo Transcript',
    '',
    '1. Load four synthetic institution-facing reputation dossier packets.',
    '2. Evaluate consent, opt-out state, anonymous review redaction, semi-private review authorization, credit evidence, badge freshness, and conflict notes.',
    '3. Emit deterministic export decisions: RELEASE_DOSSIER, REVIEW_BEFORE_EXPORT, or HOLD_EXPORT.',
    '4. Write JSON, Markdown, and SVG artifacts for reviewer replay.',
    '',
    '## Demo Output',
    '',
    `- Release: ${batch.summary.release}`,
    `- Review: ${batch.summary.review}`,
    `- Hold: ${batch.summary.hold}`,
    `- Held dossiers: ${batch.summary.heldDossierIds.join(', ') || 'none'}`,
    `- Review dossiers: ${batch.summary.reviewDossierIds.join(', ') || 'none'}`
  ].join('\n') + '\n'
);

console.log(`Generated promotion dossier artifacts for ${batch.summary.totalDossiers} dossiers.`);
console.log(`Release=${batch.summary.release} Review=${batch.summary.review} Hold=${batch.summary.hold}`);
