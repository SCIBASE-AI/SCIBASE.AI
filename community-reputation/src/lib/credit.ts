// CRediT (Contributor Roles Taxonomy) — https://credit.niso.org/

export enum CreditRole {
  CONCEPTUALIZATION = "CONCEPTUALIZATION",
  DATA_CURATION = "DATA_CURATION",
  FORMAL_ANALYSIS = "FORMAL_ANALYSIS",
  FUNDING_ACQUISITION = "FUNDING_ACQUISITION",
  INVESTIGATION = "INVESTIGATION",
  METHODOLOGY = "METHODOLOGY",
  PROJECT_ADMINISTRATION = "PROJECT_ADMINISTRATION",
  RESOURCES = "RESOURCES",
  SOFTWARE = "SOFTWARE",
  SUPERVISION = "SUPERVISION",
  VALIDATION = "VALIDATION",
  VISUALIZATION = "VISUALIZATION",
  WRITING_ORIGINAL_DRAFT = "WRITING_ORIGINAL_DRAFT",
  WRITING_REVIEW_EDITING = "WRITING_REVIEW_EDITING",
}

export const CREDIT_LABELS: Record<CreditRole, string> = {
  [CreditRole.CONCEPTUALIZATION]: "Conceptualization",
  [CreditRole.DATA_CURATION]: "Data Curation",
  [CreditRole.FORMAL_ANALYSIS]: "Formal Analysis",
  [CreditRole.FUNDING_ACQUISITION]: "Funding Acquisition",
  [CreditRole.INVESTIGATION]: "Investigation",
  [CreditRole.METHODOLOGY]: "Methodology",
  [CreditRole.PROJECT_ADMINISTRATION]: "Project Administration",
  [CreditRole.RESOURCES]: "Resources",
  [CreditRole.SOFTWARE]: "Software",
  [CreditRole.SUPERVISION]: "Supervision",
  [CreditRole.VALIDATION]: "Validation",
  [CreditRole.VISUALIZATION]: "Visualization",
  [CreditRole.WRITING_ORIGINAL_DRAFT]: "Writing – Original Draft",
  [CreditRole.WRITING_REVIEW_EDITING]: "Writing – Review & Editing",
};

export const CREDIT_DESCRIPTIONS: Record<CreditRole, string> = {
  [CreditRole.CONCEPTUALIZATION]:
    "Ideas; formulation or evolution of overarching research goals and aims",
  [CreditRole.DATA_CURATION]:
    "Management activities to annotate, scrub data and maintain research data for initial use and later reuse",
  [CreditRole.FORMAL_ANALYSIS]:
    "Application of statistical, mathematical, computational, or other formal techniques to analyse or synthesize study data",
  [CreditRole.FUNDING_ACQUISITION]:
    "Acquisition of the financial support for the project leading to this publication",
  [CreditRole.INVESTIGATION]:
    "Conducting a research and investigation process, specifically performing the experiments, or data/evidence collection",
  [CreditRole.METHODOLOGY]: "Development or design of methodology; creation of models",
  [CreditRole.PROJECT_ADMINISTRATION]:
    "Management and coordination responsibility for the research activity planning and execution",
  [CreditRole.RESOURCES]:
    "Provision of study materials, reagents, materials, patients, laboratory samples, animals, instrumentation, computing resources, or other analysis tools",
  [CreditRole.SOFTWARE]:
    "Programming, software development; designing computer programs; implementation of the computer code and supporting algorithms",
  [CreditRole.SUPERVISION]:
    "Oversight and leadership responsibility for the research activity planning and execution",
  [CreditRole.VALIDATION]:
    "Verification, whether as a part of the activity or separate, of the overall replication/reproducibility of results/experiments",
  [CreditRole.VISUALIZATION]:
    "Preparation, creation and/or presentation of the published work, specifically visualization/data presentation",
  [CreditRole.WRITING_ORIGINAL_DRAFT]:
    "Preparation, creation and/or presentation of the published work, specifically writing the initial draft",
  [CreditRole.WRITING_REVIEW_EDITING]:
    "Preparation, creation and/or presentation of the published work by those from the original research group, specifically critical review, commentary or revision",
};

export function isValidRole(role: string): role is CreditRole {
  return Object.values(CreditRole).includes(role as CreditRole);
}
