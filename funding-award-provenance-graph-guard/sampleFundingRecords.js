"use strict";

const sampleFundingRecords = {
  checkedAt: "2026-05-31T12:55:00.000Z",
  policy: {
    outputGraceDays: 60,
  },
  aliasCatalog: [
    {
      id: "funder-nih",
      name: "National Institutes of Health",
      aliases: ["NIH", "U.S. NIH", "National Institute of Health"],
    },
    {
      id: "funder-eu-horizon",
      name: "Horizon Europe",
      aliases: ["EU Horizon", "European Union Horizon Programme", "HorizonEU"],
    },
    {
      id: "funder-jsps",
      name: "Japan Society for the Promotion of Science",
      aliases: ["JSPS", "KAKENHI"],
    },
  ],
  records: [
    {
      id: "funding-clean-nih",
      projectId: "project-neuro-graph",
      funderName: "NIH",
      canonicalFunderId: "funder-nih",
      awardId: "R01-NS-2048",
      awardStart: "2024-04-01",
      awardEnd: "2027-03-31",
      requiredAcknowledgement: "R01-NS-2048",
      acknowledgementText: "This work was supported by NIH award R01-NS-2048.",
      outputs: [
        { doi: "10.5555/neuro.graph.2026", projectId: "project-neuro-graph", publishedAt: "2026-02-14" },
      ],
      recommendationEdges: [
        { edgeId: "edge-clean-1", includesPrivateFunding: false, conflictOfInterest: false },
      ],
    },
    {
      id: "funding-coi-review",
      projectId: "project-ai-reuse",
      funderName: "HorizonEU",
      canonicalFunderId: "funder-eu-horizon",
      awardId: "HE-REUSE-8842",
      awardStart: "2025-01-01",
      awardEnd: "2026-12-31",
      requiredAcknowledgement: "HE-REUSE-8842",
      acknowledgementText: "Funded by Horizon Europe under HE-REUSE-8842.",
      outputs: [
        { doi: "10.5555/reuse.ai.2026", projectId: "project-ai-reuse", publishedAt: "2026-06-01" },
      ],
      recommendationEdges: [
        { edgeId: "edge-coi-1", includesPrivateFunding: false, conflictOfInterest: true, curatorReview: false },
      ],
    },
    {
      id: "funding-missing-award",
      projectId: "project-cell-line",
      funderName: "JSPS",
      canonicalFunderId: "funder-jsps",
      awardId: "",
      awardStart: "2025-04-01",
      awardEnd: "2028-03-31",
      requiredAcknowledgement: "KAKENHI",
      acknowledgementText: "Supported by a competitive research award.",
      outputs: [
        { doi: "10.5555/cell.line.2026", projectId: "project-cell-line", publishedAt: "2026-01-12" },
      ],
      recommendationEdges: [
        { edgeId: "edge-missing-1", includesPrivateFunding: false, conflictOfInterest: false },
      ],
    },
    {
      id: "funding-doi-mismatch",
      projectId: "project-climate-model",
      funderName: "National Institutes of Health",
      canonicalFunderId: "funder-nih",
      awardId: "R01-CLIMATE-12",
      awardStart: "2024-01-01",
      awardEnd: "2025-01-01",
      requiredAcknowledgement: "R01-CLIMATE-12",
      acknowledgementText: "Acknowledges NIH R01-CLIMATE-12 support.",
      outputs: [
        { doi: "10.5555/climate.model.2026", projectId: "project-other", publishedAt: "2026-04-15" },
      ],
      recommendationEdges: [
        { edgeId: "edge-doi-1", includesPrivateFunding: false, conflictOfInterest: false },
      ],
    },
    {
      id: "funding-private-path",
      projectId: "project-private-consortium",
      funderName: "Unlisted Consortium Fund",
      canonicalFunderId: "funder-private-consortium",
      awardId: "CONSORT-77",
      awardStart: "2025-03-01",
      awardEnd: "2027-03-01",
      requiredAcknowledgement: "CONSORT-77",
      acknowledgementText: "Consortium award CONSORT-77 supported this project.",
      outputs: [
        { doi: "10.5555/private.consort.2026", projectId: "project-private-consortium", publishedAt: "2026-05-20" },
      ],
      recommendationEdges: [
        { edgeId: "edge-private-1", includesPrivateFunding: true, redactedFundingPath: false, conflictOfInterest: false },
      ],
    },
  ],
};

module.exports = { sampleFundingRecords };
