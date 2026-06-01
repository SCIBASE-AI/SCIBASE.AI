const HIGH = "high";
const MEDIUM = "medium";
const LOW = "low";

const REQUIRED_CONTRIBUTIONS = new Set([
  "Conceptualization",
  "Methodology",
  "Software",
  "Validation",
  "Formal analysis",
  "Data curation",
  "Writing - original draft",
  "Writing - review and editing",
]);

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function asArray(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value;
}

function normalizePacket(raw) {
  return {
    manuscriptId: requireString(raw.manuscriptId, "manuscriptId"),
    title: requireString(raw.title, "title"),
    fundingStatement: {
      funders: asArray(raw.fundingStatement?.funders || [], "fundingStatement.funders").map(String),
      grantIds: asArray(raw.fundingStatement?.grantIds || [], "fundingStatement.grantIds").map(String),
      sponsorRole: String(raw.fundingStatement?.sponsorRole || "").trim(),
    },
    competingInterests: asArray(raw.competingInterests || [], "competingInterests").map((item) => ({
      authorId: requireString(item.authorId, "competingInterests.authorId"),
      statement: String(item.statement || "").trim(),
    })),
    acknowledgements: asArray(raw.acknowledgements || [], "acknowledgements").map(String),
    authors: asArray(raw.authors || [], "authors").map((author) => ({
      id: requireString(author.id, "author.id"),
      name: requireString(author.name, "author.name"),
      corresponding: Boolean(author.corresponding),
      contributions: asArray(author.contributions || [], "author.contributions").map(String),
      affiliations: asArray(author.affiliations || [], "author.affiliations").map(String),
      industryRelationships: asArray(author.industryRelationships || [], "author.industryRelationships").map(String),
    })),
  };
}

function finding(code, severity, message, remediation, subject = "manuscript") {
  return { code, severity, subject, message, remediation };
}

function hasNoConflictStatement(statement) {
  return /no competing|none declared|no conflict/i.test(statement);
}

function relationshipDisclosed(relationship, statement) {
  return statement.toLowerCase().includes(relationship.toLowerCase());
}

function assessResearchDisclosures(rawPacket) {
  const packet = normalizePacket(rawPacket);
  const findings = [];
  const disclosures = new Map(packet.competingInterests.map((item) => [item.authorId, item.statement]));
  const authorIds = new Set(packet.authors.map((author) => author.id));
  const acknowledgementText = packet.acknowledgements.join(" ").toLowerCase();

  if (packet.fundingStatement.funders.length === 0) {
    findings.push(
      finding(
        "MISSING_FUNDER_STATEMENT",
        HIGH,
        "No funder is listed for the manuscript.",
        "Add an explicit funding or no-funding statement before AI peer-review output is trusted."
      )
    );
  }

  if (packet.fundingStatement.funders.length > 0 && packet.fundingStatement.grantIds.length === 0) {
    findings.push(
      finding(
        "MISSING_GRANT_IDENTIFIERS",
        MEDIUM,
        "Funding is declared without grant, award, or contract identifiers.",
        "Add grant identifiers or document why the funder did not issue one."
      )
    );
  }

  if (packet.fundingStatement.funders.length > 0 && !packet.fundingStatement.sponsorRole) {
    findings.push(
      finding(
        "SPONSOR_ROLE_UNCLEAR",
        HIGH,
        "Sponsor role in study design, analysis, writing, or publication decision is not stated.",
        "State the sponsor role explicitly, including whether the funder reviewed or influenced the manuscript."
      )
    );
  }

  for (const author of packet.authors) {
    const statement = disclosures.get(author.id) || "";
    if (!statement) {
      findings.push(
        finding(
          "MISSING_COMPETING_INTEREST",
          HIGH,
          `${author.name} has no competing-interest statement.`,
          "Add a competing-interest declaration for every listed author.",
          author.id
        )
      );
    }

    for (const relationship of author.industryRelationships) {
      if (hasNoConflictStatement(statement) || !relationshipDisclosed(relationship, statement)) {
        findings.push(
          finding(
            "UNDISCLOSED_INDUSTRY_RELATIONSHIP",
            HIGH,
            `${author.name} lists an industry relationship with ${relationship}, but the conflict statement does not disclose it.`,
            "Revise the competing-interest declaration or remove/justify the relationship record.",
            author.id
          )
        );
      }
    }

    if (author.contributions.length === 0) {
      findings.push(
        finding(
          "MISSING_AUTHOR_CONTRIBUTIONS",
          MEDIUM,
          `${author.name} has no CRediT-style contributions listed.`,
          "Add at least one contributor role for every author before reviewer packets are released.",
          author.id
        )
      );
    }

    const unrecognized = author.contributions.filter((role) => !REQUIRED_CONTRIBUTIONS.has(role));
    if (unrecognized.length > 0) {
      findings.push(
        finding(
          "UNRECOGNIZED_CONTRIBUTION_ROLE",
          LOW,
          `${author.name} has non-standard contribution roles: ${unrecognized.join(", ")}.`,
          "Map non-standard roles to the configured contribution taxonomy or document the extension.",
          author.id
        )
      );
    }
  }

  for (const disclosure of packet.competingInterests) {
    if (!authorIds.has(disclosure.authorId)) {
      findings.push(
        finding(
          "ORPHAN_COMPETING_INTEREST",
          MEDIUM,
          `Competing-interest statement references unknown author ${disclosure.authorId}.`,
          "Retarget or remove orphan disclosure records before export.",
          disclosure.authorId
        )
      );
    }
  }

  for (const funder of packet.fundingStatement.funders) {
    const namedInAcknowledgements = acknowledgementText.includes(funder.toLowerCase());
    if (namedInAcknowledgements && !packet.fundingStatement.sponsorRole) {
      findings.push(
        finding(
          "ACKNOWLEDGED_SPONSOR_ROLE_MISMATCH",
          MEDIUM,
          `${funder} is acknowledged in the manuscript but sponsor role is absent from the funding statement.`,
          "Reconcile acknowledgements with funding and sponsor-role disclosures."
        )
      );
    }
  }

  const hasCorrespondingAuthor = packet.authors.some((author) => author.corresponding);
  if (!hasCorrespondingAuthor) {
    findings.push(
      finding(
        "MISSING_CORRESPONDING_AUTHOR",
        HIGH,
        "No corresponding author is marked for accountability and disclosure follow-up.",
        "Mark one or more corresponding authors before submission or AI-generated review packets proceed."
      )
    );
  }

  const high = findings.filter((item) => item.severity === HIGH).length;
  const medium = findings.filter((item) => item.severity === MEDIUM).length;
  const decision = high > 0 ? "hold" : medium > 0 ? "revise" : "release";

  return {
    manuscriptId: packet.manuscriptId,
    title: packet.title,
    decision,
    summary: {
      authorsReviewed: packet.authors.length,
      fundersReviewed: packet.fundingStatement.funders.length,
      disclosuresReviewed: packet.competingInterests.length,
      findings: findings.length,
      high,
      medium,
      low: findings.filter((item) => item.severity === LOW).length,
    },
    findings,
    releaseCriteria: [
      "Funder and grant statements are explicit before AI peer-review aid output is trusted.",
      "Sponsor role in design, analysis, writing, review, and publication decision is disclosed.",
      "Every author has a competing-interest statement matching known relationships.",
      "CRediT-style author contributions and corresponding-author accountability are present.",
    ],
  };
}

module.exports = {
  assessResearchDisclosures,
  normalizePacket,
};
