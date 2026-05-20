"use strict";

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function daysBetween(start, end) {
  return Math.ceil((parseDate(end) - parseDate(start)) / 86400000);
}

function byId(items) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getDependencyChain(task, taskMap, seen = new Set()) {
  const chain = [];
  for (const dependencyId of task.dependsOn || []) {
    if (seen.has(dependencyId)) continue;
    seen.add(dependencyId);
    const dependency = taskMap[dependencyId];
    if (!dependency) {
      chain.push({ id: dependencyId, missing: true });
      continue;
    }
    chain.push(dependency);
    chain.push(...getDependencyChain(dependency, taskMap, seen));
  }
  return chain;
}

function evaluateNotebookAnchor(anchor) {
  if (!anchor || anchor.type !== "notebook-cell") {
    return { stale: false, reason: "" };
  }
  const stale = anchor.inputHash !== anchor.outputInputHash;
  return {
    stale,
    reason: stale ? "notebook output was generated from an older input hash" : ""
  };
}

function evaluateTask(task, context) {
  const { milestone, collaborators, anchors, comments, taskMap } = context;
  const collaborator = collaborators[task.assigneeId];
  const anchor = anchors[task.anchorId];
  const dependencyChain = getDependencyChain(task, taskMap);
  const incompleteDependencies = dependencyChain.filter((dependency) => dependency.missing || dependency.status !== "done");
  const blockingComments = comments.filter(
    (comment) => comment.anchorId === task.anchorId && comment.status === "blocking"
  );
  const notebook = evaluateNotebookAnchor(anchor);
  const daysToDue = daysBetween(milestone.today, task.dueDate);
  const daysToFreeze = daysBetween(milestone.today, milestone.freezeDate);
  const overdue = daysToDue < 0;
  const dueBeforeFreeze = parseDate(task.dueDate) <= parseDate(milestone.freezeDate);
  const overloaded = collaborator ? task.estimateHours > collaborator.availableHoursBeforeFreeze : true;
  const riskReasons = [];

  if (!collaborator) riskReasons.push("assignee is missing");
  if (!anchor) riskReasons.push("document anchor is missing");
  if (overdue) riskReasons.push("task is overdue");
  if (!dueBeforeFreeze) riskReasons.push("task due date is after freeze");
  if (incompleteDependencies.length) riskReasons.push("dependency chain is incomplete");
  if (blockingComments.length) riskReasons.push("blocking comments remain on the anchor");
  if (notebook.stale) riskReasons.push(notebook.reason);
  if (overloaded) riskReasons.push("assignee does not have enough available hours before freeze");

  const riskScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        incompleteDependencies.length * 18 -
        blockingComments.length * 16 -
        (notebook.stale ? 20 : 0) -
        (overdue ? 25 : 0) -
        (!dueBeforeFreeze ? 18 : 0) -
        (overloaded ? 14 : 0) -
        (!anchor ? 20 : 0) -
        (!collaborator ? 20 : 0)
    )
  );

  return {
    taskId: task.id,
    title: task.title,
    status: task.status,
    assignee: collaborator ? collaborator.name : "missing",
    anchorId: task.anchorId,
    anchorType: anchor ? anchor.type : "missing",
    daysToDue,
    daysToFreeze,
    riskScore,
    readiness: riskScore >= 80 ? "ready" : riskScore >= 55 ? "at-risk" : "blocked",
    dependencyIds: (task.dependsOn || []).slice(),
    incompleteDependencyIds: incompleteDependencies.map((dependency) => dependency.id),
    blockingCommentIds: blockingComments.map((comment) => comment.id),
    riskReasons
  };
}

function detectDependencyCycles(tasks) {
  const taskMap = byId(tasks);
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(task, path) {
    if (visiting.has(task.id)) {
      const start = path.indexOf(task.id);
      cycles.push(path.slice(start).concat(task.id));
      return;
    }
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    for (const dependencyId of task.dependsOn || []) {
      const dependency = taskMap[dependencyId];
      if (dependency) visit(dependency, path.concat(dependency.id));
    }
    visiting.delete(task.id);
    visited.add(task.id);
  }

  tasks.forEach((task) => visit(task, [task.id]));
  return cycles;
}

function collaboratorLoad(tasks, collaborators) {
  const taskCounts = {};
  const hourCounts = {};
  tasks.filter((task) => task.status !== "done").forEach((task) => {
    taskCounts[task.assigneeId] = (taskCounts[task.assigneeId] || 0) + 1;
    hourCounts[task.assigneeId] = (hourCounts[task.assigneeId] || 0) + task.estimateHours;
  });

  return collaborators.map((collaborator) => {
    const openTasks = taskCounts[collaborator.id] || 0;
    const estimatedHours = hourCounts[collaborator.id] || 0;
    return {
      collaboratorId: collaborator.id,
      name: collaborator.name,
      openTasks,
      estimatedHours,
      maxOpenTasks: collaborator.maxOpenTasks,
      availableHoursBeforeFreeze: collaborator.availableHoursBeforeFreeze,
      overloaded: openTasks > collaborator.maxOpenTasks || estimatedHours > collaborator.availableHoursBeforeFreeze
    };
  });
}

function evaluateMilestoneReadiness({ milestone, tasks, collaborators, anchors, comments }) {
  const taskMap = byId(tasks);
  const collaboratorMap = byId(collaborators);
  const anchorMap = byId(anchors);
  const taskEvaluations = tasks.map((task) =>
    evaluateTask(task, {
      milestone,
      collaborators: collaboratorMap,
      anchors: anchorMap,
      comments,
      taskMap
    })
  );
  const cycles = detectDependencyCycles(tasks);
  const load = collaboratorLoad(tasks, collaborators);
  const missingSections = milestone.requiredSections.filter((sectionId) => !anchorMap[sectionId]);
  const blocked = taskEvaluations.filter((task) => task.readiness === "blocked");
  const atRisk = taskEvaluations.filter((task) => task.readiness === "at-risk");
  const averageRisk = Math.round(
    taskEvaluations.reduce((sum, task) => sum + task.riskScore, 0) / taskEvaluations.length
  );
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      averageRisk -
        blocked.length * 8 -
        cycles.length * 20 -
        missingSections.length * 15 -
        load.filter((person) => person.overloaded).length * 6
    )
  );

  const findings = [];
  if (cycles.length) {
    findings.push({
      severity: "high",
      code: "dependency-cycle",
      message: "Task dependencies contain a cycle.",
      evidence: cycles.map((cycle) => cycle.join(" -> ")),
      action: "Break dependency cycles before publication freeze."
    });
  }
  if (blocked.length) {
    findings.push({
      severity: "high",
      code: "blocked-tasks",
      message: "Some inline tasks block milestone readiness.",
      evidence: blocked.map((task) => `${task.taskId}: ${task.riskReasons.join("; ")}`),
      action: "Resolve blocked tasks or move the milestone freeze date."
    });
  }
  if (atRisk.length) {
    findings.push({
      severity: "medium",
      code: "at-risk-tasks",
      message: "Some tasks are still risky but recoverable before freeze.",
      evidence: atRisk.map((task) => `${task.taskId}: score ${task.riskScore}`),
      action: "Assign focused follow-up work and re-run the guard before freezing sections."
    });
  }
  const overloaded = load.filter((person) => person.overloaded);
  if (overloaded.length) {
    findings.push({
      severity: "medium",
      code: "assignee-overload",
      message: "Some collaborators are overloaded before the freeze date.",
      evidence: overloaded.map((person) => `${person.name}: ${person.estimatedHours}h/${person.availableHoursBeforeFreeze}h`),
      action: "Reassign or reduce task scope before the publication milestone."
    });
  }
  if (missingSections.length) {
    findings.push({
      severity: "high",
      code: "missing-required-section",
      message: "Required milestone sections do not have anchors.",
      evidence: missingSections,
      action: "Create or restore missing anchors before final submission."
    });
  }

  return {
    milestoneId: milestone.id,
    generatedBy: "collab-task-dependency-deadline-guard",
    readiness: readinessScore >= 78 ? "ready-with-review" : "needs-task-recovery",
    readinessScore,
    metrics: {
      totalTasks: tasks.length,
      blockedTasks: blocked.length,
      atRiskTasks: atRisk.length,
      readyTasks: taskEvaluations.filter((task) => task.readiness === "ready").length,
      dependencyCycles: cycles.length,
      overloadedCollaborators: overloaded.length,
      missingRequiredSections: missingSections.length
    },
    taskEvaluations,
    collaboratorLoad: load,
    findings,
    reviewerActions: unique(findings.map((finding) => finding.action)),
    auditDigest: [
      `${tasks.length} inline tasks evaluated`,
      `${blocked.length} blocked tasks`,
      `${atRisk.length} at-risk tasks`,
      `${overloaded.length} overloaded collaborators`,
      `${cycles.length} dependency cycles`
    ]
  };
}

function renderReviewerMarkdown(audit) {
  const lines = [
    "# Collaborative Task Dependency Deadline Guard",
    "",
    `Milestone: ${audit.milestoneId}`,
    `Readiness: ${audit.readiness} (${audit.readinessScore}/100)`,
    "",
    "## Metrics",
    "",
    `- Total tasks: ${audit.metrics.totalTasks}`,
    `- Blocked tasks: ${audit.metrics.blockedTasks}`,
    `- At-risk tasks: ${audit.metrics.atRiskTasks}`,
    `- Overloaded collaborators: ${audit.metrics.overloadedCollaborators}`,
    "",
    "## Findings",
    ""
  ];
  audit.findings.forEach((finding) => {
    lines.push(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
    lines.push(`  Action: ${finding.action}`);
  });
  lines.push("", "## Task Evaluations", "");
  audit.taskEvaluations.forEach((task) => {
    lines.push(`- ${task.taskId}: ${task.readiness} (${task.riskScore}/100) - ${task.title}`);
  });
  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(audit) {
  const barWidth = Math.round((audit.readinessScore / 100) * 760);
  const taskLines = audit.taskEvaluations.slice(0, 5).map((task, index) => {
    const y = 318 + index * 34;
    return `<text x="60" y="${y}" fill="#0f172a" font-size="19">${task.taskId} ${task.readiness} score ${task.riskScore}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="60" y="76" fill="#0f172a" font-size="34" font-family="Arial, sans-serif" font-weight="700">Task Dependency Deadline Guard</text>
  <text x="60" y="120" fill="#334155" font-size="22" font-family="Arial, sans-serif">Readiness: ${audit.readiness} (${audit.readinessScore}/100)</text>
  <rect x="60" y="158" width="760" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="60" y="158" width="${barWidth}" height="34" rx="4" fill="#2563eb"/>
  <text x="60" y="244" fill="#0f172a" font-size="22" font-family="Arial, sans-serif">Blocked ${audit.metrics.blockedTasks} | At risk ${audit.metrics.atRiskTasks} | Overloaded ${audit.metrics.overloadedCollaborators}</text>
  <text x="60" y="286" fill="#334155" font-size="20" font-family="Arial, sans-serif">Task readiness</text>
  ${taskLines}
</svg>
`;
}

module.exports = {
  evaluateMilestoneReadiness,
  renderReviewerMarkdown,
  renderSvgSummary,
  detectDependencyCycles,
  collaboratorLoad
};
