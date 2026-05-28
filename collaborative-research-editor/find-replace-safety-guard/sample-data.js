const riskyDocument = {
  id: "collab-doc-12-find-replace",
  sections: [
    {
      id: "methods",
      locked: false,
      freeze: "draft",
      blocks: [
        {
          id: "methods-p1",
          type: "paragraph",
          content: "The alpha assay was selected for the pilot manuscript because alpha response is reproducible.",
        },
        {
          id: "methods-eq1",
          type: "latex",
          content: "\\alpha = 0.05; \\frac{signal_{alpha}}{baseline}",
        },
        {
          id: "methods-code1",
          type: "notebook",
          content: "model <- lm(response ~ alpha + baseline, data = notebook_frame)",
        },
      ],
    },
    {
      id: "references",
      locked: false,
      freeze: "draft",
      blocks: [
        {
          id: "ref-key",
          type: "citation",
          key: "@alpha2024",
          content: "Alpha response benchmark, DOI 10.0000/example.",
        },
      ],
    },
    {
      id: "final-figures",
      locked: true,
      freeze: "final-review",
      blocks: [
        {
          id: "fig1-caption",
          type: "cross-reference",
          anchor: "fig:alpha-response",
          caption: "Figure 1. Alpha response across cohorts.",
        },
      ],
    },
  ],
  comments: [
    {
      id: "cmt-17",
      blockId: "methods-p1",
      quote: "alpha response is reproducible",
    },
  ],
};

const safeDocument = {
  id: "collab-doc-12-safe-preview",
  sections: [
    {
      id: "intro",
      locked: false,
      freeze: "draft",
      blocks: [
        {
          id: "intro-p1",
          type: "paragraph",
          content: "This pilot manuscript uses an exploratory workflow for reader feedback.",
        },
      ],
    },
  ],
  comments: [],
};

const riskyOperation = {
  find: "alpha",
  replace: "omega",
  mode: "wysiwyg",
  wholeWord: false,
  scopeSections: ["methods", "references", "final-figures"],
};

const safeOperation = {
  find: "pilot",
  replace: "feasibility",
  mode: "wysiwyg",
  wholeWord: true,
  scopeSections: ["intro"],
};

module.exports = {
  riskyDocument,
  safeDocument,
  riskyOperation,
  safeOperation,
};
