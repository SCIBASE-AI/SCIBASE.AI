const readyPacket = {
  reviewDate: "2026-05-22",
  project: {
    id: "SCI-PID-READY-17",
    title: "Open Catalyst Reaction Archive",
    releaseStage: "public",
    artifacts: [
      {
        id: "DATA-READY-1",
        label: "Catalyst measurements v2",
        state: "active",
        pid: {
          doi: "10.5678/scibase.catalyst.v2",
          uuid: "80dbbd0f-b85a-4e0e-ae49-84d7219278b1",
        },
        landingPage: {
          url: "https://scibase.ai/artifacts/catalyst-v2",
          status: 200,
          allowsIndexing: true,
        },
        resolverEvidence: {
          checkedAt: "2026-05-20",
          httpStatus: 303,
          canonicalUrl: "https://scibase.ai/artifacts/catalyst-v2",
          redirectsStable: true,
        },
        metadata: {
          datacite: {
            identifier: "10.5678/scibase.catalyst.v2",
            creators: ["SCIBASE Synthetic Chemistry Group"],
            titles: ["Catalyst measurements v2"],
            publisher: "SCIBASE.AI",
            publicationYear: 2026,
            version: "2.0.0",
            types: { resourceTypeGeneral: "Dataset" },
            relatedIdentifiers: [{ relationType: "IsNewVersionOf", relatedIdentifier: "10.5678/scibase.catalyst.v1" }],
          },
          schemaOrg: {
            "@type": "Dataset",
            identifier: "10.5678/scibase.catalyst.v2",
            name: "Catalyst measurements v2",
            url: "https://scibase.ai/artifacts/catalyst-v2",
            license: "https://creativecommons.org/licenses/by/4.0/",
          },
        },
        access: {
          policy: "open",
        },
        versioning: {
          version: "2.0.0",
          previousIdentifier: "10.5678/scibase.catalyst.v1",
        },
        license: "CC-BY-4.0",
      },
      {
        id: "DATA-READY-0",
        label: "Catalyst measurements v1",
        state: "superseded",
        pid: {
          doi: "10.5678/scibase.catalyst.v1",
        },
        landingPage: {
          url: "https://scibase.ai/artifacts/catalyst-v1",
          status: 200,
          allowsIndexing: true,
        },
        resolverEvidence: {
          checkedAt: "2026-05-20",
          httpStatus: 303,
          canonicalUrl: "https://scibase.ai/artifacts/catalyst-v1",
        },
        metadata: {
          datacite: {
            identifier: "10.5678/scibase.catalyst.v1",
            creators: ["SCIBASE Synthetic Chemistry Group"],
            titles: ["Catalyst measurements v1"],
            publisher: "SCIBASE.AI",
            publicationYear: 2025,
            version: "1.0.0",
            types: { resourceTypeGeneral: "Dataset" },
          },
          schemaOrg: {
            "@type": "Dataset",
            identifier: "10.5678/scibase.catalyst.v1",
            name: "Catalyst measurements v1",
            url: "https://scibase.ai/artifacts/catalyst-v1",
            license: "https://creativecommons.org/licenses/by/4.0/",
          },
        },
        access: {
          policy: "open",
        },
        tombstone: {
          url: "https://scibase.ai/artifacts/catalyst-v1/tombstone",
          reason: "Superseded by corrected calibration release.",
          redirectsTo: "10.5678/scibase.catalyst.v2",
        },
        license: "CC-BY-4.0",
      },
    ],
  },
};

const reviewPacket = {
  reviewDate: "2026-05-22",
  project: {
    id: "SCI-PID-REVIEW-22",
    title: "Restricted Neuroimaging Feature Extracts",
    releaseStage: "public",
    artifacts: [
      {
        id: "DATA-REVIEW-1",
        label: "Controlled feature matrix",
        state: "active",
        pid: {
          doi: "10.5678/scibase.neuro.features.v1",
        },
        landingPage: {
          url: "https://scibase.ai/artifacts/neuro-features-v1",
          status: 200,
          allowsIndexing: false,
        },
        resolverEvidence: {
          checkedAt: "2026-04-01",
          httpStatus: 303,
          canonicalUrl: "https://scibase.ai/artifacts/neuro-features-v1",
        },
        metadata: {
          datacite: {
            identifier: "10.5678/scibase.neuro.features.v1",
            creators: ["SCIBASE Synthetic Neuro Lab"],
            titles: ["Restricted neuroimaging feature matrix"],
            publisher: "SCIBASE.AI",
            publicationYear: 2026,
            version: "1.0.0",
            types: { resourceTypeGeneral: "Dataset" },
          },
          schemaOrg: {
            "@type": "Dataset",
            identifier: "10.5678/scibase.neuro.features.v1",
            name: "Restricted neuroimaging feature matrix",
            url: "https://scibase.ai/artifacts/neuro-features-v1",
            license: "https://example.org/data-use-agreement",
          },
        },
        access: {
          policy: "restricted",
          termsUrl: "https://scibase.ai/policies/controlled-access",
          contact: "data-access@scibase.ai",
        },
        license: "DUA-required",
      },
    ],
  },
};

const holdPacket = {
  reviewDate: "2026-05-22",
  project: {
    id: "SCI-PID-HOLD-09",
    title: "Microscopy Cell Morphology Bundle",
    releaseStage: "public",
    artifacts: [
      {
        id: "DATA-HOLD-1",
        label: "Cell morphology image bundle",
        state: "active",
        pid: {
          doi: "10.5678/scibase.cell.bundle",
        },
        landingPage: {
          url: "https://scibase.ai/artifacts/cell-bundle",
          status: 404,
          allowsIndexing: true,
        },
        resolverEvidence: {
          checkedAt: "2026-05-20",
          httpStatus: 500,
          canonicalUrl: "https://scibase.ai/artifacts/old-cell-bundle",
        },
        metadata: {
          datacite: {
            identifier: "10.5678/scibase.cell.bundle",
            creators: [],
            titles: ["Cell morphology image bundle"],
            publisher: "",
            publicationYear: 2026,
            types: {},
          },
          schemaOrg: {
            "@type": "Dataset",
            identifier: "10.5678/scibase.cell.bundle",
            name: "Cell morphology image bundle",
          },
        },
        access: {
          policy: "restricted",
          directDownloadUrl: "https://scibase.ai/downloads/cell-bundle.zip",
        },
        versioning: {
          version: "2.0.0",
          previousIdentifier: "10.5678/scibase.cell.bundle.v1",
        },
      },
      {
        id: "DATA-HOLD-2",
        label: "Duplicate active analysis scripts",
        state: "active",
        pid: {
          doi: "10.5678/scibase.cell.bundle",
        },
        metadata: {
          datacite: {},
          schemaOrg: {},
        },
        access: {
          policy: "open",
        },
      },
      {
        id: "DATA-HOLD-0",
        label: "Withdrawn raw upload",
        state: "withdrawn",
        pid: {
          doi: "10.5678/scibase.cell.raw",
        },
        landingPage: {
          url: "https://scibase.ai/artifacts/cell-raw",
          status: 200,
        },
        resolverEvidence: {
          checkedAt: "2026-05-20",
          httpStatus: 303,
          canonicalUrl: "https://scibase.ai/artifacts/cell-raw",
        },
        metadata: {
          datacite: {
            identifier: "10.5678/scibase.cell.raw",
            creators: ["SCIBASE Synthetic Imaging Group"],
            titles: ["Withdrawn raw cell upload"],
            publisher: "SCIBASE.AI",
            publicationYear: 2026,
            types: { resourceTypeGeneral: "Dataset" },
          },
          schemaOrg: {
            "@type": "Dataset",
            identifier: "10.5678/scibase.cell.raw",
            name: "Withdrawn raw cell upload",
            url: "https://scibase.ai/artifacts/cell-raw",
            license: "https://creativecommons.org/licenses/by/4.0/",
          },
        },
        access: {
          policy: "open",
        },
        tombstone: {
          url: "",
          reason: "",
        },
        license: "CC-BY-4.0",
      },
    ],
  },
};

module.exports = {
  holdPacket,
  readyPacket,
  reviewPacket,
};
