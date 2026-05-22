const readyPacket = {
  reviewDate: "2026-05-22",
  graph: {
    id: "KG-FUNDER-READY-1",
    title: "Catalyst reuse knowledge graph",
    funders: [
      {
        id: "FUNDER-NSF",
        name: "National Science Foundation",
        uri: "https://ror.org/021nxhr62",
      },
    ],
    awards: [
      {
        id: "AWD-NSF-2048123",
        label: "NSF 2048123",
        funderId: "FUNDER-NSF",
        awardNumber: "NSF-2048123",
        uri: "https://www.nsf.gov/awardsearch/showAward?AWD_ID=2048123",
        startsAt: "2024-09-01",
        endsAt: "2027-08-31",
        active: true,
        mandates: ["open-access", "data-sharing", "funder-reporting"],
      },
    ],
    projects: [
      {
        id: "PROJ-CATALYST",
        title: "Catalyst reuse map",
        funded: true,
        awardIds: ["AWD-NSF-2048123"],
      },
    ],
    outputs: [
      {
        id: "OUT-CATALYST-DATA",
        title: "Catalyst reuse dataset",
        projectId: "PROJ-CATALYST",
        awardIds: ["AWD-NSF-2048123"],
        fundingStatementRequired: true,
        fundingText: "Supported by NSF-2048123.",
        openAccess: true,
        dataAvailability: "public",
        reportingExportReady: true,
      },
    ],
    recommendations: [
      {
        id: "REC-CATALYST-1",
        awardId: "AWD-NSF-2048123",
        reason: "funder-affinity",
        explanation: "Visible because the user follows NSF-funded catalyst datasets.",
        visible: true,
      },
    ],
  },
};

const reviewPacket = {
  reviewDate: "2026-05-22",
  graph: {
    id: "KG-FUNDER-REVIEW-2",
    title: "Neuroimaging method graph",
    funders: [
      {
        id: "FUNDER-NIH",
        name: "National Institutes of Health",
        uri: "https://ror.org/01cwqze88",
      },
    ],
    awards: [
      {
        id: "AWD-NIH-R01-777",
        label: "NIH R01NS777",
        funderId: "FUNDER-NIH",
        awardNumber: "R01-NS777",
        uri: "",
        startsAt: "2021-01-01",
        endsAt: "2025-01-01",
        active: true,
        mandates: ["data-sharing", "funder-reporting"],
      },
    ],
    projects: [
      {
        id: "PROJ-NEURO",
        title: "Neuroimaging method graph",
        funded: true,
        awardIds: ["AWD-NIH-R01-777"],
      },
    ],
    outputs: [
      {
        id: "OUT-NEURO-PAPER",
        title: "Neuroimaging method comparison",
        projectId: "PROJ-NEURO",
        awardIds: ["AWD-NIH-R01-777"],
        fundingStatementRequired: true,
        fundingText: "Supported by NIH R01-NS777.",
        openAccess: true,
        dataAvailability: "controlled",
        reportingExportReady: false,
      },
    ],
    recommendations: [
      {
        id: "REC-NEURO-1",
        awardId: "AWD-NIH-R01-777",
        reason: "funder-affinity",
        visible: true,
      },
    ],
  },
};

const holdPacket = {
  reviewDate: "2026-05-22",
  graph: {
    id: "KG-FUNDER-HOLD-3",
    title: "Genomics collaboration graph",
    funders: [
      {
        id: "FUNDER-DOE",
        name: "Department of Energy",
        uri: "https://ror.org/01bj3aw27",
      },
    ],
    awards: [
      {
        id: "AWD-DOE-1",
        label: "DOE Genomics A",
        funderId: "FUNDER-DOE",
        awardNumber: "DE-SC001",
        uri: "https://example.org/awards/de-sc001",
        startsAt: "2022-01-01",
        endsAt: "2024-01-01",
        active: false,
        mandates: ["open-access", "data-sharing"],
      },
      {
        id: "AWD-DOE-2",
        label: "DOE Genomics duplicate",
        funderId: "FUNDER-DOE",
        awardNumber: "DE SC001",
        uri: "https://example.org/awards/de-sc001-duplicate",
        startsAt: "2022-01-01",
        endsAt: "2024-01-01",
        active: false,
        mandates: ["open-access"],
      },
      {
        id: "AWD-MISSING-FUNDER",
        label: "Unlinked private award",
        funderId: "FUNDER-MISSING",
        awardNumber: "",
        active: true,
        mandates: [],
      },
    ],
    projects: [
      {
        id: "PROJ-GENOMICS",
        title: "Genomics collaboration map",
        funded: true,
        awardIds: ["AWD-MISSING"],
      },
      {
        id: "PROJ-UNLINKED",
        title: "Funded but unlinked project",
        funded: true,
        awardIds: [],
      },
    ],
    outputs: [
      {
        id: "OUT-GENOMICS-DATA",
        title: "Genomics collaboration dataset",
        projectId: "PROJ-GENOMICS",
        awardIds: ["AWD-DOE-1"],
        fundingStatementRequired: true,
        fundingText: "Supported by a DOE award.",
        openAccess: false,
        dataAvailability: "restricted",
        reportingExportReady: false,
      },
      {
        id: "OUT-ORPHAN",
        title: "Orphan output",
        projectId: "PROJ-MISSING",
        awardIds: ["AWD-MISSING"],
        fundingStatementRequired: true,
        fundingText: "",
        openAccess: true,
        dataAvailability: "public",
        reportingExportReady: true,
      },
    ],
    recommendations: [
      {
        id: "REC-BAD-1",
        awardId: "AWD-DOE-1",
        reason: "funder-affinity",
        explanation: "Based on inactive historical award.",
        visible: true,
      },
      {
        id: "REC-BAD-2",
        awardId: "AWD-DOES-NOT-EXIST",
        reason: "funder-affinity",
        visible: true,
      },
    ],
  },
};

module.exports = {
  holdPacket,
  readyPacket,
  reviewPacket,
};
