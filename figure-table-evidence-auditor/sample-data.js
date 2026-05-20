"use strict";

const manuscripts = [
  {
    id: "ms-neuro-042",
    title: "Closed-loop stimulation improves memory-task recovery",
    body: [
      "Closed-loop stimulation improved recall accuracy by 18% in the recovery cohort, as shown in Figure 1.",
      "The biomarker response was significant at p < 0.04 in Table 2.",
      "A larger effect was seen in the adaptive arm compared with static stimulation.",
      "Figure 3 shows device adherence during the home phase.",
    ].join(" "),
    figures: [
      {
        id: "figure 1",
        caption: "Recall accuracy by cohort over six weeks",
        unit: "%",
        tags: "memory recall stimulation cohort",
      },
      {
        id: "figure 2",
        caption: "Adherence",
        unit: "days",
        tags: "device adherence home phase",
      },
    ],
    tables: [
      {
        id: "table 2",
        caption: "Primary biomarker response with p values",
        unit: "pg/mL",
        tags: "biomarker p-value confidence interval",
      },
    ],
    candidateCitations: [
      {
        id: "smith-2024-closed-loop",
        title: "Closed-loop stimulation and recall recovery",
        keywords: ["stimulation", "recall"],
      },
      {
        id: "nguyen-2023-single-cell",
        title: "Single-cell atlas for immune signaling",
        keywords: ["single-cell", "immune"],
      },
    ],
  },
  {
    id: "ms-climate-117",
    title: "River heat pulses alter macroinvertebrate recovery",
    body: [
      "Macroinvertebrate diversity was lower after heat-pulse events, with recovery curves shown in Figure 1.",
      "Table 1 reports site-level conductivity, flow, and confidence intervals for each recovery model.",
      "The public data package includes sensor calibration logs and code notebooks.",
    ].join(" "),
    figures: [
      {
        id: "figure 1",
        caption: "Recovery curves for all monitored river sites after heat pulses",
        unit: "days",
        tags: "river recovery heat-pulse diversity",
      },
    ],
    tables: [
      {
        id: "table 1",
        caption: "Site-level model covariates and confidence intervals",
        unit: "uS/cm",
        tags: "conductivity flow confidence interval",
      },
    ],
    candidateCitations: [
      {
        id: "patel-2022-river-heat",
        title: "Freshwater recovery after thermal stress",
        keywords: ["river", "heat-pulse", "recovery"],
      },
    ],
  },
];

module.exports = { manuscripts };
