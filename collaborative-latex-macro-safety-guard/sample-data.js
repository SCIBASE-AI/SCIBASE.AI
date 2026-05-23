const safePacket = {
  packetId: "packet-safe-methods-v4",
  documentId: "shared-manuscript/neuro-methods",
  namedVersion: "Manuscript v4 Methods",
  sectionId: "methods-statistical-model",
  collaborators: ["orcid:0000-0002-1825-0097", "orcid:0000-0003-1555-4212"],
  trustedRenderMode: false,
  macros: [
    {
      name: "\\mean",
      body: "\\operatorname{mean}",
      author: "orcid:0000-0002-1825-0097",
      scope: "section",
      approved: true,
    },
    {
      name: "\\ci",
      body: "\\mathrm{CI}",
      author: "orcid:0000-0003-1555-4212",
      scope: "document",
      approved: true,
    },
  ],
  blocks: [
    {
      blockId: "eq-primary-outcome",
      type: "latex",
      text: "The primary endpoint is $\\mean(X) \\pm 95\\%\\ \\ci$.",
      locked: false,
    },
    {
      blockId: "md-summary",
      type: "markdown",
      text: "The same model is rendered in the methods preview.",
      locked: false,
    },
  ],
};

const blockedPacket = {
  packetId: "packet-unsafe-results-v8",
  documentId: "shared-manuscript/results-live",
  namedVersion: "Final Submission",
  sectionId: "results-figures",
  collaborators: ["orcid:0000-0001-1111-2222", "orcid:0000-0001-3333-4444"],
  trustedRenderMode: false,
  macros: [
    {
      name: "\\dataset",
      body: "\\href{https://private.example.invalid/raw.csv}{dataset}",
      author: "orcid:0000-0001-1111-2222",
      scope: "document",
      approved: false,
    },
    {
      name: "\\loopA",
      body: "\\loopB",
      author: "orcid:0000-0001-3333-4444",
      scope: "section",
      approved: true,
    },
    {
      name: "\\loopB",
      body: "\\loopA",
      author: "orcid:0000-0001-3333-4444",
      scope: "section",
      approved: true,
    },
    {
      name: "\\hazard",
      body: "\\htmlClass{warning}{hazard}",
      author: "orcid:0000-0001-1111-2222",
      scope: "section",
      approved: true,
    },
    {
      name: "\\hazard",
      body: "\\textbf{hazard}",
      author: "orcid:0000-0001-3333-4444",
      scope: "section",
      approved: true,
    },
  ],
  blocks: [
    {
      blockId: "eq-hazard-model",
      type: "latex",
      text: "$\\hazard = \\loopA + \\dataset$",
      locked: true,
    },
    {
      blockId: "figure-caption",
      type: "markdown",
      text: "![private cohort](https://private.example.invalid/figure.png)",
      locked: true,
    },
    {
      blockId: "unsafe-inline-html",
      type: "markdown",
      text: "<iframe src=\"https://private.example.invalid/embed\"></iframe>",
      locked: false,
    },
  ],
};

const reviewPacket = {
  packetId: "packet-trusted-supplement-v2",
  documentId: "shared-manuscript/supplement",
  namedVersion: "Supplement Draft",
  sectionId: "appendix-derivations",
  collaborators: ["orcid:0000-0002-9999-7777"],
  trustedRenderMode: true,
  macros: [
    {
      name: "\\annotate",
      body: "\\htmlId{derivation-note}{note}",
      author: "orcid:0000-0002-9999-7777",
      scope: "section",
      approved: true,
      trustJustification: "Maintainer-approved KaTeX trust macro for internal appendix anchor.",
    },
  ],
  blocks: [
    {
      blockId: "appendix-equation",
      type: "latex",
      text: "$\\annotate = \\sum_i x_i$",
      locked: false,
    },
  ],
};

module.exports = {
  samplePackets: [safePacket, blockedPacket, reviewPacket],
};
