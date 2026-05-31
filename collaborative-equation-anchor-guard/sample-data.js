const sessions = [
  {
    id: "manuscript-ready",
    title: "Bayesian calibration of synthetic assay controls",
    journalStyle: "numbered-by-section",
    sections: [
      {
        id: "methods",
        number: 2,
        locked: false,
        equations: [
          {
            label: "eq:posterior",
            localNumber: 1,
            latex: "p(theta|y) \\propto p(y|theta)p(theta)",
            modifiedBy: "ada",
          },
          {
            label: "eq:loss",
            localNumber: 2,
            latex: "L(theta)=\\sum_i (y_i-f_theta(x_i))^2",
            modifiedBy: "mina",
          },
        ],
        references: ["eq:posterior", "eq:loss"],
        comments: [],
      },
    ],
  },
  {
    id: "duplicate-labels",
    title: "Collaborative model appendix",
    journalStyle: "numbered-by-section",
    sections: [
      {
        id: "results",
        number: 3,
        locked: false,
        equations: [
          {
            label: "eq:model-score",
            localNumber: 1,
            latex: "s = alpha x + beta",
            modifiedBy: "omar",
          },
          {
            label: "eq:model-score",
            localNumber: 2,
            latex: "s = gamma z",
            modifiedBy: "grace",
          },
        ],
        references: ["eq:model-score", "eq:missing-threshold"],
        comments: [],
      },
    ],
  },
  {
    id: "locked-private-leak",
    title: "Submission-ready manuscript draft",
    journalStyle: "numbered-by-section",
    sections: [
      {
        id: "final-figures",
        number: 4,
        locked: true,
        equations: [
          {
            label: "eq:final-estimator",
            localNumber: 1,
            latex: "hat{tau}=bar{y}_1-bar{y}_0",
            modifiedBy: "external-reviewer",
          },
        ],
        references: ["eq:final-estimator"],
        comments: [
          {
            id: "c-private-equation-note",
            visibility: "private-reviewer",
            anchor: "eq:final-estimator",
            resolved: false,
          },
        ],
      },
    ],
  },
];

module.exports = { sessions };
