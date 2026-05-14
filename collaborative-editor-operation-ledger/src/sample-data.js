export const initialDocument = {
  id: "heat-manuscript",
  title: "Urban Heat Exposure Manuscript",
  blocks: [
    {
      id: "intro",
      kind: "markdown",
      label: "Introduction",
      content: "Urban heat exposure increases emergency demand.",
      metadata: { crossReferences: ["fig:heat-map"] }
    },
    {
      id: "equation-1",
      kind: "latex",
      label: "Risk Equation",
      content: "risk = exposure + vulnerability",
      metadata: { renderer: "katex" }
    },
    {
      id: "notebook-1",
      kind: "jupyter",
      label: "Model Notebook",
      content: "print(model_auc)",
      metadata: { language: "python", kernel: "python3", outputType: "table" }
    }
  ]
};

export const operations = [
  {
    type: "presence",
    actorId: "ada",
    blockId: "intro",
    cursor: 12,
    status: "editing"
  },
  {
    type: "insert_text",
    actorId: "ada",
    blockId: "intro",
    offset: 11,
    text: "and humidity "
  },
  {
    type: "set_block_metadata",
    actorId: "lin",
    blockId: "notebook-1",
    metadata: { executionStatus: "reviewed", lastKernel: "python3.12" }
  },
  {
    type: "lock_block",
    actorId: "mir",
    blockId: "equation-1",
    reason: "final figure-ready equation"
  }
];
