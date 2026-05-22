import { createHash } from "node:crypto"

const REQUIRED_DISCLOSURE_SECTIONS = [
  "funding",
  "competingInterests",
  "sponsorRole",
  "dataProviderRelationships",
]

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const tokenSet = (values) =>
  new Set(
    values
      .flatMap((value) => normalize(value).split(/\s+/))
      .filter((token) => token.length > 2),
  )

const intersects = (leftValues, rightValues) => {
  const left = tokenSet(leftValues)
  return [...tokenSet(rightValues)].some((token) => left.has(token))
}

const nameMatches = (leftValues, name) => {
  const normalizedName = normalize(name)
  if (!normalizedName) return false
  const nameTokens = normalizedName.split(/\s+/).filter((token) => token.length > 2)
  return leftValues.some((value) => {
    const normalizedValue = normalize(value)
    if (!normalizedValue) return false
    if (normalizedValue.includes(normalizedName) || normalizedName.includes(normalizedValue)) {
      return true
    }
    const valueTokens = new Set(normalizedValue.split(/\s+/).filter((token) => token.length > 2))
    return nameTokens.filter((token) => valueTokens.has(token)).length >= 2
  })
}

const unique = (values) => [...new Set(values.filter(Boolean))]

const cents = (amount) => Math.round(Number(amount ?? 0) * 100)

const digestFor = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")

export const dollarsFor = (valueInCents) =>
  (valueInCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const finding = ({ projectId, code, severity, message, evidence, action }) => ({
  projectId,
  code,
  severity,
  message,
  evidence,
  action,
})

const declaredFundingNames = (project) =>
  unique([
    ...(project.disclosures?.funding?.funders ?? []),
    ...(project.disclosures?.funding?.grantIds ?? []),
  ])

const authorDisclosureText = (author) =>
  [
    author.disclosures?.competingInterests,
    author.disclosures?.funding,
    author.disclosures?.employment,
  ].join(" ")

const funderNames = (project) => unique((project.funders ?? []).map((funder) => funder.name))

const sponsorFunders = (project) =>
  (project.funders ?? []).filter((funder) =>
    /sponsor|commercial|industry/i.test(`${funder.role ?? ""} ${funder.type ?? ""}`),
  )

const projectRelationships = (project) =>
  unique([
    ...funderNames(project),
    ...(project.datasets ?? []).map((dataset) => dataset.provider),
    ...(project.trialRegistry?.funders ?? []),
  ])

const disclosedRelationships = (project) =>
  unique([
    ...declaredFundingNames(project),
    project.disclosures?.sponsorRole,
    project.disclosures?.dataProviderRelationships,
  ])

export const evaluateProject = (project) => {
  const findings = []
  const projectId = project.id
  const disclosedFunding = declaredFundingNames(project)
  const disclosedRelationshipText = disclosedRelationships(project).join(" ")
  const relationshipNames = projectRelationships(project)

  for (const author of project.authors ?? []) {
    if (!author.disclosures?.competingInterests) {
      findings.push(
        finding({
          projectId,
          code: "missing_competing_interest_statement",
          severity: "critical",
          message: `${author.name} has no competing-interest statement.`,
          evidence: { authorId: author.id, authorName: author.name },
          action: "Add an explicit competing-interest statement before review packet release.",
        }),
      )
    }

    const affiliationNames = author.affiliations ?? []
    const authorText = authorDisclosureText(author)
    const overlappingRelationships = relationshipNames.filter((name) =>
      nameMatches(affiliationNames, name),
    )
    if (
      overlappingRelationships.length > 0 &&
      !overlappingRelationships.some((name) => nameMatches([authorText], name))
    ) {
      findings.push(
        finding({
          projectId,
          code: "author_relationship_not_disclosed",
          severity: "critical",
          message: `${author.name} has an affiliation that overlaps a funder or data provider without a matching disclosure.`,
          evidence: {
            authorId: author.id,
            affiliations: affiliationNames,
            relationships: overlappingRelationships,
          },
          action: "Add an author-level relationship disclosure or remove the conflicted author from the neutral review path.",
        }),
      )
    }
  }

  const undisclosedFunders = funderNames(project).filter(
    (name) => !intersects([name], disclosedFunding),
  )
  if (undisclosedFunders.length > 0) {
    findings.push(
      finding({
        projectId,
        code: "funding_source_missing_from_statement",
        severity: "critical",
        message: "One or more project funders are missing from the funding disclosure.",
        evidence: { undisclosedFunders, disclosedFunding },
        action: "Update funding disclosures to list every sponsor, grant, and commercial backer.",
      }),
    )
  }

  const sponsors = sponsorFunders(project)
  if (sponsors.length > 0 && !project.disclosures?.sponsorRole) {
    findings.push(
      finding({
        projectId,
        code: "sponsor_role_missing",
        severity: "critical",
        message: "Commercial or sponsor funders are present but sponsor role is not described.",
        evidence: { sponsors: sponsors.map((sponsor) => sponsor.name) },
        action: "State whether sponsors influenced study design, analysis, publication, or data access.",
      }),
    )
  }

  const registryFunders = project.trialRegistry?.funders ?? []
  if (registryFunders.length > 0 && !registryFunders.every((name) => intersects([name], disclosedFunding))) {
    findings.push(
      finding({
        projectId,
        code: "trial_registry_funding_mismatch",
        severity: "critical",
        message: "Trial registry funding does not match the manuscript funding statement.",
        evidence: { registryId: project.trialRegistry?.id, registryFunders, disclosedFunding },
        action: "Reconcile registry and manuscript funding before the peer-review packet is shown.",
      }),
    )
  }

  const missingProviderDisclosure = (project.datasets ?? []).filter(
    (dataset) =>
      dataset.provider &&
      /private|restricted|sponsored/i.test(`${dataset.access ?? ""} ${dataset.terms ?? ""}`) &&
      !intersects([dataset.provider], [disclosedRelationshipText]),
  )
  if (missingProviderDisclosure.length > 0) {
    findings.push(
      finding({
        projectId,
        code: "data_provider_relationship_missing",
        severity: "warning",
        message: "Restricted or sponsored data providers are not fully disclosed.",
        evidence: { providers: missingProviderDisclosure.map((dataset) => dataset.provider) },
        action: "Add data-provider relationship and access-term notes to the reviewer packet.",
      }),
    )
  }

  const riskyCitations = (project.citations ?? []).filter(
    (citation) =>
      citation.usedFor === "primary_support" &&
      (intersects(citation.funders ?? [], funderNames(project)) ||
        intersects(citation.authorAffiliations ?? [], project.authors?.flatMap((author) => author.affiliations ?? []) ?? [])) &&
      !/self|related|sponsor|competing|conflict/i.test(citation.context ?? ""),
  )
  if (riskyCitations.length > 0) {
    findings.push(
      finding({
        projectId,
        code: "citation_relationship_context_missing",
        severity: "warning",
        message: "Primary support citations have funder or affiliation overlap without context.",
        evidence: { citations: riskyCitations.map((citation) => citation.id) },
        action: "Add citation-context notes so reviewers can see related-party support.",
      }),
    )
  }

  const missingSections = REQUIRED_DISCLOSURE_SECTIONS.filter(
    (section) => !project.disclosures?.[section],
  )
  if (missingSections.length > 0) {
    findings.push(
      finding({
        projectId,
        code: "reviewer_disclosure_packet_incomplete",
        severity: "warning",
        message: "The reviewer disclosure packet is missing required sections.",
        evidence: { missingSections },
        action: "Fill all required disclosure sections before sending the assistant packet to reviewers.",
      }),
    )
  }

  const critical = findings.filter((item) => item.severity === "critical").length
  const warnings = findings.filter((item) => item.severity === "warning").length
  return {
    projectId,
    title: project.title,
    status: critical > 0 ? "hold_disclosure_review" : warnings > 0 ? "revise_disclosures" : "ready_for_review",
    severityCounts: { critical, warning: warnings },
    disclosureConfidence: Math.max(0, 100 - critical * 18 - warnings * 7),
    findings,
    revisionTasks: findings.map((item, index) => ({
      id: `${projectId}-task-${index + 1}`,
      code: item.code,
      severity: item.severity,
      action: item.action,
    })),
  }
}

export const evaluateDisclosureConsistency = (projects) => {
  const projectResults = projects.map(evaluateProject)
  const allFindings = projectResults.flatMap((project) => project.findings)
  const criticalFindings = allFindings.filter((item) => item.severity === "critical")
  const warningFindings = allFindings.filter((item) => item.severity === "warning")
  const heldProjects = projectResults.filter((project) => project.status === "hold_disclosure_review")
  const readyProjects = projectResults.filter((project) => project.status === "ready_for_review")
  const reviseProjects = projectResults.filter((project) => project.status === "revise_disclosures")
  const affectedAuthors = unique(
    projects.flatMap((project) =>
      (project.authors ?? [])
        .filter((author) => allFindings.some((item) => item.evidence?.authorId === author.id))
        .map((author) => author.name),
    ),
  )
  const undisclosedFundingCents = projects.reduce(
    (total, project) =>
      total +
      (project.funders ?? [])
        .filter((funder) => !intersects([funder.name], declaredFundingNames(project)))
        .reduce((sum, funder) => sum + cents(funder.amountUsd), 0),
    0,
  )

  const summary = {
    status: heldProjects.length > 0 ? "hold_disclosure_review" : reviseProjects.length > 0 ? "revise_disclosures" : "ready_for_review",
    projectsReviewed: projects.length,
    heldProjects: heldProjects.length,
    readyProjects: readyProjects.length,
    reviseProjects: reviseProjects.length,
    affectedAuthors: affectedAuthors.length,
    undisclosedFundingCents,
    criticalFindings: criticalFindings.length,
    warningFindings: warningFindings.length,
  }

  return {
    summary,
    projectResults,
    reviewerActions: allFindings.map((item) => ({
      projectId: item.projectId,
      severity: item.severity,
      code: item.code,
      action: item.action,
    })),
    auditDigest: digestFor({ summary, projectResults }),
  }
}

export const buildMarkdownPacket = (evaluation) => {
  const lines = [
    "# Conflict and Funding Disclosure Review Packet",
    "",
    `Status: ${evaluation.summary.status}`,
    `Projects reviewed: ${evaluation.summary.projectsReviewed}`,
    `Held projects: ${evaluation.summary.heldProjects}`,
    `Ready projects: ${evaluation.summary.readyProjects}`,
    `Affected authors: ${evaluation.summary.affectedAuthors}`,
    `Undisclosed funding: $${dollarsFor(evaluation.summary.undisclosedFundingCents)}`,
    `Critical findings: ${evaluation.summary.criticalFindings}`,
    `Warnings: ${evaluation.summary.warningFindings}`,
    `Audit digest: ${evaluation.auditDigest}`,
    "",
    "## Reviewer Actions",
    "",
    ...evaluation.reviewerActions.map(
      (action) => `- [${action.severity}] ${action.projectId} ${action.code}: ${action.action}`,
    ),
  ]
  return `${lines.join("\n")}\n`
}

export const buildSvgSummary = (evaluation) => {
  const { summary } = evaluation
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#101820"/>
  <rect x="72" y="72" width="1136" height="576" rx="24" fill="#f7f3e8"/>
  <text x="112" y="148" fill="#101820" font-family="Arial, sans-serif" font-size="44" font-weight="700">Conflict Disclosure Consistency Assistant</text>
  <text x="112" y="212" fill="#31525b" font-family="Arial, sans-serif" font-size="26">Status: ${summary.status}</text>
  <g font-family="Arial, sans-serif" font-size="30" fill="#101820">
    <text x="112" y="304">Projects reviewed: ${summary.projectsReviewed}</text>
    <text x="112" y="360">Held projects: ${summary.heldProjects}</text>
    <text x="112" y="416">Ready projects: ${summary.readyProjects}</text>
    <text x="112" y="472">Critical findings: ${summary.criticalFindings}</text>
    <text x="112" y="528">Undisclosed funding: $${dollarsFor(summary.undisclosedFundingCents)}</text>
  </g>
  <rect x="760" y="250" width="330" height="220" rx="18" fill="#e84a5f"/>
  <text x="796" y="340" fill="#ffffff" font-family="Arial, sans-serif" font-size="72" font-weight="700">${summary.criticalFindings}</text>
  <text x="796" y="396" fill="#ffffff" font-family="Arial, sans-serif" font-size="26">critical disclosure blockers</text>
</svg>
`
}
