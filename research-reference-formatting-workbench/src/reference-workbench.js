'use strict';

const crypto = require('node:crypto');

const STYLE_NAMES = new Set(['apa', 'nature', 'vancouver']);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripOuterBraces(value) {
  let result = compact(value);
  while (result.startsWith('{') && result.endsWith('}')) {
    result = compact(result.slice(1, -1));
  }
  return result.replace(/[{}]/g, '');
}

function normalizeDoi(value) {
  return compact(value)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .replace(/[.]\s*$/, '')
    .toLowerCase();
}

function normalizeKey(value) {
  return compact(value).replace(/^@/, '');
}

function parseAuthor(raw) {
  const text = stripOuterBraces(raw);
  if (!text) return null;
  if (text.includes(',')) {
    const [family, given] = text.split(',').map(compact);
    return {
      family: family || text,
      given: given || '',
      display: compact(`${given || ''} ${family || text}`),
    };
  }

  const parts = text.split(/\s+/);
  if (parts.length === 1) {
    return { family: parts[0], given: '', display: parts[0] };
  }
  const family = parts.pop();
  const given = parts.join(' ');
  return {
    family,
    given,
    display: compact(`${given} ${family}`),
  };
}

function parseAuthors(value) {
  if (Array.isArray(value)) {
    return value.map((author) => {
      if (typeof author === 'object' && author !== null) {
        return {
          family: compact(author.family || author.last || author.name),
          given: compact(author.given || author.first || ''),
          display: compact(author.display || author.name || `${author.given || author.first || ''} ${author.family || author.last || ''}`),
        };
      }
      return parseAuthor(author);
    }).filter(Boolean);
  }

  return String(value || '')
    .split(/\s+and\s+|;/i)
    .map(parseAuthor)
    .filter(Boolean);
}

function initials(given) {
  return compact(given)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(' ');
}

function formatAuthorsApa(authors) {
  const formatted = asArray(authors).map((author) => {
    const family = compact(author.family || author.display);
    const init = initials(author.given);
    return compact(`${family}, ${init}`);
  });

  if (formatted.length <= 1) return formatted[0] || 'Unknown author';
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
}

function formatAuthorsCompact(authors) {
  const formatted = asArray(authors).map((author) => compact(`${author.family || author.display} ${initials(author.given)}`));
  if (formatted.length <= 3) return formatted.join(', ') || 'Unknown author';
  return `${formatted[0]} et al.`;
}

function withoutTrailingPeriod(value) {
  return compact(value).replace(/[.]+$/, '');
}

function findMatchingBrace(text, startIndex) {
  let depth = 0;
  let quote = null;
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    const prev = text[index - 1];
    if ((char === '"' || char === "'") && prev !== '\\') {
      quote = quote === char ? null : quote || char;
    }
    if (quote) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function splitTopLevel(text, separator = ',') {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const prev = text[index - 1];
    if ((char === '"' || char === "'") && prev !== '\\') {
      quote = quote === char ? null : quote || char;
    }
    if (!quote) {
      if (char === '{' || char === '[' || char === '(') depth += 1;
      if (char === '}' || char === ']' || char === ')') depth -= 1;
      if (char === separator && depth === 0) {
        parts.push(text.slice(start, index));
        start = index + 1;
      }
    }
  }

  parts.push(text.slice(start));
  return parts.map(compact).filter(Boolean);
}

function parseField(fieldText) {
  const eqIndex = fieldText.indexOf('=');
  if (eqIndex === -1) return null;
  const name = compact(fieldText.slice(0, eqIndex)).toLowerCase();
  const rawValue = compact(fieldText.slice(eqIndex + 1));
  const quoted = rawValue.replace(/^["{]/, '').replace(/[}"]$/, '');
  return [name, stripOuterBraces(quoted)];
}

function parseBibtex(bibtex) {
  const entries = [];
  const text = String(bibtex || '');
  let cursor = 0;

  while (cursor < text.length) {
    const at = text.indexOf('@', cursor);
    if (at === -1) break;
    const open = text.indexOf('{', at);
    if (open === -1) break;
    const type = compact(text.slice(at + 1, open)).toLowerCase();
    const close = findMatchingBrace(text, open);
    if (close === -1) break;

    const body = text.slice(open + 1, close);
    const [keyPart, ...fieldParts] = splitTopLevel(body);
    const fields = Object.fromEntries(fieldParts.map(parseField).filter(Boolean));

    entries.push(normalizeReference({
      type,
      key: keyPart,
      title: fields.title,
      authors: fields.author,
      year: fields.year,
      journal: fields.journal || fields.booktitle || fields.publisher,
      doi: fields.doi,
      url: fields.url,
      source: 'bibtex',
    }));
    cursor = close + 1;
  }

  return entries;
}

function normalizeReference(reference) {
  const key = normalizeKey(reference.key || reference.id || reference.citationKey);
  const authors = parseAuthors(reference.authors || reference.author);
  const title = stripOuterBraces(reference.title || 'Untitled reference');
  const doi = normalizeDoi(reference.doi || '');
  return {
    key,
    type: compact(reference.type || 'article').toLowerCase(),
    title,
    authors,
    year: compact(reference.year || reference.published || 'n.d.'),
    journal: stripOuterBraces(reference.journal || reference.venue || reference.sourceTitle || ''),
    doi,
    url: compact(reference.url || ''),
    source: reference.source || 'manual',
  };
}

function loadReferences(manuscript) {
  return [
    ...parseBibtex(manuscript.bibtex || ''),
    ...asArray(manuscript.references).map(normalizeReference),
  ].filter((reference) => reference.key);
}

function buildReferenceIndex(references) {
  const byKey = new Map();
  const duplicates = [];

  references.forEach((reference) => {
    if (byKey.has(reference.key)) {
      duplicates.push(reference.key);
    }
    byKey.set(reference.key, reference);
  });

  return {
    byKey,
    duplicates: [...new Set(duplicates)],
  };
}

function extractCitationKeys(text) {
  const keys = [];
  const bracketPattern = /\[@([^\]]+)\]/g;
  const latexPattern = /\\cite[tp]?\{([^}]+)\}/g;

  let match = bracketPattern.exec(text);
  while (match) {
    match[1].split(/[;,]/).forEach((part) => {
      const key = normalizeKey(part);
      if (key) keys.push(key);
    });
    match = bracketPattern.exec(text);
  }

  match = latexPattern.exec(text);
  while (match) {
    match[1].split(',').forEach((part) => {
      const key = normalizeKey(part);
      if (key) keys.push(key);
    });
    match = latexPattern.exec(text);
  }

  return keys;
}

function collectCitationOrder(manuscript) {
  const seen = new Set();
  const ordered = [];
  const blocks = [
    manuscript.abstract,
    ...asArray(manuscript.sections).map((section) => section.body),
    ...asArray(manuscript.captions).map((caption) => caption.text),
  ];

  blocks.forEach((block) => {
    extractCitationKeys(block).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    });
  });

  return ordered;
}

function citationLabel(key, citationOrder, style) {
  const index = citationOrder.indexOf(key) + 1;
  if (style === 'apa') return `(${key})`;
  return `[${index || '?'}]`;
}

function formatReference(reference, style, index) {
  const doi = reference.doi ? ` https://doi.org/${reference.doi}` : reference.url ? ` ${reference.url}` : '';
  if (style === 'apa') {
    return `${formatAuthorsApa(reference.authors)} (${reference.year}). ${reference.title}. ${reference.journal}.${doi}`.replace(/\s+\./g, '.');
  }
  const compactAuthors = withoutTrailingPeriod(formatAuthorsCompact(reference.authors));
  if (style === 'vancouver') {
    return `${index}. ${compactAuthors}. ${reference.title}. ${reference.journal}. ${reference.year}.${doi}`.replace(/\s+\./g, '.');
  }
  return `${index}. ${compactAuthors}. ${reference.title}. ${reference.journal} (${reference.year}).${doi}`.replace(/\s+\./g, '.');
}

function buildBibliography(references, citationOrder, style) {
  const byKey = new Map(references.map((reference) => [reference.key, reference]));
  const orderedReferences = style === 'apa'
    ? citationOrder.map((key) => byKey.get(key)).filter(Boolean).sort((left, right) => {
      return compact(left.authors[0] && left.authors[0].family).localeCompare(compact(right.authors[0] && right.authors[0].family));
    })
    : citationOrder.map((key) => byKey.get(key)).filter(Boolean);

  return orderedReferences.map((reference, index) => ({
    key: reference.key,
    text: formatReference(reference, style, index + 1),
  }));
}

function collectCrossReferenceTargets(manuscript) {
  const targets = new Map();
  const groups = [
    ['fig', manuscript.figures || []],
    ['tbl', manuscript.tables || []],
    ['eq', manuscript.equations || []],
  ];

  groups.forEach(([prefix, entries]) => {
    asArray(entries).forEach((entry, index) => {
      const label = normalizeKey(entry.label || `${prefix}:${index + 1}`);
      targets.set(label, {
        label,
        type: prefix,
        number: index + 1,
        title: compact(entry.title || entry.caption || label),
      });
    });
  });

  return targets;
}

function collectCrossReferenceUses(manuscript) {
  const pattern = /\{\{(fig|tbl|eq):([a-z0-9_.:-]+)\}\}/gi;
  const uses = [];
  asArray(manuscript.sections).forEach((section) => {
    let match = pattern.exec(section.body || '');
    while (match) {
      uses.push({
        sectionId: section.id,
        marker: match[0],
        label: `${match[1].toLowerCase()}:${match[2]}`,
      });
      match = pattern.exec(section.body || '');
    }
  });
  return uses;
}

function buildCrossReferenceReport(manuscript) {
  const targets = collectCrossReferenceTargets(manuscript);
  const uses = collectCrossReferenceUses(manuscript);
  const unresolved = uses.filter((use) => !targets.has(use.label));
  const resolved = uses.filter((use) => targets.has(use.label)).map((use) => {
    const target = targets.get(use.label);
    const name = target.type === 'fig' ? 'Figure' : target.type === 'tbl' ? 'Table' : 'Equation';
    return {
      ...use,
      replacement: `${name} ${target.number}`,
      title: target.title,
    };
  });

  return {
    targets: [...targets.values()],
    uses,
    resolved,
    unresolved,
  };
}

function buildCitationReport(manuscript, references, style) {
  const citationOrder = collectCitationOrder(manuscript);
  const { byKey, duplicates } = buildReferenceIndex(references);
  const missing = citationOrder.filter((key) => !byKey.has(key));
  const uncited = references.filter((reference) => !citationOrder.includes(reference.key)).map((reference) => reference.key);

  return {
    citationOrder,
    labels: Object.fromEntries(citationOrder.map((key) => [key, citationLabel(key, citationOrder, style)])),
    missing,
    duplicates,
    uncited,
    bibliography: buildBibliography(references, citationOrder, style),
  };
}

function buildPublicationPackage(manuscript, options = {}) {
  const style = STYLE_NAMES.has(options.style || manuscript.style) ? (options.style || manuscript.style) : 'nature';
  const references = loadReferences(manuscript);
  const citations = buildCitationReport(manuscript, references, style);
  const crossReferences = buildCrossReferenceReport(manuscript);
  const referencesWithoutDoi = references
    .filter((reference) => !reference.doi && reference.type !== 'dataset')
    .map((reference) => reference.key);
  const blockers = [
    ...citations.missing.map((key) => `Missing reference for citation key ${key}.`),
    ...citations.duplicates.map((key) => `Duplicate reference key ${key}.`),
    ...crossReferences.unresolved.map((use) => `Unresolved cross-reference ${use.marker} in ${use.sectionId}.`),
  ];
  const warnings = [
    ...referencesWithoutDoi.map((key) => `Reference ${key} is missing a DOI.`),
    ...citations.uncited.map((key) => `Reference ${key} is not cited in the manuscript.`),
  ];
  const digest = crypto.createHash('sha256').update(JSON.stringify({
    title: manuscript.title,
    style,
    citationOrder: citations.citationOrder,
    bibliography: citations.bibliography,
    crossReferences: crossReferences.resolved,
  })).digest('hex');

  return {
    title: manuscript.title,
    style,
    normalizedReferences: references,
    citations,
    crossReferences,
    exportPlan: {
      bibliographyStyle: style,
      publicationTemplate: options.template || manuscript.template || 'journal-manuscript',
      hasLatexBlocks: asArray(manuscript.sections).some((section) => /\$[^$]+\$|\\begin\{equation\}/.test(section.body || '')),
      hasCodeBlocks: asArray(manuscript.sections).some((section) => /```/.test(section.body || '')),
      digest,
    },
    readiness: {
      ready: blockers.length === 0,
      blockers,
      warnings,
    },
  };
}

module.exports = {
  buildBibliography,
  buildCitationReport,
  buildCrossReferenceReport,
  buildPublicationPackage,
  collectCitationOrder,
  extractCitationKeys,
  formatReference,
  loadReferences,
  normalizeDoi,
  normalizeReference,
  parseAuthors,
  parseBibtex,
};
