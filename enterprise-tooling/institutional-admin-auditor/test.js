const assert = require("assert");
const {
  auditEnterpriseTenant,
  digest,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { enterprisePolicy, readyTenant, riskyTenant } = require("./sample-data");

const risky = auditEnterpriseTenant(riskyTenant, enterprisePolicy);
assert.strictEqual(risky.decision, "block-enterprise-rollout");
assert.ok(risky.riskScore >= 90, "risky tenant should produce a strong block score");
assert.ok(risky.findings.some((item) => item.code === "OWNER_ADMIN_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "ADMIN_MFA_DISABLED"));
assert.ok(risky.findings.some((item) => item.code === "ADMIN_DASHBOARD_WIDGET_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "API_REQUIRED_SCOPE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "WEBHOOK_SIGNATURE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "EXPORT_PII_SCRUB_DISABLED"));
assert.ok(risky.findings.some((item) => item.code === "ENTERPRISE_AUDIT_LOGGING_DISABLED"));
assert.ok(risky.findings.some((item) => item.code === "DPA_REQUIRED_BUT_MISSING"));

const repeat = auditEnterpriseTenant(riskyTenant, enterprisePolicy);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const ready = auditEnterpriseTenant(readyTenant, enterprisePolicy);
assert.strictEqual(ready.decision, "ready-for-enterprise-rollout");
assert.strictEqual(ready.findings.length, 0);
assert.strictEqual(ready.exportPipelineCount, 1);

assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Institutional Admin Audit"));
assert.ok(markdown.includes("Synthetic enterprise tenant only"));
assert.ok(markdown.includes("block-enterprise-rollout"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Institutional Admin Audit"));

console.log("institutional-admin-auditor tests passed");
