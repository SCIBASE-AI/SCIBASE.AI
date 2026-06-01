const cleanPacket = {
  manuscriptId: "peer-review-disclosure-001",
  title: "AI-assisted polymer screening",
  fundingStatement: {
    funders: ["National Science Fund", "Open Materials Institute"],
    grantIds: ["NSF-2244", "OMI-18"],
    sponsorRole: "Funders had no role in study design, analysis, manuscript preparation, or publication decision.",
  },
  competingInterests: [
    { authorId: "a1", statement: "No competing interests declared." },
    { authorId: "a2", statement: "No competing interests declared." },
    { authorId: "a3", statement: "Consulting fees from NanoCatalyst Inc.; unrelated to this work." },
  ],
  acknowledgements: ["NanoCatalyst Inc. provided access to a public benchmark dataset."],
  authors: [
    {
      id: "a1",
      name: "Ari Chen",
      corresponding: true,
      contributions: ["Conceptualization", "Methodology", "Writing - original draft"],
      affiliations: ["Open Materials Institute"],
      industryRelationships: [],
    },
    {
      id: "a2",
      name: "Bea Singh",
      corresponding: false,
      contributions: ["Software", "Validation", "Formal analysis"],
      affiliations: ["State University"],
      industryRelationships: [],
    },
    {
      id: "a3",
      name: "Cam Reed",
      corresponding: false,
      contributions: ["Data curation", "Writing - review and editing"],
      affiliations: ["State University"],
      industryRelationships: ["NanoCatalyst Inc."],
    },
  ],
};

const riskyPacket = {
  manuscriptId: "peer-review-disclosure-002",
  title: "Closed-loop catalyst ranking",
  fundingStatement: {
    funders: ["NanoCatalyst Inc."],
    grantIds: [],
    sponsorRole: "",
  },
  competingInterests: [
    { authorId: "a1", statement: "No competing interests declared." },
    { authorId: "a2", statement: "" },
  ],
  acknowledgements: [
    "NanoCatalyst Inc. supplied proprietary screening data and reviewed the manuscript.",
    "Dana Fox helped prepare the final figures.",
  ],
  authors: [
    {
      id: "a1",
      name: "Ari Chen",
      corresponding: false,
      contributions: ["Conceptualization"],
      affiliations: ["Open Materials Institute"],
      industryRelationships: ["NanoCatalyst Inc."],
    },
    {
      id: "a2",
      name: "Bea Singh",
      corresponding: false,
      contributions: [],
      affiliations: ["State University"],
      industryRelationships: [],
    },
  ],
};

module.exports = {
  cleanPacket,
  riskyPacket,
};
