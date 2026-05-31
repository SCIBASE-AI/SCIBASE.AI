export const reviewDate = "2026-06-01T00:00:00Z";

export const repositoryPolicies = {
  maxRotationAgeDays: {
    "github-actions-token": 45,
    "deploy-key": 120,
    "registry-token": 60,
    "cloud-artifact-writer": 30,
    "bot-app-installation": 90
  },
  maxOwnerAttestationAgeDays: 30,
  maxDormantDays: 90,
  minDaysUntilExpiryForRelease: 14,
  protectedReleaseRefs: ["refs/heads/main", "refs/tags/v*"],
  requiredEvidence: ["ticket", "runbook", "attestationHash"],
  allowedEnvironmentScopes: {
    staging: ["contents:read", "checks:read", "packages:read", "actions:read"],
    release: [
      "contents:read",
      "checks:read",
      "packages:read",
      "packages:write",
      "id-token:write",
      "deployments:write"
    ],
    data: ["contents:read", "packages:read", "dataset:read"]
  },
  privilegedScopes: [
    "contents:write",
    "administration:write",
    "actions:write",
    "secrets:write",
    "packages:delete",
    "workflow:write"
  ]
};

export const projects = [
  {
    projectId: "oncology-signature-atlas",
    repository: "scibase/oncology-signature-atlas",
    releaseCandidate: "v2.1.0",
    releaseWindowStart: "2026-06-10T00:00:00Z",
    credentials: [
      {
        id: "gha-release-oidc",
        type: "github-actions-token",
        owner: "release-engineering",
        environments: ["release"],
        scopes: ["contents:read", "checks:read", "packages:write", "id-token:write"],
        allowedRefs: ["refs/heads/main", "refs/tags/v*"],
        lastRotatedAt: "2026-05-20T12:00:00Z",
        expiresAt: "2026-07-01T00:00:00Z",
        lastUsedAt: "2026-05-30T11:20:00Z",
        ownerConfirmedAt: "2026-05-27T08:00:00Z",
        secretScanStatus: "clean",
        evidence: {
          ticket: "SEC-2141",
          runbook: "release-oidc-rotation",
          attestationHash: "sha256:6cb56f5c7b7c4a7f9b9a9e2d4c38a4f7c5d28c3c7f42ab9b3f90d6bdf45b1a34"
        }
      },
      {
        id: "container-registry-publisher",
        type: "registry-token",
        owner: "platform",
        environments: ["release"],
        scopes: ["packages:read", "packages:write"],
        allowedRefs: ["refs/heads/main", "refs/tags/v*"],
        lastRotatedAt: "2026-05-02T09:10:00Z",
        expiresAt: "2026-06-25T00:00:00Z",
        lastUsedAt: "2026-05-29T16:10:00Z",
        ownerConfirmedAt: "2026-05-25T07:45:00Z",
        secretScanStatus: "clean",
        evidence: {
          ticket: "SEC-2077",
          runbook: "registry-publisher-rotation",
          attestationHash: "sha256:3b6b7f39bcaad1d7adcfaa7951b241e6f43ac69bc3ac531a02c8ed9ddf045b51"
        }
      }
    ]
  },
  {
    projectId: "climate-reanalysis-ledger",
    repository: "scibase/climate-reanalysis-ledger",
    releaseCandidate: "v0.9.4",
    releaseWindowStart: "2026-06-06T00:00:00Z",
    credentials: [
      {
        id: "legacy-publish-key",
        type: "deploy-key",
        owner: "former-maintainer",
        environments: ["release", "staging"],
        scopes: ["contents:read", "contents:write", "packages:write"],
        allowedRefs: ["*"],
        lastRotatedAt: "2025-10-17T00:00:00Z",
        expiresAt: "2026-06-08T00:00:00Z",
        lastUsedAt: "2026-02-11T19:33:00Z",
        ownerConfirmedAt: "2026-04-03T09:00:00Z",
        secretScanStatus: "unknown",
        evidence: {
          ticket: "SEC-1130",
          runbook: "",
          attestationHash: ""
        }
      },
      {
        id: "workflow-admin-pat",
        type: "github-actions-token",
        owner: "automation",
        environments: ["release"],
        scopes: ["contents:write", "actions:write", "secrets:write", "packages:delete"],
        allowedRefs: ["refs/heads/main", "refs/tags/v*"],
        lastRotatedAt: "2026-03-15T10:00:00Z",
        expiresAt: "2026-08-01T00:00:00Z",
        lastUsedAt: "2026-05-31T03:00:00Z",
        ownerConfirmedAt: "2026-05-29T04:00:00Z",
        secretScanStatus: "clean",
        evidence: {
          ticket: "SEC-1988",
          runbook: "pat-legacy-replacement",
          attestationHash: "sha256:93fd14ad473b4248c393c2cc3d0017d657c2a1d4a52437d588d24c5c3a142c25"
        }
      }
    ]
  },
  {
    projectId: "single-cell-lineage-browser",
    repository: "scibase/single-cell-lineage-browser",
    releaseCandidate: "v1.4.0",
    releaseWindowStart: "2026-06-21T00:00:00Z",
    credentials: [
      {
        id: "dataset-mirror-reader",
        type: "bot-app-installation",
        owner: "data-stewards",
        environments: ["data"],
        scopes: ["contents:read", "packages:read", "dataset:read"],
        allowedRefs: ["refs/heads/main"],
        lastRotatedAt: "2026-04-20T00:00:00Z",
        expiresAt: "2026-09-01T00:00:00Z",
        lastUsedAt: "2026-05-27T18:33:00Z",
        ownerConfirmedAt: "2026-05-05T12:00:00Z",
        secretScanStatus: "clean",
        evidence: {
          ticket: "SEC-2050",
          runbook: "app-installation-rotation",
          attestationHash: "sha256:f6736f15d5c9f7582847783b0137cb1ee2f455fa49bf013c81a6f7299f2d2bd5"
        }
      },
      {
        id: "artifact-signer",
        type: "cloud-artifact-writer",
        owner: "release-engineering",
        environments: ["release"],
        scopes: ["packages:read", "packages:write", "deployments:write"],
        allowedRefs: ["refs/tags/v*"],
        lastRotatedAt: "2026-05-09T08:15:00Z",
        expiresAt: "2026-06-28T00:00:00Z",
        lastUsedAt: "2026-05-30T08:12:00Z",
        ownerConfirmedAt: "2026-05-31T08:00:00Z",
        secretScanStatus: "clean",
        evidence: {
          ticket: "SEC-2119",
          runbook: "artifact-signer-rotation",
          attestationHash: "sha256:29730c7d531d2c0c981cf06984163b2f6f01835a09c47ec97f67d80b4ad82c26"
        }
      }
    ]
  }
];
