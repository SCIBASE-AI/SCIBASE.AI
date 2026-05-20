const policy = {
  asOf: "2026-05-20T12:00:00.000Z",
  webhookSecret: "synthetic-review-secret",
  controlledDataClasses: ["PHI", "PII", "GENOMIC", "PRIVATE_CLINICAL"],
  deidentificationRequiredFor: ["PHI", "PII", "GENOMIC", "PRIVATE_CLINICAL"],
  allowedExportTargets: ["institutional_repository", "journal_submission", "funder_portal", "internal_dashboard"],
  allowedJurisdictions: ["US", "EU", "UK", "CA"],
  defaultRetentionDays: 1825,
  retentionDaysByClass: {
    PHI: 2555,
    PII: 1825,
    GENOMIC: 3650,
    PUBLIC: 7300,
  },
  warningWindows: {
    irbExpiryDays: 45,
  },
}

const projects = [
  {
    id: "SCI-HEART-042",
    title: "Remote cardiac recovery cohort",
    humanSubjects: true,
    irb: {
      id: "IRB-2026-118",
      status: "approved",
      expiresAt: "2026-12-01T00:00:00.000Z",
    },
    participants: {
      count: 240,
      minors: false,
    },
    consent: {
      scopes: ["analysis", "publication", "funder_reporting"],
      guardianConsent: false,
    },
    dataUseAgreement: {
      active: true,
      id: "DUA-HEART-2026",
    },
    datasets: [
      {
        id: "heart-vitals",
        dataClasses: ["PHI"],
        purposes: ["analysis", "publication"],
        deidentified: true,
        collectedAt: "2026-01-04T00:00:00.000Z",
      },
    ],
    exportTargets: [
      {
        name: "Zenodo release",
        type: "institutional_repository",
        jurisdiction: "EU",
        requiresAnonymizedData: true,
      },
    ],
    owners: {
      irbAdmin: "irb-office@example.edu",
      consentOfficer: "consent-review@example.edu",
      dataSteward: "data-steward@example.edu",
    },
  },
  {
    id: "SCI-YOUTH-091",
    title: "Youth sleep and learning intervention",
    humanSubjects: true,
    irb: {
      id: "IRB-2025-221",
      status: "expired",
      expiresAt: "2026-03-10T00:00:00.000Z",
    },
    participants: {
      count: 88,
      minors: true,
    },
    consent: {
      scopes: ["analysis"],
      guardianConsent: false,
    },
    dataUseAgreement: {
      active: false,
      id: null,
    },
    datasets: [
      {
        id: "student-surveys",
        dataClasses: ["PII"],
        purposes: ["analysis", "publication"],
        deidentified: false,
        collectedAt: "2025-09-01T00:00:00.000Z",
      },
    ],
    exportTargets: [
      {
        name: "Journal package",
        type: "journal_submission",
        jurisdiction: "US",
        requiresAnonymizedData: true,
      },
    ],
    owners: {
      irbAdmin: "irb-office@example.edu",
      consentOfficer: "consent-review@example.edu",
      dataSteward: "data-steward@example.edu",
    },
  },
  {
    id: "SCI-GENOME-204",
    title: "Cross-border genomic phenotype atlas",
    humanSubjects: true,
    irb: {
      id: "IRB-2026-044",
      status: "approved",
      expiresAt: "2026-06-15T00:00:00.000Z",
    },
    participants: {
      count: 510,
      minors: false,
    },
    consent: {
      scopes: ["analysis", "publication"],
      guardianConsent: false,
    },
    dataUseAgreement: {
      active: true,
      id: "DUA-GENOME-2026",
    },
    datasets: [
      {
        id: "genotype-table",
        dataClasses: ["GENOMIC"],
        purposes: ["analysis", "external_ai_training"],
        deidentified: true,
        collectedAt: "2023-04-12T00:00:00.000Z",
      },
    ],
    exportTargets: [
      {
        name: "Partner analytics platform",
        type: "external_ai_platform",
        jurisdiction: "SG",
        requiresAnonymizedData: true,
      },
    ],
    owners: {
      irbAdmin: "irb-office@example.edu",
      consentOfficer: "consent-review@example.edu",
      dataSteward: "data-steward@example.edu",
    },
  },
  {
    id: "SCI-MATERIALS-018",
    title: "Open polymer degradation benchmark",
    humanSubjects: false,
    irb: null,
    participants: {
      count: 0,
      minors: false,
    },
    consent: {
      scopes: [],
      guardianConsent: false,
    },
    dataUseAgreement: {
      active: false,
      id: null,
    },
    datasets: [
      {
        id: "polymer-open-table",
        dataClasses: ["PUBLIC"],
        purposes: ["publication"],
        deidentified: true,
        collectedAt: "2024-02-20T00:00:00.000Z",
      },
    ],
    exportTargets: [
      {
        name: "Public repository",
        type: "institutional_repository",
        jurisdiction: "US",
        requiresAnonymizedData: false,
      },
    ],
    owners: {
      irbAdmin: "irb-office@example.edu",
      consentOfficer: "consent-review@example.edu",
      dataSteward: "data-steward@example.edu",
    },
  },
]

module.exports = { policy, projects }
