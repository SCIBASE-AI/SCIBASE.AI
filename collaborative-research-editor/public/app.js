let state;

async function refresh() {
  const response = await fetch("/api/document");
  state = await response.json();
  render();
}

async function applyOperation(operation) {
  const response = await fetch("/api/operation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(operation),
  });
  const data = await response.json();
  state.document = data.document;
  state.manifest = data.manifest;
  state.outline = data.document.blocks.map((block, index) => ({
    index,
    id: block.id,
    type: block.type,
    preview: block.content.replace(/\s+/g, " ").slice(0, 120),
  }));
  render();
}

function render() {
  const { document, outline, manifest } = state;
  window.document.getElementById("title").textContent = document.title;
  window.document.getElementById("presence").innerHTML = Object.values(document.presence)
    .map((user) => `<span class="avatar" title="${user.name}">${user.name.slice(0, 2)}</span>`)
    .join("");
  window.document.getElementById("blocks").innerHTML = document.blocks
    .map(
      (block) => `
        <article class="block">
          <p class="block-type">${block.type}</p>
          <code>${escapeHtml(block.content)}</code>
        </article>
      `,
    )
    .join("");
  window.document.getElementById("outline").innerHTML = outline
    .map((item) => `<li><strong>${item.type}</strong>: ${escapeHtml(item.preview)}</li>`)
    .join("");
  window.document.getElementById("manifest").innerHTML = Object.entries(manifest)
    .map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`)
    .join("");
}

function firstBlockId() {
  return state.document.blocks[0].id;
}

function notebookBlockId() {
  return state.document.blocks.find((block) => block.type === "notebook-cell").id;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

window.document.getElementById("add-comment").addEventListener("click", () => {
  applyOperation({
    type: "comment",
    blockId: firstBlockId(),
    author: "Reviewer",
    body: "Clarify study inclusion criteria and confidence interval reporting.",
  });
});

window.document.getElementById("add-suggestion").addEventListener("click", () => {
  applyOperation({
    type: "suggestion",
    blockId: firstBlockId(),
    author: "Editor",
    replacement: "# Abstract\n\nThis study compares delivery strategies across recent CRISPR literature.",
    reason: "Tighter abstract statement before journal export.",
  });
});

window.document.getElementById("lock-abstract").addEventListener("click", () => {
  applyOperation({
    type: "lock-section",
    blockId: firstBlockId(),
    author: "Ada Lovelace",
    reason: "Final abstract approved for submission package.",
  });
});

window.document.getElementById("save-version").addEventListener("click", () => {
  applyOperation({
    type: "save-version",
    label: "Internal review snapshot",
    author: "Ada Lovelace",
  });
});

refresh().then(() =>
  applyOperation({
    type: "presence",
    userId: "ada",
    name: "Ada Lovelace",
    blockId: notebookBlockId(),
    cursor: 12,
  }),
);
