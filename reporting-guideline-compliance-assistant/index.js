import { citationLibrary } from "./sample-data.js"

const RULES = [
  {
    id: "consort-allocation",
    guideline: "CONSORT",
    appliesTo: ["clinical-trial"],
    section: "methods",
    severity: "high",
    terms: ["allocation", "conceal"],
    message: "Describe allocation concealment so readers can assess selection-bias risk.",
  },
  {
    id: "consort-flow",
    guideline: "CONSORT",
    appliesTo: ["clinical-trial"],
    section: "results",
    severity: "medium",
    terms: ["flow diagram", "participant flow", "screened", "excluded"],
    message: "Add participant flow counts or a flow diagram.",
  },
  {
    id: "prisma-search",
    guideline: "PRISMA",
    appliesTo: ["systematic-review"],
    section: "methods",
    severity: "high",
    terms: ["database", "search", "searched", "query", "date"],
    message: "Report complete search sources, dates, and query details.",
  },
  {
    id: "prisma-screening",
    guideline: "PRISMA",
    appliesTo: ["systematic-review"],
    section: "results",
    severity: "high",
    terms: ["screened", "excluded", "included", "records"],
    message: "Report screening counts for records identified, excluded, and included.",
  },
  {
    id: "strobe-setting",
    guideline: "STROBE",
    appliesTo: ["observational"],
    section: "methods",
    severity: "medium",
    terms: ["setting", "clinic", "hospital", "cohort", "eligibility"],
    message: "Describe setting, location, eligibility, and relevant dates.",
  },
  {
    id: "strobe-confounders",
    guideline: "STROBE",
    appliesTo: ["observational"],
    section: "methods",
    severity: "high",
    terms: ["confound", "adjusted", "covariate", "baseline"],
    message: "Define confounders and adjustment variables before interpreting associations.",
  },
  {
    id: "registration",
    guideline: "cross-guideline",
    appliesTo: ["clinical-trial", "systematic-review"],
    section: "methods",
    severity: "high",
    terms: ["registry", "registered", "nct", "prospero"],
    message: "Add a registry identifier or explain why registration was not applicable.",
  },
  {
    id: "data-availability",
    guideline: "cross-guideline",
    appliesTo: ["clinical-trial", "systematic-review", "observational"],
    section: "discussion",
    severity: "medium",
    terms: ["data availability", "code availability", "repository", "supplement"],
    message: "Add data and code availability language before submission.",
  },
]

const severityWeight = { high: 24, medium: 14, low: 8 }

const normalize = (value = "") => value.toLowerCase().replace(/\s+/g, " ")

const getSection = (manuscript, section) =>
  normalize(manuscript.sections?.[section] ?? "")

const appliesTo = (rule, manuscript) =>
  rule.appliesTo.includes(normalize(manuscript.studyDesign))

const termHits = (text, terms) =>
  terms.filter((term) => text.includes(normalize(term)))

const findCitation = (guideline) =>
  citationLibrary.find((citation) => citation.guideline === guideline) ??
  citationLibrary.find((citation) => citation.guideline === "STROBE")

export function formatCitation(citation, style = "APA") {
  if (style === "Nature") {
    return `${citation.authors}. ${citation.title}. (${citation.year}).`
  }

  return `${citation.authors} (${citation.year}). ${citation.title}. ${citation.url}`
}

export function analyzeReportingGuidelineCompliance(manuscript) {
  const findings = RULES.filter((rule) => appliesTo(rule, manuscript)).map(
    (rule) => {
      const text = getSection(manuscript, rule.section)
      const hits = termHits(text, rule.terms)
      const passed = hits.length > 0
      const citation =
        rule.guideline === "cross-guideline" ? null : findCitation(rule.guideline)

      return {
        id: rule.id,
        guideline: rule.guideline,
        section: rule.section,
        severity: rule.severity,
        status: passed ? "pass" : "fail",
        matchedTerms: hits,
        message: rule.message,
        reviewerAction: passed
          ? `Keep ${rule.section} language for ${rule.id} explicit.`
          : rule.message,
        citationRecommendation: citation
          ? {
              key: citation.key,
              guideline: citation.guideline,
              apa: formatCitation(citation, "APA"),
              nature: formatCitation(citation, "Nature"),
            }
          : null,
      }
    }
  )

  const failedFindings = findings.filter((finding) => finding.status === "fail")
  const penalty = failedFindings.reduce(
    (total, finding) => total + severityWeight[finding.severity],
    0
  )
  const readinessScore = Math.max(0, 100 - penalty)

  return {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    studyDesign: manuscript.studyDesign,
    readinessScore,
    readiness:
      readinessScore >= 85
        ? "ready"
        : readinessScore >= 65
          ? "needs-minor-revision"
          : "needs-guideline-rework",
    summaries: buildSummaries(manuscript, failedFindings, readinessScore),
    findings,
    citationRecommendations: dedupeCitations(
      failedFindings
        .map((finding) => finding.citationRecommendation)
        .filter(Boolean)
    ),
  }
}

export function analyzeBatch(manuscripts) {
  const packets = manuscripts.map(analyzeReportingGuidelineCompliance)
  const averageScore = Math.round(
    packets.reduce((total, packet) => total + packet.readinessScore, 0) /
      packets.length
  )

  return {
    generatedAt: new Date(0).toISOString(),
    averageScore,
    readyCount: packets.filter((packet) => packet.readiness === "ready").length,
    packets,
  }
}

function buildSummaries(manuscript, failedFindings, readinessScore) {
  const failures = failedFindings.map((finding) => finding.id).join(", ")
  return {
    abstract: `${manuscript.abstract} Reporting-guideline readiness score: ${readinessScore}/100.`,
    executive:
      failedFindings.length === 0
        ? "No blocking reporting-guideline gaps were detected in the synthetic review packet."
        : `The draft needs targeted reporting updates before submission: ${failures}.`,
    layperson:
      failedFindings.length === 0
        ? "The draft gives readers enough checklist detail to understand how the study was done."
        : "The draft is missing some checklist details that help readers trust how the study was planned, analyzed, and reported.",
  }
}

function dedupeCitations(citations) {
  return [...new Map(citations.map((citation) => [citation.key, citation])).values()]
}

export function renderMarkdownReport(batch) {
  const lines = [
    "# Reporting Guideline Compliance Packet",
    "",
    `Average readiness score: ${batch.averageScore}/100`,
    `Ready manuscripts: ${batch.readyCount}/${batch.packets.length}`,
    "",
  ]

  for (const packet of batch.packets) {
    lines.push(`## ${packet.title}`)
    lines.push("")
    lines.push(`- Study design: ${packet.studyDesign}`)
    lines.push(`- Readiness: ${packet.readiness}`)
    lines.push(`- Score: ${packet.readinessScore}/100`)
    lines.push(`- Executive summary: ${packet.summaries.executive}`)
    lines.push("")
    lines.push("### Reviewer Actions")

    for (const finding of packet.findings.filter((item) => item.status === "fail")) {
      lines.push(
        `- [${finding.severity}] ${finding.guideline}/${finding.id}: ${finding.reviewerAction}`
      )
    }

    if (packet.citationRecommendations.length > 0) {
      lines.push("")
      lines.push("### Citation Recommendations")
      for (const citation of packet.citationRecommendations) {
        lines.push(`- ${citation.apa}`)
      }
    }

    lines.push("")
  }

  return `${lines.join("\n").trim()}\n`
}

export function renderSvgSummary(batch) {
  const bars = batch.packets
    .map((packet, index) => {
      const y = 104 + index * 54
      const width = Math.max(18, Math.round(packet.readinessScore * 4.6))
      const color =
        packet.readinessScore >= 85
          ? "#15803d"
          : packet.readinessScore >= 65
            ? "#b45309"
            : "#b91c1c"
      return `<text x="32" y="${y - 10}" font-size="14">${escapeXml(packet.manuscriptId)} (${packet.readinessScore})</text><rect x="32" y="${y}" width="${width}" height="22" rx="3" fill="${color}"/>`
    })
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="300" viewBox="0 0 560 300">
  <rect width="560" height="300" fill="#f8fafc"/>
  <text x="32" y="42" font-size="22" font-family="Arial" font-weight="700" fill="#111827">Reporting Guideline Compliance</text>
  <text x="32" y="68" font-size="14" font-family="Arial" fill="#374151">Average readiness score: ${batch.averageScore}/100</text>
  <g font-family="Arial" fill="#111827">${bars}</g>
</svg>
`
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
