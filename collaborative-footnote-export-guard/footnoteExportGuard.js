const DEFAULT_JOURNAL_POLICY = Object.freeze({
  requireCitationBindings: true,
  requireEndnoteOrder: true,
  allowPrivateNotesInExport: false,
  lockedSectionsBlockNoteEdits: true
});

function normalizePolicy(policy = {}) {
  return { ...DEFAULT_JOURNAL_POLICY, ...policy };
}

function markerId(marker) {
  if (typeof marker === "string") {
    return marker.trim();
  }
  return marker && typeof marker.id === "string" ? marker.id.trim() : "";
}

function sectionById(sections) {
  return new Map((sections || []).map((section) => [section.id, section]));
}

function firstAppearanceOrder(sections) {
  const seen = new Map();

  for (const section of sections || []) {
    for (const marker of section.markers || []) {
      const id = markerId(marker);
      if (id && !seen.has(id)) {
        seen.set(id, seen.size + 1);
      }
    }
  }

  return seen;
}

function buildDuplicateMarkerFindings(sections) {
  const locations = new Map();

  for (const section of sections || []) {
    for (const marker of section.markers || []) {
      const id = markerId(marker);
      if (!id) {
        continue;
      }
      const sectionLocations = locations.get(id) || [];
      sectionLocations.push(section.id);
      locations.set(id, sectionLocations);
    }
  }

  return [...locations.entries()]
    .filter(([, sectionIds]) => sectionIds.length > 1)
    .map(([id, sectionIds]) => ({
      id: `duplicate-marker:${id}`,
      severity: "hold",
      message: `Footnote marker ${id} appears in multiple manuscript sections.`,
      evidence: { marker: id, sectionIds },
      action: "Assign unique note markers or confirm that repeated references use an explicit shared-note alias."
    }));
}

function evaluateFootnoteExport(workspace, policyInput = {}) {
  const policy = normalizePolicy(policyInput);
  const sections = workspace.sections || [];
  const notes = workspace.notes || [];
  const sectionsById = sectionById(sections);
  const markerOrder = firstAppearanceOrder(sections);
  const noteById = new Map(notes.map((note) => [note.id, note]));
  const findings = [];

  for (const marker of markerOrder.keys()) {
    if (!noteById.has(marker)) {
      findings.push({
        id: `orphan-marker:${marker}`,
        severity: "block",
        message: `Marker ${marker} is present in the manuscript without matching note text.`,
        evidence: { marker },
        action: "Add the missing note text or remove the marker before export."
      });
    }
  }

  for (const note of notes) {
    if (!markerOrder.has(note.id)) {
      findings.push({
        id: `unused-note:${note.id}`,
        severity: "warn",
        message: `Note ${note.id} has text but no visible manuscript marker.`,
        evidence: { noteId: note.id },
        action: "Either insert the marker in the manuscript or exclude the unused note from export."
      });
    }

    if (!policy.allowPrivateNotesInExport && note.visibility === "private") {
      findings.push({
        id: `private-note:${note.id}`,
        severity: "block",
        message: `Private note ${note.id} would be included in the export packet.`,
        evidence: { noteId: note.id, owner: note.owner, visibility: note.visibility },
        action: "Redact the note or convert it to an export-safe public note after review."
      });
    }

    if (policy.requireCitationBindings && note.requiresCitation && !note.citationKey) {
      findings.push({
        id: `missing-citation:${note.id}`,
        severity: "hold",
        message: `Source-backed note ${note.id} is missing a citation binding.`,
        evidence: { noteId: note.id },
        action: "Bind the note to an approved bibliography entry before export."
      });
    }

    const section = sectionsById.get(note.sectionId);
    if (policy.lockedSectionsBlockNoteEdits && section && section.locked && note.modifiedAfterLock) {
      findings.push({
        id: `locked-section-note-edit:${note.id}`,
        severity: "block",
        message: `Note ${note.id} changed after section ${section.id} entered final-review lock.`,
        evidence: { noteId: note.id, sectionId: section.id, lockReason: section.lockReason },
        action: "Ask the section owner to unlock, approve, or roll back the note edit."
      });
    }
  }

  findings.push(...buildDuplicateMarkerFindings(sections));

  if (policy.requireEndnoteOrder) {
    const exportableNotes = notes
      .filter((note) => markerOrder.has(note.id))
      .map((note) => ({ id: note.id, expectedOrder: markerOrder.get(note.id), exportedOrder: note.exportedOrder }));

    for (const note of exportableNotes) {
      if (note.exportedOrder !== note.expectedOrder) {
        findings.push({
          id: `endnote-order:${note.id}`,
          severity: "hold",
          message: `Endnote ${note.id} is exported as ${note.exportedOrder}, but first appears at position ${note.expectedOrder}.`,
          evidence: note,
          action: "Rebuild the endnote list from first marker appearance before journal export."
        });
      }
    }
  }

  const blockers = findings.filter((finding) => finding.severity === "block");
  const holds = findings.filter((finding) => finding.severity === "hold");
  const warnings = findings.filter((finding) => finding.severity === "warn");
  const decision = blockers.length > 0 ? "block-export" : holds.length > 0 ? "hold-for-editor-review" : "ready-for-export";

  return {
    workspaceId: workspace.id,
    checkedAt: workspace.checkedAt || new Date().toISOString(),
    decision,
    summary: {
      sections: sections.length,
      notes: notes.length,
      markers: markerOrder.size,
      blockers: blockers.length,
      holds: holds.length,
      warnings: warnings.length
    },
    findings
  };
}

function toMarkdownReport(result) {
  const lines = [
    `# Footnote Export Guard Report`,
    ``,
    `Workspace: ${result.workspaceId}`,
    `Decision: ${result.decision}`,
    ``,
    `| Severity | Finding | Action |`,
    `| --- | --- | --- |`
  ];

  for (const finding of result.findings) {
    lines.push(`| ${finding.severity} | ${finding.message} | ${finding.action} |`);
  }

  if (result.findings.length === 0) {
    lines.push(`| ok | No export-blocking footnote issues found. | Export may continue. |`);
  }

  return `${lines.join("\n")}\n`;
}

function toSvgBadge(result) {
  const color = result.decision === "ready-for-export" ? "#0f7b45" : result.decision === "hold-for-editor-review" ? "#9a6700" : "#b42318";
  const label = result.decision.replaceAll("-", " ");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="220" viewBox="0 0 720 220" role="img" aria-label="Footnote export guard summary">`,
    `<rect width="720" height="220" fill="#f8fafc"/>`,
    `<rect x="28" y="28" width="664" height="164" rx="8" fill="#ffffff" stroke="#d0d7de"/>`,
    `<text x="52" y="72" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">Footnote Export Guard</text>`,
    `<text x="52" y="112" font-family="Arial, sans-serif" font-size="18" fill="${color}">Decision: ${label}</text>`,
    `<text x="52" y="146" font-family="Arial, sans-serif" font-size="16" fill="#374151">Blockers: ${result.summary.blockers} | Holds: ${result.summary.holds} | Warnings: ${result.summary.warnings}</text>`,
    `<text x="52" y="174" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">Workspace ${result.workspaceId} checked ${result.checkedAt}</text>`,
    `</svg>`
  ].join("\n");
}

module.exports = {
  evaluateFootnoteExport,
  toMarkdownReport,
  toSvgBadge
};
