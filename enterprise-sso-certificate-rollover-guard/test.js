"use strict";

const assert = require("assert");
const {
  evaluateRolloverReadiness,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  daysBetween
} = require("./index");
const sampleData = require("./sample-data");

function testSampleReview() {
  const result = evaluateRolloverReadiness(sampleData);

  assert.strictEqual(result.releaseDecision, "block_metadata_release");
  assert.strictEqual(result.summary.tenantCount, 4);
  assert.strictEqual(result.summary.clearCount, 1);
  assert.strictEqual(result.summary.blockCount, 1);
  assert.strictEqual(result.summary.holdCount, 2);
  assert.ok(result.summary.criticalCount >= 6, "expected several critical findings");
  assert.ok(result.auditDigest.match(/^[a-f0-9]{64}$/), "expected sha256 audit digest");

  const tenantStatuses = Object.fromEntries(result.tenants.map((tenant) => [tenant.tenantId, tenant.status]));
  assert.strictEqual(tenantStatuses["tenant-tokyo-molecular"], "clear");
  assert.strictEqual(tenantStatuses["tenant-kyoto-research"], "hold_rollover");
  assert.strictEqual(tenantStatuses["tenant-materials-consortium"], "block_metadata_release");
  assert.strictEqual(tenantStatuses["tenant-oceanic-biocore"], "hold_rollover");

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.ok(codes.has("primary_certificate_expires_during_freeze"));
  assert.ok(codes.has("unsafe_signing_algorithm"));
  assert.ok(codes.has("weak_rsa_key_size"));
  assert.ok(codes.has("entity_id_drift"));
  assert.ok(codes.has("acs_url_drift"));
  assert.ok(codes.has("insufficient_certificate_overlap"));
}

function testCleanTenant() {
  const cleanInput = {
    generatedAt: "2026-06-01T00:00:00.000Z",
    tenants: [
      {
        id: "clean",
        name: "Clean Institute",
        adminContact: "admin@clean.example",
        metadata: {
          entityId: "https://clean.example/saml",
          acsUrl: "https://scibase.example/saml/acs/clean",
          lastFetchedAt: "2026-05-31T00:00:00.000Z"
        },
        endpoint: {
          expectedEntityId: "https://clean.example/saml",
          expectedAcsUrl: "https://scibase.example/saml/acs/clean"
        },
        rollover: {
          ticketId: "ENT-1",
          owner: "Admin",
          stagedCertId: "clean-next",
          fallbackLoginTestedAt: "2026-05-31T00:00:00.000Z"
        },
        certificates: [
          {
            id: "clean-primary",
            role: "signing",
            primary: true,
            fingerprint: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            algorithm: "RSA-SHA256",
            keySize: 2048,
            notBefore: "2025-01-01T00:00:00.000Z",
            notAfter: "2027-01-01T00:00:00.000Z"
          },
          {
            id: "clean-next",
            role: "signing",
            primary: false,
            fingerprint: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            algorithm: "RSA-SHA256",
            keySize: 3072,
            notBefore: "2026-12-01T00:00:00.000Z",
            notAfter: "2028-12-01T00:00:00.000Z"
          }
        ],
        connectedSystems: [
          { name: "Archive", owner: "library", lastMetadataRefreshAt: "2026-05-30T00:00:00.000Z" }
        ]
      }
    ]
  };

  const result = evaluateRolloverReadiness(cleanInput);
  assert.strictEqual(result.releaseDecision, "clear");
  assert.strictEqual(result.summary.findingCount, 0);
  assert.strictEqual(result.tenants[0].status, "clear");
}

function testRenderersAndStableUtilities() {
  const result = evaluateRolloverReadiness(sampleData);
  const markdown = renderMarkdownReport(result);
  const svg = renderSvgSummary(result);

  assert.ok(markdown.includes("Enterprise SSO Certificate Rollover Review"));
  assert.ok(markdown.includes(result.auditDigest));
  assert.ok(svg.includes("<svg"));
  assert.ok(svg.includes("Enterprise SSO Certificate Rollover Guard"));
  assert.strictEqual(stableStringify({ b: 1, a: 2 }), "{\"a\":2,\"b\":1}");
  assert.strictEqual(daysBetween("2026-06-01T00:00:00.000Z", "2026-06-10T00:00:00.000Z"), 9);
}

testSampleReview();
testCleanTenant();
testRenderersAndStableUtilities();

console.log("enterprise-sso-certificate-rollover-guard tests passed");
