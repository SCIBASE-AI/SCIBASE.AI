const GUIDELINES = {
  clinical_trial: {
    id: "CONSORT",
    label: "CONSORT clinical trial reporting readiness",
    requiredItems: [
      {
        id: "consort-randomization",
        label: "Randomization method",
        keywords: ["randomized", "randomisation", "randomization", "randomly assigned"],
        severity: "medium",
      },
      {
        id: "consort-participant-flow",
        label: "Participant flow diagram or accounting",
        keywords: ["participant flow", "flow diagram", "screened", "enrolled", "lost to follow-up"],
        severity: "high",
      },
      {
        id: "consort-sample-size",
        label: "Sample-size rationale",
        keywords: ["sample size", "power calculation", "powered to detect", "effect size"],
        severity: "high",
      },
      {
        id: "consort-harms",
        label: "Harms or adverse-event reporting",
        keywords: ["harms", "adverse event", "safety outcome", "side effect"],
        severity: "medium",
      },
      {
        id: "consort-registration",
        label: "Trial registration or protocol",
        keywords: ["trial registration", "clinicaltrials", "preregistered", "protocol"],
        severity: "medium",
      },
    ],
  },
  systematic_review: {
    id: "PRISMA",
    label: "PRISMA systematic review reporting readiness",
    requiredItems: [
      {
        id: "prisma-search",
        label: "Search strategy",
        keywords: ["search strategy", "searched", "boolean", "database", "pubmed", "arxiv"],
        severity: "high",
      },
      {
        id: "prisma-eligibility",
        label: "Eligibility criteria",
        keywords: ["inclusion criteria", "exclusion criteria", "eligibility", "screened"],
        severity: "high",
      },
      {
        id: "prisma-flow",
        label: "Study selection flow",
        keywords: ["prisma flow", "flow diagram", "records", "included studies", "full-text"],
        severity: "medium",
      },
      {
        id: "prisma-bias",
        label: "Risk-of-bias assessment",
        keywords: ["risk of bias", "bias assessment", "quality assessment"],
        severity: "medium",
      },
      {
        id: "prisma-synthesis",
        label: "Synthesis method",
        keywords: ["synthesis", "meta-analysis", "narrative synthesis", "effect estimate"],
        severity: "medium",
      },
    ],
  },
  animal_study: {
    id: "ARRIVE",
    label: "ARRIVE animal research reporting readiness",
    requiredItems: [
      {
        id: "arrive-randomization",
        label: "Randomization and allocation",
        keywords: ["randomized", "randomly assigned", "allocation"],
        severity: "high",
      },
      {
        id: "arrive-blinding",
        label: "Blinding",
        keywords: ["blinded", "blinding", "masked assessor"],
        severity: "high",
      },
      {
        id: "arrive-sample-size",
        label: "Sample-size rationale",
        keywords: ["sample size", "power", "n =", "effect size"],
        severity: "high",
      },
      {
        id: "arrive-animal-details",
        label: "Animal strain, sex, and housing",
        keywords: ["strain", "sex", "housing", "cage", "mice", "rats"],
        severity: "medium",
      },
      {
        id: "arrive-exclusions",
        label: "Exclusion and attrition criteria",
        keywords: ["exclusion", "excluded", "attrition", "humane endpoint"],
        severity: "medium",
      },
    ],
  },
  generic: {
    id: "SCI-READY",
    label: "General scientific reporting readiness",
    requiredItems: [
      {
        id: "generic-claim-evidence",
        label: "Claim-to-evidence alignment",
        keywords: ["evidence", "supports", "results show", "finding"],
        severity: "high",
      },
      {
        id: "generic-data",
        label: "Data availability statement",
        keywords: ["data availability", "dataset", "raw data", "repository"],
        severity: "high",
      },
      {
        id: "generic-methods",
        label: "Methods detail",
        keywords: ["methods", "protocol", "procedure", "analysis"],
        severity: "medium",
      },
      {
        id: "generic-limitations",
        label: "Limitations",
        keywords: ["limitation", "future work", "uncertainty"],
        severity: "medium",
      },
    ],
  },
}

function normalizeText(value) {
  if (!value) {
    return ""
  }

  if (Array.isArray(value)) {
    return value.map(normalizeText).join(" ")
  }

  if (typeof value === "object") {
    return Object.values(value).map(normalizeText).join(" ")
  }

  return String(value).toLowerCase()
}

function selectGuideline(studyType = "generic") {
  return GUIDELINES[studyType] || GUIDELINES.generic
}

function hasKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()))
}

function scoreGuideline(guideline, manuscriptText) {
  const findings = guideline.requiredItems.map((item) => {
    const present = hasKeyword(manuscriptText, item.keywords)

    return {
      id: item.id,
      guideline: guideline.id,
      label: item.label,
      status: present ? "present" : "missing",
      severity: present ? "none" : item.severity,
      evidence: present
        ? `Detected reporting evidence for ${item.label}.`
        : `No clear ${guideline.id} evidence found for ${item.label}.`,
      recommendedAction: present
        ? "Keep this evidence traceable in the final reviewer packet."
        : `Add reporting evidence for ${item.label}.`,
    }
  })

  const severityWeight = {
    high: 18,
    medium: 11,
    none: 0,
  }
  const penalty = findings.reduce((total, finding) => total + severityWeight[finding.severity], 0)

  return {
    score: Math.max(0, 100 - penalty),
    findings,
  }
}

function evaluateReproducibility(artifacts = {}) {
  const checks = [
    ["dataset", "Dataset or screening evidence is attached."],
    ["analysisCode", "Analysis code or notebook is attached."],
    ["environment", "Execution environment definition is attached."],
    ["protocol", "Protocol or preregistration evidence is attached."],
  ]

  const present = []
  const missing = []
  const details = checks.map(([key, label]) => {
    const hasArtifact = Boolean(artifacts[key])
    if (hasArtifact) {
      present.push(key)
    } else {
      missing.push(key)
    }

    return {
      id: key,
      status: hasArtifact ? "present" : "missing",
      label,
    }
  })

  return {
    score: Math.round((present.length / checks.length) * 100),
    present,
    missing,
    details,
  }
}

function buildResearchGapSignals(findings, reproducibility) {
  const missingFindings = findings.filter((finding) => finding.status === "missing")
  const reportingSignals = missingFindings.slice(0, 4).map((finding) => ({
    id: `gap-${finding.id}`,
    sourceFinding: finding.id,
    type: "reporting_gap",
    priority: finding.severity === "high" ? "high" : "medium",
    recommendedAction: finding.recommendedAction,
  }))

  const reproducibilitySignals = reproducibility.missing.map((missingArtifact) => ({
    id: `gap-repro-${missingArtifact}`,
    sourceFinding: missingArtifact,
    type: "reproducibility_gap",
    priority: missingArtifact === "environment" ? "medium" : "high",
    recommendedAction: `Attach or document ${missingArtifact} before public release.`,
  }))

  return [...reportingSignals, ...reproducibilitySignals]
}

function buildReadiness(scores, findings) {
  const highSeverityMissing = findings.filter(
    (finding) => finding.status === "missing" && finding.severity === "high",
  ).length
  const average = Math.round((scores.guideline + scores.reproducibility) / 2)

  if (highSeverityMissing > 0 || scores.reproducibility < 75) {
    return {
      gate: "hold_for_revision",
      score: average,
      reason: "High-severity reporting or reproducibility evidence is missing.",
    }
  }

  if (average < 90) {
    return {
      gate: "ready_with_minor_revisions",
      score: average,
      reason: "Only medium-severity reviewer actions remain.",
    }
  }

  return {
    gate: "ready_for_review",
    score: average,
    reason: "Guideline and reproducibility evidence are ready for reviewer handoff.",
  }
}

function buildReviewerPacket(guideline, findings, reproducibility, gapSignals, readiness) {
  const revisionActions = [
    ...findings
      .filter((finding) => finding.status === "missing")
      .map((finding) => finding.recommendedAction),
    ...reproducibility.missing.map(
      (missingArtifact) => `Provide ${missingArtifact} to improve reproducibility confidence.`,
    ),
  ]

  return {
    summary: `${guideline.id} reporting audit finished with ${readiness.gate}.`,
    topFindings: findings
      .filter((finding) => finding.status === "missing")
      .slice(0, 5)
      .map((finding) => ({
        id: finding.id,
        label: finding.label,
        severity: finding.severity,
      })),
    revisionActions,
    researchOpportunities: gapSignals.slice(0, 5),
  }
}

function auditResearchPackage(input = {}) {
  const guideline = selectGuideline(input.studyType)
  const manuscriptText = normalizeText(input.manuscript)
  const guidelineAudit = scoreGuideline(guideline, manuscriptText)
  const reproducibility = evaluateReproducibility(input.artifacts)
  const scores = {
    guideline: guidelineAudit.score,
    reproducibility: reproducibility.score,
  }
  const researchGapSignals = buildResearchGapSignals(guidelineAudit.findings, reproducibility)
  const readiness = buildReadiness(scores, guidelineAudit.findings)

  return {
    guideline: {
      id: guideline.id,
      label: guideline.label,
    },
    scores,
    readiness,
    peerReviewFindings: guidelineAudit.findings,
    reproducibility,
    researchGapSignals,
    reviewerPacket: buildReviewerPacket(
      guideline,
      guidelineAudit.findings,
      reproducibility,
      researchGapSignals,
      readiness,
    ),
  }
}

module.exports = {
  GUIDELINES,
  auditResearchPackage,
  selectGuideline,
}
