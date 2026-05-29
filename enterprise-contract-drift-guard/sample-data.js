const contracts = [
  {
    id: "dspace-repository-export",
    owner: "University Library",
    system: "DSpace",
    currentVersion: "2026.05",
    proposedVersion: "2026.06",
    deprecationDays: 120,
    requiredFields: ["doi", "title", "authors", "license", "embargoUntil"],
    currentSchema: {
      doi: "string",
      title: "string",
      authors: "array",
      license: "string",
      embargoUntil: "date",
      reproducibilityScore: "number"
    },
    proposedSchema: {
      doi: "string",
      title: "string",
      authors: "array",
      license: "enum:cc-by|cc0",
      reproducibilityScore: "number"
    },
    payloadPolicy: { redactsEmails: true, includesInternalNotes: false },
    consumerPinnedVersion: "2026.05"
  },
  {
    id: "canvas-course-publication-webhook",
    owner: "Graduate School",
    system: "Canvas",
    currentVersion: "2026.04",
    proposedVersion: "2026.06",
    deprecationDays: 30,
    requiredFields: ["projectId", "courseId", "eventType", "publishedAt"],
    currentSchema: {
      projectId: "string",
      courseId: "string",
      eventType: "enum:created|published|reviewed",
      publishedAt: "date"
    },
    proposedSchema: {
      projectId: "string",
      courseId: "number",
      eventType: "enum:created|published|retracted",
      publishedAt: "date"
    },
    payloadPolicy: { redactsEmails: true, includesInternalNotes: false },
    consumerPinnedVersion: "2026.04"
  },
  {
    id: "orcid-hris-identity-sync",
    owner: "Research HR",
    system: "ORCID-HRIS",
    currentVersion: "2026.03",
    proposedVersion: "2026.06",
    deprecationDays: 180,
    requiredFields: ["orcid", "institutionUserId", "displayName", "affiliation"],
    currentSchema: {
      orcid: "string",
      institutionUserId: "string",
      displayName: "string",
      affiliation: "string",
      departmentCode: "string"
    },
    proposedSchema: {
      orcid: "string",
      institutionUserId: "string",
      displayName: "string",
      affiliation: "string",
      departmentCode: "string",
      role: "enum:faculty|staff|student"
    },
    payloadPolicy: { redactsEmails: true, includesInternalNotes: false },
    consumerPinnedVersion: "2026.03"
  },
  {
    id: "eln-inventory-review-export",
    owner: "Lab Operations",
    system: "ELN",
    currentVersion: "2026.05",
    proposedVersion: "2026.06",
    deprecationDays: 90,
    requiredFields: ["experimentId", "inventoryIds", "reviewScore", "reviewedAt"],
    currentSchema: {
      experimentId: "string",
      inventoryIds: "array",
      reviewScore: "number",
      reviewedAt: "date"
    },
    proposedSchema: {
      experimentId: "string",
      inventoryIds: "array",
      reviewScore: "number",
      reviewedAt: "date",
      reviewerEmail: "string"
    },
    payloadPolicy: { redactsEmails: false, includesInternalNotes: false },
    consumerPinnedVersion: "2026.05"
  }
];

module.exports = { contracts };
