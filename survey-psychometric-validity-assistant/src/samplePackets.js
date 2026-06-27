export const cleanPacket = {
  id: "survey-clean-001",
  title: "Validated Remote Collaboration Burnout Scale",
  decisionContext: "pre-release AI peer review",
  constructClaims: ["burnout", "remote collaboration fatigue"],
  sampleSize: 420,
  plannedCfaParameters: 32,
  likertAnchors: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
  scales: [
    {
      name: "Remote Collaboration Fatigue",
      construct: "remote collaboration fatigue",
      cronbachAlpha: 0.86,
      items: [
        { id: "rcf_1", loading: 0.74 },
        { id: "rcf_2", loading: 0.69 },
        { id: "rcf_3", loading: 0.71 },
        { id: "rcf_4", loading: 0.66, reverseCoded: true, reverseScored: true }
      ],
      crossLoadings: [
        { itemId: "rcf_2", secondaryLoading: 0.18 }
      ]
    },
    {
      name: "Burnout Short Form",
      construct: "burnout",
      cronbachAlpha: 0.82,
      items: [
        { id: "bsf_1", loading: 0.72 },
        { id: "bsf_2", loading: 0.77 },
        { id: "bsf_3", loading: 0.68 }
      ],
      crossLoadings: []
    }
  ]
};

export const riskyPacket = {
  id: "survey-risky-017",
  title: "AI Workload Anxiety and Productivity Claims",
  decisionContext: "pre-release AI peer review",
  constructClaims: ["anxiety", "productivity", "clinical burnout"],
  sampleSize: 96,
  plannedCfaParameters: 28,
  likertAnchors: ["Never", "Sometimes", "Often"],
  scales: [
    {
      name: "Workload Anxiety Draft Scale",
      construct: "workload anxiety",
      cronbachAlpha: 0.58,
      items: [
        { id: "wa_1", loading: 0.42 },
        { id: "wa_2", loading: 0.39, reverseCoded: true, reverseScored: false },
        { id: "wa_3", loading: 0.44 },
        { id: "wa_4", loading: 0.31 }
      ],
      crossLoadings: [
        { itemId: "wa_1", secondaryLoading: 0.41 },
        { itemId: "wa_3", secondaryLoading: 0.37 }
      ]
    },
    {
      name: "Productivity Perception Index",
      construct: "productivity perception",
      cronbachAlpha: null,
      items: [
        { id: "ppi_1", loading: 0.47 },
        { id: "ppi_2", loading: 0.36 }
      ],
      crossLoadings: [
        { itemId: "ppi_2", secondaryLoading: 0.34 }
      ]
    }
  ]
};
