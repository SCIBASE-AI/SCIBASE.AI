const cleanPacket = {
  institutionId: "northstar-research-office",
  reviewDate: "2026-06-01",
  maxValidationAgeDays: 90,
  requiredExportFormats: ["JATS", "DOCX", "LaTeX"],
  approvedPlugins: [
    {
      id: "journal-style-pack",
      allowedVersions: ["3.4.2", "3.4.3"],
      owner: "enterprise-publication-ops"
    }
  ],
  stylePackages: [
    {
      id: "cell-reports-2026-style",
      pluginId: "journal-style-pack",
      pluginVersion: "3.4.3",
      target: {
        name: "Cell Reports",
        citationStyle: "vancouver"
      },
      formats: ["JATS", "DOCX", "LaTeX"],
      citationStyle: "vancouver",
      lastValidatedAt: "2026-05-20",
      reviewerSignoff: {
        reviewer: "pubops-style-reviewer",
        status: "approved"
      },
      templates: [
        {
          path: "templates/cell-reports/article.jats.xml",
          expectedChecksum: "sha256:6bd2f4c0c2a6",
          actualChecksum: "sha256:6bd2f4c0c2a6"
        },
        {
          path: "templates/cell-reports/manuscript.docx",
          expectedChecksum: "sha256:a9f28f1de342",
          actualChecksum: "sha256:a9f28f1de342"
        }
      ],
      metadataPreservation: {
        doi: true,
        orcid: true,
        versionHistory: true,
        license: true,
        funderAward: true
      },
      generatedOutputs: [
        {
          path: "exports/cell-reports/article.xml",
          builtFromTemplateChecksum: "sha256:6bd2f4c0c2a6",
          provenanceDigest: "sha256:output-9122"
        },
        {
          path: "exports/cell-reports/manuscript.docx",
          builtFromTemplateChecksum: "sha256:a9f28f1de342",
          provenanceDigest: "sha256:output-8227"
        }
      ],
      previewFields: [
        {
          name: "publicTitle",
          exported: true,
          private: false
        }
      ]
    }
  ]
};

const riskyPacket = {
  institutionId: "northstar-research-office",
  reviewDate: "2026-06-01",
  maxValidationAgeDays: 90,
  requiredExportFormats: ["JATS", "DOCX", "LaTeX"],
  approvedPlugins: [
    {
      id: "journal-style-pack",
      allowedVersions: ["3.4.2"],
      owner: "enterprise-publication-ops"
    }
  ],
  stylePackages: [
    {
      id: "horizon-eu-repository-style",
      pluginId: "journal-style-pack",
      pluginVersion: "3.5.0",
      target: {
        name: "Horizon EU grant portal",
        citationStyle: "apa"
      },
      formats: ["DOCX"],
      citationStyle: "vancouver",
      lastValidatedAt: "2025-12-10",
      reviewerSignoff: {
        reviewer: "",
        status: "draft"
      },
      templates: [
        {
          path: "templates/horizon/report.docx",
          expectedChecksum: "sha256:approved-4411",
          actualChecksum: "sha256:local-drift-7719"
        },
        {
          path: "templates/horizon/article.jats.xml",
          expectedChecksum: "",
          actualChecksum: "sha256:missing-expected"
        }
      ],
      metadataPreservation: {
        doi: true,
        orcid: false,
        versionHistory: false,
        license: true,
        funderAward: false
      },
      generatedOutputs: [
        {
          path: "exports/horizon/report.docx",
          builtFromTemplateChecksum: "",
          provenanceDigest: ""
        }
      ],
      previewFields: [
        {
          name: "internalReviewerNotes",
          exported: true,
          private: true
        }
      ]
    },
    {
      id: "unapproved-preprint-style",
      pluginId: "community-style-snapshot",
      pluginVersion: "latest",
      target: {
        name: "bioRxiv",
        citationStyle: "vancouver"
      },
      formats: ["JATS", "DOCX"],
      citationStyle: "vancouver",
      lastValidatedAt: null,
      reviewerSignoff: null,
      templates: [],
      metadataPreservation: {
        doi: false,
        orcid: false,
        versionHistory: false,
        license: false,
        funderAward: false
      },
      generatedOutputs: []
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
