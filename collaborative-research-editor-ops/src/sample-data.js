export const sampleDocument = {
  id: "doc-organoid-manuscript",
  title: "CRISPR perturbation response in patient-derived organoids",
  revision: 4,
  blocks: [
    {
      id: "b-intro",
      type: "markdown",
      section: "introduction",
      content: "Organoid models preserve disease heterogeneity and require reproducible perturbation workflows.",
      references: ["cite-organoid-2025"]
    },
    {
      id: "b-equation",
      type: "latex",
      section: "methods",
      content: "R_i = \\frac{v_i - \\mu_c}{\\sigma_c}",
      label: "eq:response-index"
    },
    {
      id: "b-notebook",
      type: "notebook",
      section: "analysis",
      language: "python",
      kernel: "python3",
      source: "ranked = response_index(counts, metadata)",
      outputs: [{ type: "table", label: "Top biomarkers", rows: 10 }],
      annotations: [{ author: "reviewer-a", text: "Confirm seed before final run." }]
    },
    {
      id: "b-figure",
      type: "figure",
      section: "results",
      content: "Figure 2. Biomarker response heatmap.",
      label: "fig:response-heatmap"
    }
  ],
  locks: [{ section: "results", owner: "lead-author", reason: "Final figure review" }],
  comments: [
    {
      id: "c-1",
      blockId: "b-notebook",
      status: "open",
      participants: ["reviewer-a", "analyst"],
      messages: [{ at: "2026-05-01T10:00:00Z", author: "reviewer-a", text: "Please expose the random seed." }]
    }
  ],
  suggestions: [
    {
      id: "s-1",
      blockId: "b-intro",
      author: "editor",
      replacement: "Organoid models preserve disease heterogeneity and benefit from reproducible perturbation workflows.",
      status: "open"
    }
  ],
  tasks: [
    {
      id: "t-1",
      blockId: "b-notebook",
      assignee: "analyst",
      due: "2026-05-20",
      status: "todo",
      title: "Pin notebook seed and rerun validation"
    }
  ],
  versions: []
};

export const samplePresence = [
  { userId: "lead-author", name: "Lead Author", blockId: "b-intro", selection: [0, 24], status: "editing" },
  { userId: "reviewer-a", name: "Reviewer A", blockId: "b-notebook", selection: [12, 32], status: "commenting" },
  { userId: "analyst", name: "Data Analyst", blockId: "b-equation", selection: [0, 0], status: "idle" }
];

export const sampleOperations = [
  {
    id: "op-1",
    type: "update-block",
    actor: "lead-author",
    blockId: "b-intro",
    content: "Organoid models preserve disease heterogeneity and require reproducible, collaborative perturbation workflows."
  },
  {
    id: "op-2",
    type: "insert-block",
    actor: "analyst",
    afterBlockId: "b-notebook",
    block: {
      id: "b-code-qc",
      type: "code",
      section: "analysis",
      language: "python",
      content: "assert ranked.seed == 1042"
    }
  }
];
