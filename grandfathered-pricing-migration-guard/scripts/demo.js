'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildMarkdownReport,
  buildSvgSummary,
  evaluatePortfolio
} = require('../src');

const root = path.join(__dirname, '..');
const examplesPath = path.join(root, 'examples', 'migration-packets.json');
const artifactsDir = path.join(root, 'artifacts');
const packet = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));
const portfolio = evaluatePortfolio(packet);

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, 'pricing-migration-results.json'),
  `${JSON.stringify(portfolio, null, 2)}\n`
);
fs.writeFileSync(
  path.join(artifactsDir, 'pricing-migration-report.md'),
  buildMarkdownReport(portfolio)
);
fs.writeFileSync(
  path.join(artifactsDir, 'pricing-migration-summary.svg'),
  buildSvgSummary(portfolio)
);
fs.writeFileSync(
  path.join(artifactsDir, 'demo-transcript.md'),
  [
    '# Demo Transcript',
    '',
    '1. Load five synthetic legacy-price account packets.',
    '2. Evaluate notice windows, price locks, consent thresholds, add-on parity, usage regressions, and reviewer evidence.',
    '3. Emit deterministic invoice-release decisions: RELEASE_INVOICE, REVIEW_BEFORE_RELEASE, or HOLD_INVOICE.',
    '4. Write JSON, Markdown, and SVG artifacts for reviewer replay.',
    '',
    '## Demo Output',
    '',
    `- Release: ${portfolio.summary.release}`,
    `- Review: ${portfolio.summary.review}`,
    `- Hold: ${portfolio.summary.hold}`,
    `- Held accounts: ${portfolio.summary.heldAccountIds.join(', ') || 'none'}`,
    `- Review accounts: ${portfolio.summary.reviewAccountIds.join(', ') || 'none'}`
  ].join('\n') + '\n'
);

console.log(
  `Generated pricing migration artifacts for ${portfolio.summary.totalAccounts} synthetic accounts.`
);
console.log(
  `Release=${portfolio.summary.release} Review=${portfolio.summary.review} Hold=${portfolio.summary.hold}`
);
