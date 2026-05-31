"use strict";

const assert = require("assert");
const {
  evaluateDependencyProvenance,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  daysBetween,
  normalizeDependencyKey
} = require("./index");
const sampleData = require("./sample-data");

function testSampleReview() {
  const result = evaluateDependencyProvenance(sampleData);

  assert.strictEqual(result.releaseDecision, "block_publication");
  assert.strictEqual(result.summary.projectCount, 4);
  assert.strictEqual(result.summary.dependencyCount, 5);
  assert.strictEqual(result.summary.clearCount, 1);
  assert.strictEqual(result.summary.holdCount, 1);
  assert.strictEqual(result.summary.blockCount, 2);
  assert.ok(result.summary.criticalCount >= 5, "expected critical blocked publication findings");
  assert.ok(result.summary.warningCount >= 4, "expected warning findings for stale or incomplete evidence");
  assert.ok(result.auditDigest.match(/^[a-f0-9]{64}$/), "expected sha256 audit digest");

  const projectStatuses = Object.fromEntries(result.projects.map((project) => [project.projectId, project.status]));
  assert.strictEqual(projectStatuses["project-neuro-crispr"], "clear");
  assert.strictEqual(projectStatuses["project-quantum-cavity"], "hold_recommendations");
  assert.strictEqual(projectStatuses["project-clinical-proteomics"], "block_publication");
  assert.strictEqual(projectStatuses["project-legacy-climate"], "block_publication");

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.ok(codes.has("private_dependency_in_public_recommendation"));
  assert.ok(codes.has("restricted_license_public_recommendation"));
  assert.ok(codes.has("high_risk_dependency_advisory"));
  assert.ok(codes.has("deprecated_dependency_edge"));
  assert.ok(codes.has("public_recommendation_uses_blocked_dependency"));

  const recommendationStatuses = Object.fromEntries(result.recommendations.map((rec) => [rec.recommendationId, rec.status]));
  assert.strictEqual(recommendationStatuses["rec-single-cell-pipeline"], "publishable");
  assert.strictEqual(recommendationStatuses["rec-cavity-operators"], "hold_for_review");
  assert.strictEqual(recommendationStatuses["rec-clinical-cohort"], "suppress");
  assert.strictEqual(recommendationStatuses["rec-climate-dashboard"], "suppress");
}

function testCleanProject() {
  const input = {
    generatedAt: "2026-06-01T00:00:00.000Z",
    projects: [
      {
        id: "clean-project",
        title: "Clean Dependency Graph",
        publicGraph: true,
        runtime: {
          containerDigest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          lockfileHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
          executedAt: "2026-05-31T00:00:00.000Z"
        },
        dependencies: [
          {
            name: "pandas",
            ecosystem: "pypi",
            declaredVersion: "2.2.2",
            lockfileVersion: "2.2.2",
            runtimeVersion: "2.2.2",
            declaredIn: "requirements.lock",
            license: "BSD-3-Clause",
            packageUrl: "pkg:pypi/pandas@2.2.2",
            source: { access: "public", repository: "https://github.com/pandas-dev/pandas" },
            evidence: {
              lockfileHash: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
              sbomRef: "bom-ref:pandas-2.2.2",
              resolvedAt: "2026-05-30T00:00:00.000Z"
            }
          }
        ],
        recommendations: [
          {
            id: "rec-pandas-clean",
            title: "Recommend clean pandas workflow",
            public: true,
            dependencies: ["pypi:pandas"]
          }
        ]
      }
    ]
  };

  const result = evaluateDependencyProvenance(input);
  assert.strictEqual(result.releaseDecision, "clear");
  assert.strictEqual(result.summary.findingCount, 0);
  assert.strictEqual(result.recommendations[0].status, "publishable");
}

function testRenderersAndUtilities() {
  const result = evaluateDependencyProvenance(sampleData);
  const markdown = renderMarkdownReport(result);
  const svg = renderSvgSummary(result);

  assert.ok(markdown.includes("Scientific Software Dependency Provenance Graph Review"));
  assert.ok(markdown.includes(result.auditDigest));
  assert.ok(svg.includes("<svg"));
  assert.ok(svg.includes("Software Dependency Provenance Guard"));
  assert.strictEqual(stableStringify({ b: 1, a: 2 }), "{\"a\":2,\"b\":1}");
  assert.strictEqual(daysBetween("2026-06-01T00:00:00.000Z", "2026-06-10T00:00:00.000Z"), 9);
  assert.strictEqual(normalizeDependencyKey({ ecosystem: "NPM", name: "React" }), "npm:react");
}

testSampleReview();
testCleanProject();
testRenderersAndUtilities();

console.log("software-dependency-provenance-graph-guard tests passed");
