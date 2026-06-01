"use strict";

const crypto = require("node:crypto");

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];
const PRIVATE_NOTE_PATTERN =
  /\b(?:reviewer-only|blind-review|anonymous reviewer|internal note|\/Users\/|C:\\Users\\|patient-id|phi:|private collaborator|do not export)\b/i;

function evaluateGlossaryAcronymPacket(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateGlossaryAcronymPacket expects a packet object");
  }

  const now = options.now ?? new Date().toISOString();
  const minDefinitionWords = options.minDefinitionWords ?? 6;
  const findings = [];
  const document = isPlainObject(packet.document) ? packet.document : {};
  const sections = asArray(packet.sections);
  const glossaryEntries = asArray(packet.glossaryEntries);
  const proposedEdits = asArray(packet.proposedEdits);
  const comments = asArray(packet.comments);
  const exportSettings = isPlainObject(packet.export) ? packet.export : {};
  const sectionById = new Map(sections.map((section) => [String(section.id), section]));
  const entryById = new Map(glossaryEntries.map((entry) => [String(entry.id), entry]));
  const includeGlossaryIds = new Set(asArray(exportSettings.includeGlossaryIds).map(String));

  if (!document.id || !document.title || !document.versionHash) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_DOCUMENT",
        "high",
        "Glossary packet is missing a stable document id, title, or version hash.",
        "Collaborative export review needs manuscript metadata to bind terminology decisions.",
        "document",
        "Attach stable document metadata before the terminology guard runs."
      )
    );
  }

  if (sections.length === 0) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_SECTIONS",
        "high",
        "Glossary packet has no manuscript sections to inspect.",
        "The guard cannot verify first-use acronym expansion or locked-section terminology edits.",
        "sections",
        "Attach the exportable manuscript sections."
      )
    );
  }

  if (glossaryEntries.length === 0) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_GLOSSARY",
        "high",
        "Glossary packet has no glossary entries.",
        "Collaborative terminology export cannot prove that scientific terms are defined.",
        "glossaryEntries",
        "Attach approved glossary entries before export."
      )
    );
  }

  inspectAcronymCollisions(glossaryEntries, findings);
  inspectAcronymFirstUse(sections, glossaryEntries, findings);
  inspectGlossaryEntries(glossaryEntries, sectionById, includeGlossaryIds, exportSettings, minDefinitionWords, findings);
  inspectMentionedTerms(sections, glossaryEntries, includeGlossaryIds, findings);
  inspectLockedEdits(proposedEdits, sectionById, entryById, findings);
  inspectBlockingComments(comments, entryById, findings);

  const sortedFindings = sortFindings(findings);
  const status = determineStatus(sortedFindings);
  const summary = summarize(status, sortedFindings);
  const remediationActions = sortedFindings.map((item) => ({
    code: item.code,
    owner: item.owner,
    action: item.remediation
  }));
  const exportGlossary = glossaryEntries
    .filter((entry) => includeGlossaryIds.has(String(entry.id)))
    .map((entry) => ({
      id: entry.id,
      term: entry.term,
      acronym: entry.acronym ?? null,
      expansion: entry.expansion ?? null,
      definition: entry.definition,
      discipline: entry.discipline ?? "general"
    }));
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        document,
        sections: sections.map((section) => ({
          id: section.id,
          versionHash: section.versionHash,
          body: section.body
        })),
        glossaryEntries,
        proposedEdits,
        exportSettings,
        codes: sortedFindings.map((item) => item.code)
      })
    )
    .digest("hex")
    .slice(0, 16);

  return {
    generatedAt: now,
    status,
    summary,
    findingCounts: countBySeverity(sortedFindings),
    findings: sortedFindings,
    exportGlossary,
    remediationActions,
    fingerprint
  };
}

function renderMarkdownReport(result, packet) {
  const lines = [
    `# Collaborative Glossary and Acronym Guard`,
    "",
    `Document: ${packet.document?.title ?? "Untitled"}`,
    `Status: ${result.status}`,
    `Fingerprint: ${result.fingerprint}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Findings",
    ""
  ];

  if (result.findings.length === 0) {
    lines.push("- No terminology blockers found.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}`);
      lines.push(`  - Remediation: ${item.remediation}`);
    });
  }

  lines.push("", "## Export Glossary", "");
  result.exportGlossary.forEach((entry) => {
    const label = entry.acronym ? `${entry.acronym} - ${entry.expansion}` : entry.term;
    lines.push(`- ${label}: ${entry.definition}`);
  });

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const counts = result.findingCounts;
  const critical = counts.critical ?? 0;
  const high = counts.high ?? 0;
  const warning = counts.warning ?? 0;
  const ready = result.status === "READY";
  const statusColor = ready ? "#16794c" : result.status === "REVISE" ? "#a15c00" : "#a11b32";
  const holdWidth = Math.min(300, (critical + high) * 60);
  const warningWidth = Math.min(220, warning * 55);
  const readyWidth = ready ? 260 : Math.max(60, 260 - holdWidth);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Glossary acronym guard summary">`,
    `<rect width="960" height="540" fill="#111827"/>`,
    `<rect x="48" y="48" width="864" height="444" rx="18" fill="#f8fafc"/>`,
    `<text x="82" y="118" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">Collaborative glossary guard</text>`,
    `<text x="82" y="164" font-family="Arial, sans-serif" font-size="20" fill="#475569">Status ${escapeXml(result.status)} - fingerprint ${escapeXml(result.fingerprint)}</text>`,
    `<rect x="82" y="220" width="${readyWidth}" height="62" fill="#16794c"/>`,
    `<rect x="${82 + readyWidth}" y="220" width="${warningWidth}" height="62" fill="#a15c00"/>`,
    `<rect x="${82 + readyWidth + warningWidth}" y="220" width="${holdWidth}" height="62" fill="${statusColor}"/>`,
    `<text x="96" y="260" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">READY ${counts.info ?? 0}</text>`,
    `<text x="82" y="346" font-family="Arial, sans-serif" font-size="22" fill="#334155">Critical/high blockers: ${critical + high}</text>`,
    `<text x="82" y="386" font-family="Arial, sans-serif" font-size="22" fill="#334155">Warnings: ${warning}</text>`,
    `<text x="82" y="426" font-family="Arial, sans-serif" font-size="22" fill="#334155">Export glossary entries: ${result.exportGlossary.length}</text>`,
    `</svg>`
  ].join("\n");
}

function inspectAcronymCollisions(glossaryEntries, findings) {
  const byAcronym = new Map();
  glossaryEntries.forEach((entry) => {
    if (!entry.acronym || !entry.expansion) {
      return;
    }
    const acronym = normalizeAcronym(entry.acronym);
    const expansion = normalizeText(entry.expansion);
    if (!byAcronym.has(acronym)) {
      byAcronym.set(acronym, new Map());
    }
    if (!byAcronym.get(acronym).has(expansion)) {
      byAcronym.get(acronym).set(expansion, []);
    }
    byAcronym.get(acronym).get(expansion).push(entry);
  });

  for (const [acronym, expansions] of byAcronym) {
    if (expansions.size <= 1) {
      continue;
    }
    const labels = [...expansions.keys()].join("; ");
    findings.push(
      finding(
        "ACRONYM_EXPANSION_COLLISION",
        "critical",
        `${acronym} has multiple approved expansions: ${labels}.`,
        "Readers and downstream exports cannot know which definition applies in each section.",
        `glossaryEntries.${acronym}`,
        "Split the acronym by discipline or choose one canonical manuscript-level expansion.",
        "lead editor"
      )
    );
  }
}

function inspectAcronymFirstUse(sections, glossaryEntries, findings) {
  glossaryEntries
    .filter((entry) => entry.acronym && entry.expansion)
    .forEach((entry) => {
      const acronym = normalizeAcronym(entry.acronym);
      const expansion = String(entry.expansion);
      const firstUse = findFirstUse(sections, acronym);
      if (!firstUse) {
        return;
      }
      const section = firstUse.section;
      const before = String(section.body ?? "").slice(Math.max(0, firstUse.index - expansion.length - 12), firstUse.index + acronym.length + 2);
      const expected = new RegExp(`${escapeRegex(expansion)}\\s*\\(\\s*${escapeRegex(acronym)}\\s*\\)`, "i");
      if (!expected.test(before)) {
        findings.push(
          finding(
            "ACRONYM_FIRST_USE_UNEXPANDED",
            "high",
            `${acronym} first appears in section ${section.id} without its expansion.`,
            "Publication exports should define acronyms at first use for readers and reviewers.",
            `sections.${section.id}`,
            `Introduce "${expansion} (${acronym})" at first use or move the first mention after the definition.`,
            "section author"
          )
        );
      }
    });
}

function inspectGlossaryEntries(glossaryEntries, sectionById, includeGlossaryIds, exportSettings, minDefinitionWords, findings) {
  glossaryEntries.forEach((entry, index) => {
    const path = `glossaryEntries[${index}]`;
    const id = String(entry.id ?? "");
    const term = String(entry.term ?? entry.acronym ?? `entry ${index}`);

    if (!id) {
      findings.push(
        finding(
          "GLOSSARY_ENTRY_MISSING_ID",
          "high",
          `Glossary entry "${term}" has no stable id.`,
          "Collaborative approvals and export manifests need stable terminology identifiers.",
          `${path}.id`,
          "Assign a stable glossary id.",
          "terminology editor"
        )
      );
    }

    if (entry.exportable !== false && !includeGlossaryIds.has(id)) {
      findings.push(
        finding(
          "GLOSSARY_EXPORT_INCOMPLETE",
          "high",
          `Exportable glossary entry "${term}" is missing from the export glossary manifest.`,
          "Readers will see terminology in the manuscript without a matching glossary definition.",
          `${path}.exportable`,
          "Add the entry id to export.includeGlossaryIds or mark it as internal-only.",
          "export owner"
        )
      );
    }

    if (!entry.definition || countWords(entry.definition) < minDefinitionWords) {
      findings.push(
        finding(
          "TERM_DEFINITION_INCOMPLETE",
          "high",
          `Glossary entry "${term}" has an incomplete definition.`,
          "Short or missing definitions create discipline-specific ambiguity during review.",
          `${path}.definition`,
          "Add a concise, reviewer-ready definition with enough scientific context.",
          "terminology editor"
        )
      );
    }

    if (entry.status !== "approved" && entry.exportable !== false) {
      findings.push(
        finding(
          "UNAPPROVED_GLOSSARY_TERM",
          "high",
          `Glossary entry "${term}" is exportable but not approved.`,
          "Collaborative manuscripts should not export provisional terminology.",
          `${path}.status`,
          "Route the term through collaborator approval or hold it from export.",
          "lead editor"
        )
      );
    }

    const section = sectionById.get(String(entry.firstUseSectionId ?? ""));
    if (entry.firstUseSectionId && !section) {
      findings.push(
        finding(
          "TERM_FIRST_USE_SECTION_UNKNOWN",
          "high",
          `Glossary entry "${term}" references an unknown first-use section.`,
          "Glossary anchors must point to live manuscript sections.",
          `${path}.firstUseSectionId`,
          "Bind the term to a current section id.",
          "terminology editor"
        )
      );
    }

    if (section && entry.sectionVersionHash && entry.sectionVersionHash !== section.versionHash) {
      findings.push(
        finding(
          "STALE_TERM_SECTION_ANCHOR",
          "warning",
          `Glossary entry "${term}" was approved against an older version of section ${section.id}.`,
          "Collaborative edits may have changed the term context since approval.",
          `${path}.sectionVersionHash`,
          "Refresh the term anchor against the current section version.",
          "section author"
        )
      );
    }

    const exportNote = String(entry.exportNote ?? "");
    const privateNote = String(entry.privateNote ?? "");
    if (PRIVATE_NOTE_PATTERN.test(exportNote) || (exportSettings.includePrivateNotes === true && PRIVATE_NOTE_PATTERN.test(privateNote))) {
      findings.push(
        finding(
          "PRIVATE_TERMINOLOGY_NOTE_LEAK",
          "critical",
          `Glossary entry "${term}" would leak private reviewer or collaborator terminology notes.`,
          "Anonymous review notes, local paths, and private comments must not appear in manuscript exports.",
          `${path}.exportNote`,
          "Redact private terminology notes and export only public glossary text.",
          "export owner"
        )
      );
    }
  });
}

function inspectMentionedTerms(sections, glossaryEntries, includeGlossaryIds, findings) {
  const exportableEntries = glossaryEntries.filter((entry) => entry.exportable !== false && (entry.term || entry.acronym));
  exportableEntries.forEach((entry) => {
    const token = String(entry.term ?? entry.acronym);
    if (includeGlossaryIds.has(String(entry.id))) {
      return;
    }
    const matcher = new RegExp(`\\b${escapeRegex(token)}\\b`, "i");
    const section = sections.find((candidate) => matcher.test(String(candidate.body ?? "")));
    if (!section) {
      return;
    }
    findings.push(
      finding(
        "MENTIONED_TERM_NOT_EXPORTED",
        "high",
        `"${token}" appears in section ${section.id} but is absent from the exported glossary.`,
        "Collaborators can accidentally remove a needed term from the reader-facing glossary.",
        `sections.${section.id}`,
        "Include the mentioned term in the export glossary or remove the stale manuscript mention.",
        "export owner"
      )
    );
  });
}

function inspectLockedEdits(proposedEdits, sectionById, entryById, findings) {
  proposedEdits.forEach((edit, index) => {
    const section = sectionById.get(String(edit.sectionId ?? ""));
    const entry = entryById.get(String(edit.termId ?? ""));
    if (!section || section.locked !== true) {
      return;
    }
    const approvals = asArray(edit.approvedBy);
    if (approvals.length === 0 || edit.sectionVersionHash !== section.versionHash) {
      findings.push(
        finding(
          "LOCKED_SECTION_TERM_EDIT_UNAPPROVED",
          "high",
          `Terminology edit ${edit.id ?? index} targets locked section ${section.id} without current approval.`,
          "Locked final-review sections should not accept glossary changes without explicit approval.",
          `proposedEdits[${index}]`,
          `Obtain approval for ${entry?.term ?? edit.termId ?? "the term"} against section version ${section.versionHash}.`,
          "section owner"
        )
      );
    }
  });
}

function inspectBlockingComments(comments, entryById, findings) {
  comments.forEach((comment, index) => {
    if (comment.resolved === true || comment.blocksExport !== true) {
      return;
    }
    const entry = entryById.get(String(comment.termId ?? ""));
    findings.push(
      finding(
        "BLOCKING_TERMINOLOGY_COMMENT",
        "high",
        `Unresolved terminology comment blocks export for ${entry?.term ?? comment.termId ?? "a glossary term"}.`,
        "The collaborative editor should not publish terminology while blocking review threads are open.",
        `comments[${index}]`,
        "Resolve the terminology comment or mark it non-blocking before export.",
        "review owner"
      )
    );
  });
}

function findFirstUse(sections, acronym) {
  const matcher = new RegExp(`\\b${escapeRegex(acronym)}\\b`);
  for (const section of sections) {
    const body = String(section.body ?? "");
    const match = matcher.exec(body);
    if (match) {
      return { section, index: match.index };
    }
  }
  return null;
}

function determineStatus(findings) {
  if (findings.some((item) => item.severity === "critical" || item.severity === "high")) {
    return "HOLD";
  }
  if (findings.some((item) => item.severity === "warning")) {
    return "REVISE";
  }
  return "READY";
}

function summarize(status, findings) {
  if (status === "READY") {
    return "Glossary, acronym, and terminology export checks passed for the collaborative manuscript.";
  }
  const counts = countBySeverity(findings);
  return `Glossary export is ${status.toLowerCase()} with ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, and ${counts.warning ?? 0} warning finding(s).`;
}

function finding(code, severity, message, impact, path, remediation, owner = "editor") {
  return { code, severity, message, impact, path, remediation, owner };
}

function sortFindings(findings) {
  return findings.sort((left, right) => {
    const severityDelta = SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return left.code.localeCompare(right.code);
  });
}

function countBySeverity(findings) {
  return findings.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] ?? 0) + 1;
    return counts;
  }, {});
}

function countWords(value) {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function normalizeAcronym(value) {
  return String(value).trim().toUpperCase();
}

function normalizeText(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

module.exports = {
  evaluateGlossaryAcronymPacket,
  renderMarkdownReport,
  renderSvgSummary
};
