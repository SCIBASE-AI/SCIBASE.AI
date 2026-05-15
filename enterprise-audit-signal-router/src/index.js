import crypto from 'node:crypto';

const DEFAULT_EVENT_ROUTES = {
  'project.created': ['DSpace', 'Canvas', 'HRIS'],
  'publication.released': ['DSpace', 'Zenodo', 'PubMed Central', 'funder-portal'],
  'review.completed': ['Canvas', 'ELN', 'reporting-platform']
};

const EXPORT_TARGETS = {
  arxiv: { format: 'LaTeX', mandate: 'preprint-ready manuscript' },
  biorxiv: { format: 'JATS', mandate: 'life-science preprint deposit' },
  zenodo: { format: 'DataCite JSON-LD', mandate: 'dataset and software DOI deposit' },
  'pubmed-central': { format: 'JATS XML', mandate: 'public-access manuscript archive' },
  'nih-reporter': { format: 'grant report packet', mandate: 'NIH progress reporting' },
  ukri: { format: 'funder compliance CSV', mandate: 'UKRI open research reporting' }
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret || 'scibase-enterprise').update(stableStringify(payload)).digest('hex');
}

function indexById(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

export function normalizeEnterpriseWorkspace(input) {
  const institution = input.institution || {};
  const contributors = (input.contributors || []).map((contributor) => ({
    logins: 0,
    ...contributor,
    department: contributor.department || 'Unassigned',
    lab: contributor.lab || 'Unassigned'
  }));
  const knownContributors = indexById(contributors);
  const projects = (input.projects || []).map((project) => ({
    visibility: 'private',
    tags: [],
    contributors: [],
    storageGb: 0,
    computeHours: 0,
    submissions: 0,
    aiReviews: 0,
    peerReviews: 0,
    funderMandates: [],
    openAccess: false,
    reproducibilityScore: 0,
    citations: [],
    versions: [],
    events: [],
    ...project,
    contributorDetails: (project.contributors || []).map((id) => knownContributors.get(id)).filter(Boolean)
  }));

  return {
    institution: {
      id: institution.id || 'enterprise-institution',
      name: institution.name || 'Enterprise Institution',
      departments: institution.departments || [],
      apiClients: institution.apiClients || [],
      webhookSecret: institution.webhookSecret || 'scibase-enterprise'
    },
    contributors,
    projects,
    usageWindow: input.usageWindow || 'current'
  };
}

export function evaluateCompliance(project) {
  const missing = [];
  if ((project.funderMandates || []).length === 0) missing.push('funder mandate mapping');
  if (!project.openAccess) missing.push('open access confirmation');
  if ((project.reproducibilityScore || 0) < 0.8) missing.push('reproducibility score >= 0.80');
  if (!project.doi && project.visibility === 'public') missing.push('DOI for public output');

  return {
    projectId: project.id,
    openAccess: Boolean(project.openAccess),
    funderMandates: project.funderMandates || [],
    reproducibilityScore: Number(project.reproducibilityScore || 0),
    status: missing.length === 0 ? 'compliant' : 'attention-required',
    missing,
    flags: missing.map((item) => `COMPLIANCE:${item.toUpperCase()}`)
  };
}

export function buildAdminDashboard(input) {
  const workspace = normalizeEnterpriseWorkspace(input);
  const projectCounts = workspace.projects.reduce((acc, project) => {
    acc.total += 1;
    acc[project.visibility] = (acc[project.visibility] || 0) + 1;
    acc.byDepartment[project.department] = (acc.byDepartment[project.department] || 0) + 1;
    for (const tag of project.tags) acc.tags[tag] = (acc.tags[tag] || 0) + 1;
    return acc;
  }, { total: 0, public: 0, private: 0, byDepartment: {}, tags: {} });

  const contributorStats = workspace.contributors.map((contributor) => {
    const projects = workspace.projects.filter((project) => project.contributors.includes(contributor.id));
    const labs = new Set(projects.map((project) => project.lab));
    return {
      id: contributor.id,
      name: contributor.name,
      department: contributor.department,
      activityHeat: contributor.logins + projects.reduce((sum, project) => sum + project.submissions + project.aiReviews + project.peerReviews, 0),
      projectCount: projects.length,
      crossLabCollaborations: Math.max(0, labs.size - 1),
      orcid: contributor.orcid
    };
  }).sort((a, b) => b.activityHeat - a.activityHeat || a.name.localeCompare(b.name));

  const usage = workspace.projects.reduce((acc, project) => {
    acc.logins = workspace.contributors.reduce((sum, contributor) => sum + contributor.logins, 0);
    acc.submissions += project.submissions;
    acc.storageGb += project.storageGb;
    acc.computeHours += project.computeHours;
    return acc;
  }, { logins: 0, submissions: 0, storageGb: 0, computeHours: 0 });

  const productivity = workspace.projects.reduce((acc, project) => {
    acc.projectsPerLab[project.lab] = (acc.projectsPerLab[project.lab] || 0) + 1;
    acc.aiReviewsGenerated += project.aiReviews;
    acc.peerReviewsCompleted += project.peerReviews;
    return acc;
  }, { projectsPerLab: {}, aiReviewsGenerated: 0, peerReviewsCompleted: 0 });

  const compliance = workspace.projects.map(evaluateCompliance);

  return {
    institution: workspace.institution.name,
    usageWindow: workspace.usageWindow,
    projectCounts,
    contributorAnalytics: {
      topResearchers: contributorStats.slice(0, 5),
      activityHeatmap: contributorStats.map(({ id, activityHeat }) => ({ contributorId: id, heat: activityHeat })),
      crossLabCollaborations: contributorStats.filter((stat) => stat.crossLabCollaborations > 0)
    },
    usageStats: usage,
    productivityMetrics: productivity,
    complianceTracking: compliance,
    customTags: projectCounts.tags,
    dashboardHash: digest({ projectCounts, contributorStats, usage, productivity, compliance })
  };
}

export function buildApiCatalog(input) {
  const workspace = normalizeEnterpriseWorkspace(input);
  const clientSystems = new Set(workspace.institution.apiClients.map((client) => client.system));
  const integrations = ['DSpace', 'Invenio', 'Canvas', 'Moodle', 'ELN', 'lab-inventory', 'HRIS', 'ORCID'].map((system) => ({
    system,
    configured: clientSystems.has(system) || [...clientSystems].some((client) => client.toLowerCase().includes(system.toLowerCase())),
    auth: 'signed service token with scoped API key rotation'
  }));

  return {
    restEndpoints: [
      { method: 'GET', path: '/api/enterprise/projects', scope: 'projects:read', purpose: 'list public/private hosted projects for dashboards and archives' },
      { method: 'GET', path: '/api/enterprise/contributors', scope: 'contributors:sync', purpose: 'sync ORCID/HRIS personnel metadata' },
      { method: 'POST', path: '/api/enterprise/exports', scope: 'exports:write', purpose: 'create export packets for repositories, journals, and funders' },
      { method: 'GET', path: '/api/enterprise/reviews', scope: 'reviews:read', purpose: 'share reproducibility scores and peer-review status with LMS/ELN systems' }
    ],
    webhookEvents: Object.keys(DEFAULT_EVENT_ROUTES).map((event) => ({ event, destinations: DEFAULT_EVENT_ROUTES[event], signatureHeader: 'X-SCIBASE-Signature-256' })),
    integrations,
    apiClients: workspace.institution.apiClients,
    securityControls: ['HMAC webhook signatures', 'least-privilege scopes', 'idempotency keys', 'PII-minimized payloads', 'audit hashes']
  };
}

export function routeEnterpriseEvents(input, events = []) {
  const workspace = normalizeEnterpriseWorkspace(input);
  const projects = indexById(workspace.projects);
  const secret = workspace.institution.webhookSecret;

  return events.map((event) => {
    const project = projects.get(event.projectId);
    const payload = {
      event: event.type,
      projectId: event.projectId,
      title: project?.title || 'Unknown project',
      visibility: project?.visibility || 'unknown',
      department: project?.department || 'unknown',
      reproducibilityScore: project?.reproducibilityScore ?? null,
      doi: project?.doi || null,
      occurredAt: event.occurredAt || '2026-05-15T00:00:00.000Z'
    };
    const destinations = DEFAULT_EVENT_ROUTES[event.type] || ['reporting-platform'];
    return {
      eventId: event.id || digest(payload).slice(0, 12),
      type: event.type,
      destinations,
      deliveries: destinations.map((destination) => ({
        destination,
        method: 'POST',
        url: `https://integrations.example/${destination.toLowerCase().replace(/\s+/g, '-')}/webhooks/scibase`,
        payload,
        headers: {
          'Content-Type': 'application/json',
          'X-SCIBASE-Event': event.type,
          'X-SCIBASE-Signature-256': signPayload({ destination, payload }, secret)
        }
      }))
    };
  });
}

export function buildExportPacket(input, projectId, requestedTargets = ['zenodo', 'pubmed-central', 'nih-reporter']) {
  const workspace = normalizeEnterpriseWorkspace(input);
  const project = workspace.projects.find((item) => item.id === projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  const contributorLookup = indexById(workspace.contributors);
  const contributors = project.contributors.map((id) => contributorLookup.get(id)).filter(Boolean).map((contributor) => ({
    name: contributor.name,
    orcid: contributor.orcid,
    department: contributor.department
  }));
  const targets = requestedTargets.map((target) => ({
    target,
    ...(EXPORT_TARGETS[target] || { format: 'custom package', mandate: 'custom institutional export' })
  }));

  return {
    projectId: project.id,
    title: project.title,
    visibility: project.visibility,
    targets,
    manuscriptFormats: [...new Set(targets.map((target) => target.format))],
    metadata: {
      doi: project.doi,
      orcids: contributors.map((contributor) => contributor.orcid).filter(Boolean),
      citations: project.citations,
      versionHistory: project.versions,
      tags: project.tags,
      funderMandates: project.funderMandates
    },
    compliance: evaluateCompliance(project),
    files: targets.map((target) => `${project.id}/${target.target}.${target.format.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
    packetHash: digest({ project, contributors, targets })
  };
}

export function buildEnterpriseToolingBrief(input) {
  const workspace = normalizeEnterpriseWorkspace(input);
  const dashboard = buildAdminDashboard(workspace);
  const apiCatalog = buildApiCatalog(workspace);
  const events = workspace.projects.flatMap((project) => project.events.map((type, index) => ({
    id: `${project.id}-${type}-${index}`,
    type,
    projectId: project.id,
    occurredAt: `2026-05-${String(10 + index).padStart(2, '0')}T12:00:00.000Z`
  })));
  const routedEvents = routeEnterpriseEvents(workspace, events);
  const exportPackets = workspace.projects.map((project) => buildExportPacket(workspace, project.id));

  const requirementMap = {
    adminDashboards: ['project visibility counts', 'contributor heatmaps', 'usage stats', 'productivity metrics', 'compliance tracking', 'custom tags'],
    apiAndWebhooks: ['secure REST endpoints', 'DSpace/Invenio/LMS/ELN/HRIS/ORCID integration catalog', 'signed project/publication/review webhooks'],
    exportPipelines: ['preprint and repository targets', 'journal/funder formats', 'DOI/ORCID/citation/version preservation']
  };

  return {
    institution: workspace.institution.name,
    dashboard,
    apiCatalog,
    routedEvents,
    exportPackets,
    requirementMap,
    acceptanceEvidence: [
      `${dashboard.projectCounts.total} projects summarized across public/private visibility`,
      `${dashboard.complianceTracking.filter((item) => item.status === 'attention-required').length} compliance risks flagged`,
      `${routedEvents.reduce((sum, route) => sum + route.deliveries.length, 0)} signed webhook deliveries prepared`,
      `${exportPackets.length} export packets generated with preserved DOI/ORCID/citation metadata`
    ],
    auditHash: digest({ dashboard, apiCatalog, routedEvents, exportPackets, requirementMap })
  };
}
