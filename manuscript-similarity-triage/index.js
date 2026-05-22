import { createHash } from "node:crypto"

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "were",
  "was",
  "are",
  "into",
  "using",
  "than",
  "then",
  "have",
  "has",
  "had",
  "their",
  "they",
  "our",
  "can",
  "not",
  "but",
  "all",
  "each",
])

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const tokensFor = (text) =>
  normalize(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))

const unique = (values) => [...new Set(values.filter(Boolean))]

const digestFor = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")

const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const shinglesFor = (tokens, size = 5) => {
  const shingles = []
  for (let index = 0; index <= tokens.length - size; index += 1) {
    shingles.push(tokens.slice(index, index + size).join(" "))
  }
  return shingles
}

const jaccard = (leftValues, rightValues) => {
  const left = new Set(leftValues)
  const right = new Set(rightValues)
  if (left.size === 0 || right.size === 0) return 0
  const intersection = [...left].filter((value) => right.has(value)).length
  return intersection / (left.size + right.size - intersection)
}

const longestTokenRun = (leftTokens, rightTokens) => {
  const previous = new Array(rightTokens.length + 1).fill(0)
  let longest = 0

  for (let leftIndex = 1; leftIndex <= leftTokens.length; leftIndex += 1) {
    const current = new Array(rightTokens.length + 1).fill(0)
    for (let rightIndex = 1; rightIndex <= rightTokens.length; rightIndex += 1) {
      if (leftTokens[leftIndex - 1] !== rightTokens[rightIndex - 1]) continue
      current[rightIndex] = previous[rightIndex - 1] + 1
      longest = Math.max(longest, current[rightIndex])
    }
    previous.splice(0, previous.length, ...current)
  }

  return longest
}

const isCited = (passage, source) => {
  const citations = new Set((passage.citations ?? []).map((citation) => normalize(citation)))
  return [source.id, source.doi, source.title]
    .filter(Boolean)
    .some((value) => citations.has(normalize(value)))
}

const isMethodsBoilerplate = (passage, source) =>
  normalize(passage.section).includes("method") &&
  /protocol|standard operating procedure|template/i.test(`${source.type ?? ""} ${source.title ?? ""}`)

const finding = ({ passageId, sourceId, code, severity, message, evidence, action }) => ({
  passageId,
  sourceId,
  code,
  severity,
  message,
  evidence,
  action,
})

const comparePassageToSource = (passage, source) => {
  const passageTokens = tokensFor(passage.text)
  const sourceTokens = tokensFor(source.text)
  const shingleScore = jaccard(shinglesFor(passageTokens), shinglesFor(sourceTokens))
  const tokenOverlap = jaccard(passageTokens, sourceTokens)
  const longestRun = longestTokenRun(passageTokens, sourceTokens)
  const score = Number(
    Math.max(shingleScore, tokenOverlap * 0.72, longestRun >= 10 ? 0.55 : longestRun / 20).toFixed(3),
  )

  return {
    sourceId: source.id,
    sourceTitle: source.title,
    score,
    shingleScore: Number(shingleScore.toFixed(3)),
    tokenOverlap: Number(tokenOverlap.toFixed(3)),
    longestRun,
    cited: isCited(passage, source),
    relationship: source.relationship ?? "external",
    sourceType: source.type ?? "literature",
    retracted: source.retracted === true,
    methodsBoilerplate: isMethodsBoilerplate(passage, source),
  }
}

const evaluatePassage = (manuscript, passage, sources) => {
  const matches = sources
    .map((source) => ({
      source,
      comparison: comparePassageToSource(passage, source),
    }))
    .filter(({ comparison }) => comparison.score >= 0.18 || comparison.longestRun >= 7)
    .sort((left, right) => right.comparison.score - left.comparison.score)

  const findings = []
  const acceptedBoilerplate = []

  for (const { source, comparison } of matches) {
    const highSimilarity = comparison.score >= 0.34 || comparison.longestRun >= 10
    const moderateSimilarity = comparison.score >= 0.18 || comparison.longestRun >= 7

    if (comparison.retracted && moderateSimilarity) {
      findings.push(
        finding({
          passageId: passage.id,
          sourceId: source.id,
          code: "retracted_source_similarity",
          severity: "critical",
          message: "Draft passage closely overlaps a retracted or invalidated source.",
          evidence: {
            score: comparison.score,
            longestRun: comparison.longestRun,
            sourceTitle: source.title,
            retractionNotice: source.retractionNotice,
          },
          action: "Hold the passage for rewrite and require a current replacement citation.",
        }),
      )
      continue
    }

    if (comparison.methodsBoilerplate && comparison.cited) {
      acceptedBoilerplate.push({
        sourceId: source.id,
        sourceTitle: source.title,
        score: comparison.score,
        reason: "cited_methods_protocol_overlap",
      })
      continue
    }

    if (highSimilarity && !comparison.cited && comparison.relationship !== "self") {
      findings.push(
        finding({
          passageId: passage.id,
          sourceId: source.id,
          code: "uncited_high_similarity",
          severity: "critical",
          message: "Draft passage has high source overlap without a citation.",
          evidence: {
            score: comparison.score,
            longestRun: comparison.longestRun,
            sourceTitle: source.title,
          },
          action: "Add attribution and rewrite the overlapping passage before sharing or submission.",
        }),
      )
      continue
    }

    if (
      highSimilarity &&
      comparison.relationship === "self" &&
      manuscript.reuseDisclosure !== true
    ) {
      findings.push(
        finding({
          passageId: passage.id,
          sourceId: source.id,
          code: "self_overlap_disclosure_missing",
          severity: "warning",
          message: "Draft passage substantially reuses prior author text without a reuse disclosure.",
          evidence: {
            score: comparison.score,
            longestRun: comparison.longestRun,
            sourceTitle: source.title,
          },
          action: "Add a self-overlap disclosure or rewrite the reused passage for the new manuscript.",
        }),
      )
      continue
    }

    if (highSimilarity && comparison.cited) {
      findings.push(
        finding({
          passageId: passage.id,
          sourceId: source.id,
          code: "close_paraphrase_needs_rewrite",
          severity: "warning",
          message: "Draft passage cites the source but remains too close to source wording.",
          evidence: {
            score: comparison.score,
            longestRun: comparison.longestRun,
            sourceTitle: source.title,
          },
          action: "Rewrite the passage or quote it explicitly according to journal policy.",
        }),
      )
    }
  }

  const topMatches = matches.slice(0, 3).map(({ comparison }) => comparison)
  const status = findings.some((item) => item.severity === "critical")
    ? "hold"
    : findings.length > 0
      ? "revise"
      : "clear"

  return {
    passageId: passage.id,
    section: passage.section,
    status,
    topMatches,
    acceptedBoilerplate,
    findings,
  }
}

export const evaluateSimilarityTriage = ({ manuscript, sources }) => {
  const passageResults = (manuscript.passages ?? []).map((passage) =>
    evaluatePassage(manuscript, passage, sources ?? []),
  )
  const reviewerActions = passageResults
    .flatMap((passage) => passage.findings)
    .sort((left, right) => {
      if (left.severity !== right.severity) return left.severity === "critical" ? -1 : 1
      return `${left.passageId}:${left.code}`.localeCompare(`${right.passageId}:${right.code}`)
    })

  const acceptedBoilerplate = passageResults.flatMap((passage) => passage.acceptedBoilerplate)
  const citedSources = unique(
    (manuscript.passages ?? []).flatMap((passage) => passage.citations ?? []),
  )

  const summary = {
    status: reviewerActions.some((item) => item.severity === "critical")
      ? "hold_similarity_review"
      : reviewerActions.length > 0
        ? "revise_similarity_review"
        : "clear_similarity_review",
    manuscriptId: manuscript.id,
    passagesReviewed: manuscript.passages?.length ?? 0,
    sourcesCompared: sources?.length ?? 0,
    citedSources: citedSources.length,
    heldPassages: passageResults.filter((passage) => passage.status === "hold").length,
    revisePassages: passageResults.filter((passage) => passage.status === "revise").length,
    clearPassages: passageResults.filter((passage) => passage.status === "clear").length,
    acceptedMethodsBoilerplate: acceptedBoilerplate.length,
    criticalFindings: reviewerActions.filter((item) => item.severity === "critical").length,
    warningFindings: reviewerActions.filter((item) => item.severity === "warning").length,
  }

  return {
    summary,
    passages: passageResults,
    reviewerActions,
    acceptedBoilerplate,
    auditDigest: digestFor({ summary, passageResults, reviewerActions, acceptedBoilerplate }),
  }
}

export const buildMarkdownPacket = (evaluation) => {
  const lines = [
    "# Manuscript Similarity Triage Packet",
    "",
    `Overall status: ${evaluation.summary.status}`,
    `Audit digest: ${evaluation.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Manuscript ID: ${evaluation.summary.manuscriptId}`,
    `- Passages reviewed: ${evaluation.summary.passagesReviewed}`,
    `- Sources compared: ${evaluation.summary.sourcesCompared}`,
    `- Held passages: ${evaluation.summary.heldPassages}`,
    `- Revise passages: ${evaluation.summary.revisePassages}`,
    `- Clear passages: ${evaluation.summary.clearPassages}`,
    `- Accepted methods boilerplate: ${evaluation.summary.acceptedMethodsBoilerplate}`,
    `- Critical findings: ${evaluation.summary.criticalFindings}`,
    `- Warning findings: ${evaluation.summary.warningFindings}`,
    "",
    "## Reviewer Actions",
    "",
    "| Severity | Passage | Source | Code | Action |",
    "| --- | --- | --- | --- | --- |",
    ...evaluation.reviewerActions.map(
      (action) =>
        `| ${action.severity} | ${action.passageId} | ${action.sourceId} | ${action.code} | ${action.action} |`,
    ),
    "",
    "## Accepted Boilerplate",
    "",
    "| Source | Reason | Score |",
    "| --- | --- | ---: |",
    ...evaluation.acceptedBoilerplate.map(
      (item) => `| ${item.sourceTitle} | ${item.reason} | ${item.score} |`,
    ),
  ]

  return `${lines.join("\n")}\n`
}

export const buildSvgSummary = (evaluation) => {
  const { summary } = evaluation
  const statusColor =
    summary.status === "clear_similarity_review"
      ? "#207a4c"
      : summary.status === "revise_similarity_review"
        ? "#9a6400"
        : "#9f2f2f"
  const rows = [
    ["Passages", summary.passagesReviewed],
    ["Held", summary.heldPassages],
    ["Revise", summary.revisePassages],
    ["Clear", summary.clearPassages],
    ["Critical", summary.criticalFindings],
    ["Warnings", summary.warningFindings],
  ]

  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="520" viewBox="0 0 920 520" role="img" aria-labelledby="title desc">
  <title id="title">Manuscript similarity triage summary</title>
  <desc id="desc">Summary of source-overlap findings for a manuscript peer-review aid.</desc>
  <rect width="920" height="520" fill="#f2f6f8"/>
  <rect x="40" y="40" width="840" height="440" rx="8" fill="#ffffff" stroke="#24292f" stroke-width="2"/>
  <text x="80" y="105" fill="#24292f" font-size="31" font-family="Arial, sans-serif" font-weight="700">Manuscript similarity triage</text>
  <text x="80" y="145" fill="${statusColor}" font-size="22" font-family="Arial, sans-serif" font-weight="700">${xmlEscape(summary.status)}</text>
  ${rows
    .map((row, index) => {
      const x = 80 + (index % 3) * 265
      const y = 215 + Math.floor(index / 3) * 130
      return `<rect x="${x}" y="${y - 46}" width="210" height="92" rx="6" fill="#f8fafc" stroke="#d0d7de"/>
  <text x="${x + 20}" y="${y - 10}" fill="#57606a" font-size="17" font-family="Arial, sans-serif">${xmlEscape(row[0])}</text>
  <text x="${x + 20}" y="${y + 28}" fill="#24292f" font-size="35" font-family="Arial, sans-serif" font-weight="700">${xmlEscape(row[1])}</text>`
    })
    .join("\n  ")}
  <text x="80" y="438" fill="#57606a" font-size="15" font-family="Arial, sans-serif">Audit digest: ${xmlEscape(evaluation.auditDigest.slice(0, 24))}</text>
</svg>
`
}
