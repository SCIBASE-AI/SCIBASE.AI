"use strict";

const milestone = {
  id: "ms-final-submission",
  label: "Final Submission",
  dueDate: "2026-06-15",
  freezeDate: "2026-06-10",
  today: "2026-06-08",
  requiredSections: ["methods", "results", "figures", "supplement"]
};

const collaborators = [
  {
    id: "u-ada",
    name: "Ada",
    role: "lead-author",
    availableHoursBeforeFreeze: 5,
    maxOpenTasks: 4
  },
  {
    id: "u-luis",
    name: "Luis",
    role: "methods-reviewer",
    availableHoursBeforeFreeze: 2,
    maxOpenTasks: 2
  },
  {
    id: "u-mina",
    name: "Mina",
    role: "data-scientist",
    availableHoursBeforeFreeze: 6,
    maxOpenTasks: 3
  }
];

const anchors = [
  {
    id: "methods",
    type: "section",
    title: "Methods",
    locked: false,
    lastEditedAt: "2026-06-07T12:00:00Z"
  },
  {
    id: "results",
    type: "section",
    title: "Results",
    locked: false,
    lastEditedAt: "2026-06-08T09:00:00Z"
  },
  {
    id: "figures",
    type: "figure",
    title: "Figure 2",
    locked: true,
    lastEditedAt: "2026-06-04T18:00:00Z"
  },
  {
    id: "supplement",
    type: "supplement",
    title: "Supplementary Table 1",
    locked: false,
    lastEditedAt: "2026-06-05T17:00:00Z"
  },
  {
    id: "cell-model-fit",
    type: "notebook-cell",
    title: "Model fit cell",
    outputGeneratedAt: "2026-05-28T15:00:00Z",
    inputHash: "hash-current-cell",
    outputInputHash: "hash-old-cell"
  }
];

const comments = [
  {
    id: "c-1",
    anchorId: "methods",
    status: "blocking",
    text: "Clarify cohort exclusion criteria before final submission."
  },
  {
    id: "c-2",
    anchorId: "figures",
    status: "resolved",
    text: "Caption updated."
  },
  {
    id: "c-3",
    anchorId: "cell-model-fit",
    status: "blocking",
    text: "Notebook output predates the latest model input hash."
  }
];

const tasks = [
  {
    id: "t-1",
    title: "Resolve exclusion criteria wording",
    assigneeId: "u-ada",
    anchorId: "methods",
    dueDate: "2026-06-09",
    status: "open",
    estimateHours: 2,
    dependsOn: [],
    milestoneId: "ms-final-submission"
  },
  {
    id: "t-2",
    title: "Refresh model-fit notebook output",
    assigneeId: "u-mina",
    anchorId: "cell-model-fit",
    dueDate: "2026-06-09",
    status: "open",
    estimateHours: 4,
    dependsOn: [],
    milestoneId: "ms-final-submission"
  },
  {
    id: "t-3",
    title: "Approve Results section text",
    assigneeId: "u-luis",
    anchorId: "results",
    dueDate: "2026-06-10",
    status: "open",
    estimateHours: 2,
    dependsOn: ["t-1", "t-2"],
    milestoneId: "ms-final-submission"
  },
  {
    id: "t-4",
    title: "Confirm figure lock remains valid",
    assigneeId: "u-luis",
    anchorId: "figures",
    dueDate: "2026-06-08",
    status: "open",
    estimateHours: 1,
    dependsOn: [],
    milestoneId: "ms-final-submission"
  },
  {
    id: "t-5",
    title: "Package supplementary table",
    assigneeId: "u-mina",
    anchorId: "supplement",
    dueDate: "2026-06-14",
    status: "open",
    estimateHours: 3,
    dependsOn: ["t-3"],
    milestoneId: "ms-final-submission"
  }
];

module.exports = {
  milestone,
  collaborators,
  anchors,
  comments,
  tasks
};
