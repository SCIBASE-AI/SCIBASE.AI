import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { evaluateSlaPortfolio } from '../src/sla-uptime-monitor.js';

const here = dirname(fileURLToPath(import.meta.url));
const samplePath = join(here, '..', 'data', 'sample-sla-input.json');
const input = JSON.parse(await readFile(samplePath, 'utf8'));
const report = evaluateSlaPortfolio(input);

console.log('SCIBASE Enterprise SLA Uptime Monitor');
console.log(`Window: ${report.windowMinutes} minutes`);
console.log(`Services: ${report.adminMetrics.serviceCount}`);
console.log(`Breaches: ${report.adminMetrics.breachedServices}`);
console.log(`Watch: ${report.adminMetrics.watchServices}`);
console.log(`Blocked exports: ${report.adminMetrics.exportsBlocked}`);
console.log(`Queued actions: ${report.adminMetrics.queuedActions}`);
console.log(`Evidence digest: ${report.evidenceDigest}`);
console.log('\nAction queue:');
for (const action of report.actionQueue) {
  console.log(`- [${action.priority}] ${action.type}: ${action.summary}`);
}
