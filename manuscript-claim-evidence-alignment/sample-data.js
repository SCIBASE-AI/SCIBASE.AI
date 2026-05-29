const manuscript = {
  id: "ms-neuro-042",
  title: "Adaptive Neural Stimulation Improves Memory Recall",
  generatedAt: "2026-05-29T12:24:00.000Z",
  claims: [
    {
      id: "claim-1",
      text: "Adaptive stimulation significantly improved delayed recall compared with sham controls.",
      type: "statistical",
      evidenceRefs: ["fig-2b", "table-1"],
      requiredSignals: ["p-value", "sample-size", "control-group"]
    },
    {
      id: "claim-2",
      text: "The intervention completely eliminates cognitive fatigue in older adults.",
      type: "overclaim",
      evidenceRefs: ["fig-3a"],
      requiredSignals: ["effect-size", "fatigue-scale", "older-adult-cohort"]
    },
    {
      id: "claim-3",
      text: "No adverse events were observed during the trial.",
      type: "safety",
      evidenceRefs: ["supp-safety"],
      requiredSignals: ["adverse-event-table", "monitoring-window"]
    },
    {
      id: "claim-4",
      text: "This is the first closed-loop stimulation study in human memory research.",
      type: "novelty",
      evidenceRefs: ["intro-prior-work"],
      requiredSignals: ["prior-work-comparison", "scope-limitation"]
    }
  ],
  evidence: [
    {
      id: "fig-2b",
      label: "Figure 2B",
      signals: ["p-value", "control-group", "effect-size"],
      summary: "Delayed recall increased versus sham, p=0.018, medium effect size."
    },
    {
      id: "table-1",
      label: "Table 1",
      signals: ["sample-size", "control-group"],
      summary: "N=64 randomized participants, balanced sham and adaptive stimulation arms."
    },
    {
      id: "fig-3a",
      label: "Figure 3A",
      signals: ["effect-size", "fatigue-scale", "older-adult-cohort"],
      summary: "Fatigue score improved in a subset, but residual fatigue remained in 31%."
    },
    {
      id: "supp-safety",
      label: "Supplemental Safety Table",
      signals: ["adverse-event-table"],
      summary: "Adverse event log is present but only covers the in-clinic stimulation window."
    },
    {
      id: "intro-prior-work",
      label: "Introduction Prior Work",
      signals: ["prior-work-comparison"],
      summary: "Mentions invasive and non-invasive stimulation studies, without narrowing the novelty scope."
    }
  ]
};

module.exports = { manuscript };
