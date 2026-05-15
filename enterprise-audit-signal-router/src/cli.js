#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEnterpriseToolingBrief } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, '..', 'sample', 'enterprise-fixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const brief = buildEnterpriseToolingBrief(fixture);

console.log('Enterprise Audit Signal Router Demo');
console.log(`Institution: ${brief.institution}`);
console.log(`Projects: ${brief.dashboard.projectCounts.total} (${brief.dashboard.projectCounts.public} public / ${brief.dashboard.projectCounts.private} private)`);
console.log(`Top researcher: ${brief.dashboard.contributorAnalytics.topResearchers[0].name}`);
console.log(`Compliance risks: ${brief.dashboard.complianceTracking.filter((item) => item.status === 'attention-required').length}`);
console.log(`Webhook deliveries: ${brief.routedEvents.reduce((sum, route) => sum + route.deliveries.length, 0)}`);
console.log(`Export packets: ${brief.exportPackets.length}`);
console.log(`Audit hash: ${brief.auditHash.slice(0, 16)}`);
