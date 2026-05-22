const assert = require("assert");
const { project } = require("./sample-data");
const { buildReviewPacket, evaluateWebhookPayloads, renderMarkdownReport, renderSvgSummary } = require("./index");

const evaluation = evaluateWebhookPayloads(project);
const packet = buildReviewPacket(project);

assert.strictEqual(packet.guard, "webhook-payload-redaction-guard");
assert.strictEqual(packet.issue, "SCIBASE-AI/SCIBASE.AI#19");
assert.strictEqual(packet.decision, "block-unsafe-webhook-delivery");

assert.ok(
  evaluation.findings.some((finding) => finding.rule === "webhook-pii-field-present"),
  "expected PII field finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "webhook-private-project-field-present"),
  "expected private field finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "webhook-private-storage-link-present"),
  "expected private storage link finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "webhook-region-not-allowed"),
  "expected region finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "webhook-signature-algorithm-unsafe"),
  "expected signature algorithm finding"
);

const decisionByEvent = new Map(evaluation.eventDecisions.map((decision) => [decision.eventId, decision.decision]));
assert.strictEqual(decisionByEvent.get("evt-001"), "block-delivery");
assert.strictEqual(decisionByEvent.get("evt-002"), "deliver");
assert.strictEqual(decisionByEvent.get("evt-003"), "block-delivery");

const cleanProject = JSON.parse(JSON.stringify(project));
cleanProject.outboundEvents = [
  {
    eventId: "evt-clean",
    eventType: "project.published",
    occurredAt: "2026-05-22T18:25:00Z",
    institutionId: "inst-northbridge",
    destination: { connector: "DSpace", region: "US", purpose: "public-metadata" },
    project: {
      id: "proj-202",
      title: "Open Climate Notebook",
      visibility: "public",
      owner: { orcid: "0000-0003-3333-4444" }
    },
    dataset: {
      id: "data-open",
      access: "public",
      embargoUntil: null,
      downloadUrl: "https://doi.org/10.5281/zenodo.20260523",
      doi: "10.5281/zenodo.20260523"
    },
    signature: { algorithm: "HMAC-SHA256", keyId: "enterprise-prod-2026", digest: "sha256:def" }
  }
];

const cleanPacket = buildReviewPacket(cleanProject);
assert.strictEqual(cleanPacket.decision, "webhook-payload-ready");
assert.strictEqual(cleanPacket.findings.length, 0);

const markdown = renderMarkdownReport(packet);
assert.ok(markdown.includes("## Event Decisions"));
assert.ok(markdown.includes("webhook-pii-field-present"));

const svg = renderSvgSummary(packet);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Webhook Payload Redaction Guard"));

console.log("webhook-payload-redaction-guard tests passed");
