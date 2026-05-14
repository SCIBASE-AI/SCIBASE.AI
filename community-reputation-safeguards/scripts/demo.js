'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildCommunityReputationReport,
  renderSummary,
} = require('../src/reputation-safeguards');

const communityPath = path.join(__dirname, '..', 'data', 'sample-community.json');
const community = JSON.parse(fs.readFileSync(communityPath, 'utf8'));
const report = buildCommunityReputationReport(community);
const top = report.leaderboards.global[0];

console.log(`Top contributor: ${top.name}`);
console.log(`Top badge: ${top.badges[0]}`);
console.log(`Top tier: ${top.tier}`);
console.log(`Abuse signals: ${report.abuseSignals.length}`);
console.log(`Anonymous comments redacted: ${report.comments.filter((comment) => comment.author.name === 'Anonymous reviewer').length}`);
console.log('');
console.log(renderSummary(report));
