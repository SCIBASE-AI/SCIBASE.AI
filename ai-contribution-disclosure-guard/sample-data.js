const reputationPacket = {
  project: {
    id: 'proj-sci-2026-flare',
    name: 'Inflammatory flare reproducibility review',
  },
  generatedAt: '2026-05-31T07:40:00Z',
  policy: {
    minimumReviewQuality: 0.72,
  },
  contributions: [
    {
      id: 'review-104',
      contributor: 'dr-avery',
      type: 'peer-review',
      basePoints: 40,
      qualityScore: 0.88,
      text: 'Reviewed methods, verified cohort limits, and checked whether the claims match the supplied figures.',
      aiAssistance: { used: true, disclosed: true, tools: ['grammar rewrite'] },
      humanVerification: { attested: true, verifier: 'editor-2', checkedAt: '2026-05-30T12:00:00Z' },
      provenance: { artifactIds: ['manuscript:v2', 'figures:panel-a', 'review-form:104'] },
      creditEvent: { roles: ['review'], evidenceByRole: { review: 'review-form:104' } },
    },
    {
      id: 'review-105',
      contributor: 'casey-lab',
      type: 'peer-review',
      basePoints: 35,
      qualityScore: 0.81,
      text: 'As an AI, I cannot verify the raw data, but this review recommends acceptance.',
      aiAssistance: { used: true, disclosed: false, tools: ['unknown'] },
      humanVerification: { attested: false },
      provenance: { artifactIds: [] },
      creditEvent: { roles: ['review'], evidenceByRole: {} },
    },
    {
      id: 'rerun-210',
      contributor: 'morgan-data',
      type: 'reproducibility-rerun',
      basePoints: 55,
      qualityScore: 0.95,
      text: 'Re-ran notebook from pinned container and attached variance report.',
      aiAssistance: { used: true, disclosed: true, tools: ['test generation'] },
      humanVerification: { attested: false },
      provenance: { artifactIds: ['notebook:rerun-210', 'container:sha256-b3'] },
      creditEvent: { roles: ['validation'], evidenceByRole: { validation: 'rerun-report:210' } },
    },
    {
      id: 'credit-314',
      contributor: 'taylor-orcid',
      type: 'credit-claim',
      basePoints: 30,
      qualityScore: 0.74,
      text: 'Claiming conceptualization and data curation credit for release v2.',
      aiAssistance: { used: false, disclosed: false },
      humanVerification: { attested: true, verifier: 'pi-1' },
      provenance: { artifactIds: ['release:v2'] },
      creditEvent: {
        roles: ['conceptualization', 'data-curation'],
        evidenceByRole: { conceptualization: 'proposal:v1' },
      },
    },
  ],
};

const cleanPacket = {
  ...reputationPacket,
  contributions: [
    {
      id: 'review-200',
      contributor: 'riley-reviewer',
      type: 'peer-review',
      basePoints: 40,
      qualityScore: 0.91,
      text: 'Reviewed statistical claims and attached a completed rubric.',
      aiAssistance: { used: true, disclosed: true, tools: ['outline assist'] },
      humanVerification: { attested: true, verifier: 'editor-4' },
      provenance: { artifactIds: ['review-form:200', 'rubric:200'] },
      creditEvent: { roles: ['review'], evidenceByRole: { review: 'review-form:200' } },
    },
  ],
};

module.exports = { reputationPacket, cleanPacket };
