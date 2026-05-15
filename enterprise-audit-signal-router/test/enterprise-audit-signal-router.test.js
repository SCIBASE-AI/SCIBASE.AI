import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminDashboard,
  buildApiCatalog,
  buildEnterpriseToolingBrief,
  buildExportPacket,
  evaluateCompliance,
  routeEnterpriseEvents
} from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sample', 'enterprise-fixture.json'), 'utf8'));

test('admin dashboard covers visibility, contributor analytics, usage, productivity, compliance, and custom tags', () => {
  const dashboard = buildAdminDashboard(fixture);

  assert.equal(dashboard.projectCounts.total, 2);
  assert.equal(dashboard.projectCounts.public, 1);
  assert.equal(dashboard.projectCounts.private, 1);
  assert.equal(dashboard.customTags['GRANT-TRACKED'], 1);
  assert.equal(dashboard.usageStats.logins, 50);
  assert.equal(dashboard.usageStats.submissions, 6);
  assert.equal(dashboard.productivityMetrics.aiReviewsGenerated, 19);
  assert.equal(dashboard.productivityMetrics.peerReviewsCompleted, 7);
  assert.equal(dashboard.contributorAnalytics.topResearchers[0].name, 'Ada Kim');
  assert.equal(dashboard.complianceTracking.some((entry) => entry.status === 'attention-required'), true);
  assert.match(dashboard.dashboardHash, /^[a-f0-9]{64}$/);
});

test('compliance evaluator flags funder, open-access, and reproducibility gaps', () => {
  const privateProject = fixture.projects.find((project) => project.id === 'proj-private-climate');
  const compliance = evaluateCompliance(privateProject);

  assert.equal(compliance.status, 'attention-required');
  assert.ok(compliance.missing.includes('open access confirmation'));
  assert.ok(compliance.missing.includes('reproducibility score >= 0.80'));
  assert.ok(compliance.flags.every((flag) => flag.startsWith('COMPLIANCE:')));
});

test('API catalog includes scoped REST endpoints, webhooks, integrations, and security controls', () => {
  const catalog = buildApiCatalog(fixture);

  assert.ok(catalog.restEndpoints.find((endpoint) => endpoint.path === '/api/enterprise/projects'));
  assert.ok(catalog.webhookEvents.find((event) => event.event === 'publication.released'));
  assert.ok(catalog.integrations.find((integration) => integration.system === 'DSpace' && integration.configured));
  assert.ok(catalog.integrations.find((integration) => integration.system === 'Canvas' && integration.configured));
  assert.ok(catalog.integrations.find((integration) => integration.system === 'ORCID' && integration.configured));
  assert.ok(catalog.securityControls.includes('HMAC webhook signatures'));
  assert.ok(catalog.securityControls.includes('least-privilege scopes'));
});

test('event router prepares signed webhook deliveries for project, publication, and review events', () => {
  const routes = routeEnterpriseEvents(fixture, [
    { type: 'project.created', projectId: 'proj-open-catalyst', occurredAt: '2026-05-10T12:00:00.000Z' },
    { type: 'publication.released', projectId: 'proj-open-catalyst', occurredAt: '2026-05-11T12:00:00.000Z' },
    { type: 'review.completed', projectId: 'proj-private-climate', occurredAt: '2026-05-12T12:00:00.000Z' }
  ]);

  assert.equal(routes.length, 3);
  assert.deepEqual(routes[0].destinations, ['DSpace', 'Canvas', 'HRIS']);
  assert.ok(routes[1].deliveries.find((delivery) => delivery.destination === 'Zenodo'));
  assert.equal(routes[2].deliveries[0].headers['X-SCIBASE-Event'], 'review.completed');
  assert.match(routes[2].deliveries[0].headers['X-SCIBASE-Signature-256'], /^[a-f0-9]{64}$/);
});

test('export packet preserves DOI, ORCID, citation, version history, journal, repository, and funder targets', () => {
  const packet = buildExportPacket(fixture, 'proj-open-catalyst', ['arxiv', 'zenodo', 'nih-reporter']);

  assert.equal(packet.metadata.doi, '10.5555/scibase.catalyst.2026');
  assert.ok(packet.metadata.orcids.includes('0000-0002-1111-2222'));
  assert.ok(packet.metadata.citations[0].includes('Open catalyst'));
  assert.ok(packet.metadata.versionHistory.includes('v1.0 preprint'));
  assert.ok(packet.targets.find((target) => target.target === 'arxiv' && target.format === 'LaTeX'));
  assert.ok(packet.targets.find((target) => target.target === 'zenodo' && target.format === 'DataCite JSON-LD'));
  assert.ok(packet.targets.find((target) => target.target === 'nih-reporter' && target.format === 'grant report packet'));
  assert.equal(packet.compliance.status, 'compliant');
  assert.match(packet.packetHash, /^[a-f0-9]{64}$/);
});

test('enterprise brief maps every issue capability to concrete dashboard, integration, webhook, and export evidence', () => {
  const brief = buildEnterpriseToolingBrief(fixture);

  assert.equal(brief.requirementMap.adminDashboards.length, 6);
  assert.equal(brief.requirementMap.apiAndWebhooks.length, 3);
  assert.equal(brief.requirementMap.exportPipelines.length, 3);
  assert.ok(brief.acceptanceEvidence.some((item) => item.includes('projects summarized')));
  assert.ok(brief.acceptanceEvidence.some((item) => item.includes('signed webhook deliveries')));
  assert.ok(brief.acceptanceEvidence.some((item) => item.includes('export packets generated')));
  assert.ok(brief.routedEvents.length >= 5);
  assert.equal(brief.exportPackets.length, 2);
  assert.match(brief.auditHash, /^[a-f0-9]{64}$/);
});
