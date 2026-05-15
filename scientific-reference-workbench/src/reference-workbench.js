const crypto = require("node:crypto");

function buildReferenceWorkbench(manuscript) {
  const validation = validateManuscript(manuscript);
  const labels = collectLabels(manuscript.sections || []);
  const citations = collectCitations(manuscript.sections || [], manuscript.bibliography || []);
  const crossReferences = collectCrossReferences(manuscript.sections || [], labels);
  const numbering = buildNumbering(labels, citations);
  const formattedBlocks = formatBlocks(manuscript.sections || [], numbering);
  const styleChecklist = buildStyleChecklist(manuscript, citations, crossReferences, labels);
  const tasks = buildFormattingTasks(citations, crossReferences, labels, styleChecklist);
  const outline = buildPublicationOutline(manuscript, numbering, styleChecklist);

  const report = {
    manuscriptId: manuscript.manuscriptId,
    title: manuscript.title,
    style: manuscript.style || {},
    validation,
    numbering,
    citations,
    crossReferences,
    styleChecklist,
    tasks,
    formattedBlocks,
    outline,
    dashboard: {
      status: tasks.length === 0 ? "ready-to-export" : "format-review-needed",
      taskCount: tasks.length,
      missingCitationCount: citations.missing.length,
      missingCrossReferenceCount: crossReferences.missing.length,
      duplicateLabelCount: labels.duplicates.length,
      topAction: tasks[0] ? tasks[0].message : "Export formatted manuscript packet."
    }
  };

  report.digest = stableDigest(report);
  return report;
}

function validateManuscript(manuscript) {
  const required = [
    ["manuscriptId", manuscript.manuscriptId],
    ["title", manuscript.title],
    ["sections", (manuscript.sections || []).length],
    ["bibliography", (manuscript.bibliography || []).length]
  ];
  const missing = required.filter(([, value]) => !value).map(([field]) => field);
  const malformedBlocks = (manuscript.sections || []).flatMap((section) =>
    (section.blocks || []).filter((block) => !block.id || !block.type).map((block) => ({
      sectionId: section.id,
      blockId: block.id || "unknown"
    }))
  );

  return {
    status: missing.length === 0 && malformedBlocks.length === 0 ? "passed" : "incomplete",
    score: Math.max(0, 100 - missing.length * 15 - malformedBlocks.length * 5),
    missing,
    malformedBlocks
  };
}

function collectLabels(sections) {
  const all = [];
  for (const section of sections) {
    for (const block of section.blocks || []) {
      if (block.label) {
        all.push({
          label: block.label,
          type: block.type,
          blockId: block.id,
          sectionId: section.id,
          caption: block.caption || block.text || ""
        });
      }
    }
  }
  const counts = countBy(all, (item) => item.label);
  return {
    all,
    byLabel: new Map(all.map((item) => [item.label, item])),
    duplicates: all.filter((item) => counts.get(item.label) > 1)
  };
}

function collectCitations(sections, bibliography) {
  const bibliographyKeys = new Set(bibliography.map((entry) => entry.key));
  const occurrences = [];
  for (const section of sections) {
    for (const block of section.blocks || []) {
      for (const key of extractCitationKeys(block.text || "")) {
        occurrences.push({ key, sectionId: section.id, blockId: block.id });
      }
    }
  }
  const uniqueKeys = Array.from(new Set(occurrences.map((item) => item.key)));
  const missing = uniqueKeys.filter((key) => !bibliographyKeys.has(key));
  const unused = bibliography.map((entry) => entry.key).filter((key) => !uniqueKeys.includes(key));

  return {
    occurrences,
    uniqueKeys,
    missing,
    unused
  };
}

function collectCrossReferences(sections, labels) {
  const occurrences = [];
  for (const section of sections) {
    for (const block of section.blocks || []) {
      for (const label of extractCrossReferenceLabels(block.text || "")) {
        occurrences.push({ label, sectionId: section.id, blockId: block.id });
      }
    }
  }
  const missing = occurrences.filter((item) => !labels.byLabel.has(item.label));
  return {
    occurrences,
    missing
  };
}

function buildNumbering(labels, citations) {
  const citationNumbers = new Map(citations.uniqueKeys.map((key, index) => [key, index + 1]));
  const grouped = {
    figure: labels.all.filter((item) => item.type === "figure"),
    table: labels.all.filter((item) => item.type === "table"),
    equation: labels.all.filter((item) => item.type === "equation")
  };
  const crossReferenceNumbers = new Map();
  for (const [type, items] of Object.entries(grouped)) {
    items.forEach((item, index) => {
      crossReferenceNumbers.set(item.label, {
        type,
        number: index + 1,
        display: displayCrossReference(type, index + 1)
      });
    });
  }
  return {
    citationNumbers: Object.fromEntries(citationNumbers),
    crossReferenceNumbers: Object.fromEntries(crossReferenceNumbers)
  };
}

function formatBlocks(sections, numbering) {
  return sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    blocks: (section.blocks || []).map((block) => ({
      id: block.id,
      type: block.type,
      text: formatText(block.text || block.caption || "", numbering)
    }))
  }));
}

function buildStyleChecklist(manuscript, citations, crossReferences, labels) {
  const presentSections = new Set((manuscript.sections || []).map((section) => section.id));
  const requiredSections = (manuscript.style && manuscript.style.requiredSections) || [];
  const missingSections = requiredSections.filter((sectionId) => !presentSections.has(sectionId));

  return {
    requiredSections: {
      status: missingSections.length === 0 ? "passed" : "failed",
      missingSections
    },
    bibliographyCoverage: {
      status: citations.missing.length === 0 ? "passed" : "failed",
      missingKeys: citations.missing,
      unusedKeys: citations.unused
    },
    crossReferenceIntegrity: {
      status: crossReferences.missing.length === 0 && labels.duplicates.length === 0 ? "passed" : "failed",
      missingLabels: crossReferences.missing.map((item) => item.label),
      duplicateLabels: labels.duplicates.map((item) => item.label)
    }
  };
}

function buildFormattingTasks(citations, crossReferences, labels, checklist) {
  const tasks = [];
  for (const key of citations.missing) {
    tasks.push({
      type: "missing-citation",
      owner: "author",
      target: key,
      message: `Add bibliography entry for @${key} or remove the citation.`
    });
  }
  for (const item of crossReferences.missing) {
    tasks.push({
      type: "missing-cross-reference",
      owner: "editor",
      target: item.label,
      message: `Resolve ${item.label} referenced in block ${item.blockId}.`
    });
  }
  for (const label of new Set(labels.duplicates.map((item) => item.label))) {
    tasks.push({
      type: "duplicate-label",
      owner: "editor",
      target: label,
      message: `Rename duplicate label ${label} before export.`
    });
  }
  for (const sectionId of checklist.requiredSections.missingSections) {
    tasks.push({
      type: "missing-required-section",
      owner: "author",
      target: sectionId,
      message: `Add required ${sectionId} section for the selected publication style.`
    });
  }
  return tasks;
}

function buildPublicationOutline(manuscript, numbering, checklist) {
  return {
    title: manuscript.title,
    styleName: manuscript.style && manuscript.style.name,
    sections: (manuscript.sections || []).map((section) => ({
      id: section.id,
      heading: section.heading,
      blockCount: (section.blocks || []).length
    })),
    citationCount: Object.keys(numbering.citationNumbers).length,
    crossReferenceCount: Object.keys(numbering.crossReferenceNumbers).length,
    exportBlocked: Object.values(checklist).some((item) => item.status === "failed")
  };
}

function formatText(text, numbering) {
  return text
    .replace(/\[@([^\]]+)\]/g, (_match, group) => {
      const keys = group.split(";").map((item) => item.trim().replace(/^@/, ""));
      const rendered = keys.map((key) => numbering.citationNumbers[key] || "?").join(",");
      return `[${rendered}]`;
    })
    .replace(/\{\{([^}]+)\}\}/g, (_match, label) => {
      const crossRef = numbering.crossReferenceNumbers[label];
      return crossRef ? crossRef.display : `UNRESOLVED(${label})`;
    });
}

function extractCitationKeys(text) {
  const keys = [];
  const citationPattern = /\[@([^\]]+)\]/g;
  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    for (const item of match[1].split(";")) {
      const key = item.trim().replace(/^@/, "");
      if (key) keys.push(key);
    }
  }
  return keys;
}

function extractCrossReferenceLabels(text) {
  const labels = [];
  const labelPattern = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = labelPattern.exec(text)) !== null) {
    labels.push(match[1].trim());
  }
  return labels;
}

function displayCrossReference(type, number) {
  if (type === "figure") return `Figure ${number}`;
  if (type === "table") return `Table ${number}`;
  if (type === "equation") return `Equation ${number}`;
  return `${type} ${number}`;
}

function countBy(items, select) {
  const counts = new Map();
  for (const item of items) {
    const key = select(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (value instanceof Map) return stableStringify(Object.fromEntries(value));
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  buildReferenceWorkbench,
  validateManuscript,
  extractCitationKeys,
  extractCrossReferenceLabels,
  stableDigest
};
