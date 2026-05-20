"use strict"

const assert = require("node:assert/strict")
const { assessEnterpriseInitiativeTags, normalizeId } = require("./index")

const now = "2026-05-20T00:00:00.000Z"

{
  const result = assessEnterpriseInitiativeTags({
    now,
    organizationId: "university-alpha",
    policies: [
      {
        id: "GRANT-TRACKED",
        label: "Grant tracked",
        allowedScopes: ["biology", "chemistry"],
        requiresOwnerApproval: true,
        requiresExpiry: true,
        maxDurationDays: 540,
        requiredEvidence: ["grant-award-letter"],
        publishToDashboard: true,
        funderId: "nih-r01-42",
        minimumReproducibilityScore: 80,
        openAccessRequired: true,
      },
      {
        id: "DOCTORAL-WORK",
        label: "Doctoral work",
        allowedScopes: ["biology"],
        requiresOwnerApproval: true,
        requiresExpiry: true,
        publishToDashboard: true,
      },
    ],
    evidence: [{ id: "grant-award-letter" }],
    projects: [
      {
        id: "project-1",
        title: "Single-cell atlas release",
        department: "biology",
        visibility: "public",
        dataClassification: "open",
        funderIds: ["nih-r01-42"],
        compliance: { openAccessStatus: "open", reproducibilityScore: 92 },
      },
    ],
    assignments: [
      {
        projectId: "project-1",
        tagId: "GRANT-TRACKED",
        scope: "biology",
        assignedAt: "2026-01-10T00:00:00.000Z",
        expiresAt: "2026-12-31T00:00:00.000Z",
        ownerApproval: true,
        evidenceIds: ["grant-award-letter"],
      },
      {
        projectId: "project-1",
        tagId: "DOCTORAL-WORK",
        scope: "biology",
        assignedAt: "2026-03-01T00:00:00.000Z",
        expiresAt: "2026-11-30T00:00:00.000Z",
        ownerApproval: true,
      },
    ],
  })

  assert.equal(result.status, "ready")
  assert.equal(result.summary.approved, 2)
  assert.equal(result.dashboardRollups.byTag.find((rollup) => rollup.tagId === "grant-tracked").projectCount, 1)
  assert.match(result.webhookEvents[0].signature, /^[0-9a-f]{64}$/)
  assert.match(result.auditDigest, /^[0-9a-f]{64}$/)
}

{
  const result = assessEnterpriseInitiativeTags({
    now,
    policies: [
      {
        id: "PUBLIC-INITIATIVE",
        label: "Public initiative",
        allowedScopes: ["organization"],
        requiresOwnerApproval: true,
        requiresExpiry: true,
        publishToDashboard: true,
        restrictedDataAllowed: false,
      },
    ],
    projects: [
      {
        id: "project-private",
        title: "Embargoed sponsor project",
        department: "oncology",
        visibility: "private",
        dataClassification: "restricted",
        compliance: { openAccessStatus: "embargoed", reproducibilityScore: 70 },
      },
    ],
    assignments: [
      {
        projectId: "project-private",
        tagId: "PUBLIC-INITIATIVE",
        scope: "organization",
        assignedAt: "2025-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T00:00:00.000Z",
        ownerApproval: false,
      },
    ],
  })

  const report = result.assignmentReports[0]
  assert.equal(result.status, "blocked")
  assert.equal(report.status, "held")
  assert.ok(report.blockers.includes("tag public-initiative is missing owner approval"))
  assert.ok(report.blockers.includes("tag public-initiative expired on 2026-01-01"))
  assert.ok(report.blockers.includes("tag public-initiative would expose a restricted project in admin dashboard rollups"))
}

{
  const result = assessEnterpriseInitiativeTags({
    now,
    policies: [
      {
        id: "PUBLIC-RELEASE",
        allowedScopes: ["physics"],
        mutuallyExclusiveWith: ["INTERNAL-ONLY"],
        publishToDashboard: true,
      },
      {
        id: "INTERNAL-ONLY",
        allowedScopes: ["physics"],
        mutuallyExclusiveWith: ["PUBLIC-RELEASE"],
        publishToDashboard: false,
      },
    ],
    projects: [{ id: "project-2", department: "physics", visibility: "public", dataClassification: "open" }],
    assignments: [
      { projectId: "project-2", tagId: "PUBLIC-RELEASE", scope: "physics" },
      { projectId: "project-2", tagId: "INTERNAL-ONLY", scope: "physics" },
    ],
  })

  assert.equal(result.status, "blocked")
  assert.ok(result.assignmentReports[0].blockers.includes("tag public-release conflicts with internal-only"))
  assert.ok(result.assignmentReports[1].blockers.includes("tag internal-only conflicts with public-release"))
}

{
  const result = assessEnterpriseInitiativeTags({
    now,
    policies: [
      {
        id: "Funder Export",
        allowedScopes: ["chemistry"],
        funderId: "horizon-eu-9",
        minimumReproducibilityScore: 90,
        openAccessRequired: true,
        publishToDashboard: true,
      },
    ],
    projects: [
      {
        id: "project-3",
        department: "chemistry",
        visibility: "public",
        dataClassification: "open",
        funderIds: ["ukri-22"],
        compliance: { openAccessStatus: "closed", reproducibilityScore: 82 },
      },
    ],
    assignments: [{ projectId: "project-3", tagId: "Funder Export", scope: "chemistry" }],
  })

  assert.equal(normalizeId("Funder Export"), "funder-export")
  assert.equal(result.status, "blocked")
  assert.ok(result.assignmentReports[0].blockers.includes("tag funder-export requires funder horizon-eu-9"))
  assert.ok(result.assignmentReports[0].warnings.includes("project reproducibility score 82 is below 90"))
  assert.ok(result.assignmentReports[0].warnings.includes("project open access status is closed"))
}

console.log("enterprise-initiative-tag-governance tests passed")
