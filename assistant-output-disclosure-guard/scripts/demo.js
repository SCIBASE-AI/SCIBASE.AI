'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildMarkdownReport, buildSvgSummary, evaluateSuite } = require('../src');

const root = path.join(__dirname, '..');
const examplesPath = path.join(root, 'examples', 'assistant-output-packets.json');
const artifactsDir = path.join(root, 'artifacts');
const packet = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));
const suite = evaluateSuite(packet);

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, 'assistant-disclosure-results.json'),
  `${JSON.stringify(suite, null, 2)}\n`
);
fs.writeFileSync(
  path.join(artifactsDir, 'assistant-disclosure-report.md'),
  buildMarkdownReport(suite)
);
fs.writeFileSync(
  path.join(artifactsDir, 'assistant-disclosure-summary.svg'),
  buildSvgSummary(suite)
);
fs.writeFileSync(
  path.join(artifactsDir, 'demo-transcript.md'),
  [
    '# Demo Transcript',
    '',
    '1. Load five synthetic AI research assistant output packets.',
    '2. Evaluate direct identifiers, storage links, embargoes, double-blind identity leaks, prompt leakage, and unsupported high-impact claims.',
    '3. Emit deterministic output release decisions: RELEASE_OUTPUT, REVIEW_BEFORE_RELEASE, or HOLD_OUTPUT.',
    '4. Write JSON, Markdown, and SVG artifacts for reviewer replay.',
    '',
    '## Demo Output',
    '',
    `- Release: ${suite.summary.release}`,
    `- Review: ${suite.summary.review}`,
    `- Hold: ${suite.summary.hold}`,
    `- Held packets: ${suite.summary.heldPacketIds.join(', ') || 'none'}`,
    `- Review packets: ${suite.summary.reviewPacketIds.join(', ') || 'none'}`
  ].join('\n') + '\n'
);

console.log(`Generated assistant disclosure artifacts for ${suite.summary.totalPackets} packets.`);
console.log(`Release=${suite.summary.release} Review=${suite.summary.review} Hold=${suite.summary.hold}`);
