import { ScientificBountySystem } from "../src/system.js";

const form = document.querySelector("#challenge-form");
const results = document.querySelector("#results");
const metrics = document.querySelector("#metrics");
const status = document.querySelector("#status");

function step(index, title, detail, badge) {
  const article = document.createElement("article");
  article.className = "step";

  const number = document.createElement("span");
  number.className = "step-index";
  number.textContent = String(index);

  const copy = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = title;
  const description = document.createElement("small");
  description.textContent = detail;
  copy.append(heading, description);

  const state = document.createElement("span");
  state.className = "badge";
  state.textContent = badge;
  article.append(number, copy, state);
  return article;
}

function metric(label, value) {
  const card = document.createElement("div");
  card.className = "metric";
  const name = document.createElement("span");
  name.textContent = label;
  const amount = document.createElement("strong");
  amount.textContent = value;
  card.append(name, amount);
  return card;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  status.textContent = "";
  results.replaceChildren();
  metrics.replaceChildren();

  try {
    let tick = 0;
    const system = new ScientificBountySystem({
      clock: () => `2026-08-25T08:30:${String(tick++).padStart(2, "0")}Z`
    });
    const prize = Number(document.querySelector("#prize").value);
    const proposalAmount = Number((prize * 0.3).toFixed(2));
    const finalAmount = Number((prize - proposalAmount).toFixed(2));

    const challenge = system.postChallenge({
      id: "challenge-demo",
      title: document.querySelector("#title").value,
      scientificContext: document.querySelector("#context").value,
      vertical: document.querySelector("#vertical").value,
      deliverables: [
        { id: "proposal", description: "Experimental plan and data statement" },
        { id: "model", description: "Reproducible forecasting model" }
      ],
      rubric: [
        { id: "accuracy", description: "Forecast accuracy", weight: 60, maxScore: 10 },
        { id: "reproducibility", description: "Independent rerun quality", weight: 40, maxScore: 10 }
      ],
      phases: [
        { id: "proposal", deadline: "2026-09-01T00:00:00Z", deliverableIds: ["proposal"] },
        { id: "final", deadline: "2026-10-01T00:00:00Z", deliverableIds: ["model"] }
      ],
      prize: { currency: "USDC", amount: prize },
      payoutSchedule: [
        { id: "proposal-award", phaseId: "proposal", kind: "milestone", amount: proposalAmount },
        { id: "final-award", phaseId: "final", kind: "final", amount: finalAmount }
      ],
      visibility: document.querySelector("#visibility").value,
      participationMode: document.querySelector("#participation").value,
      prequalificationRequired: true,
      ndaRequired: true,
      ipPolicy: { mode: "sponsored", license: "Research-use license until settlement" },
      escrow: { currency: "USDC", fundedAmount: prize, reference: "escrow:demo:001" }
    });

    const workspace = system.openWorkspace(challenge.id, {
      id: "workspace-demo",
      teamId: "team-private-017",
      teamName: "River Lab",
      pseudonym: "Solver 017",
      memberIds: ["researcher-a", "researcher-b"],
      prequalificationApproved: true,
      ndaAcceptedAt: "2026-08-25T08:31:00Z"
    });

    const submission = system.submit(workspace.id, {
      id: "submission-demo",
      phaseId: "proposal",
      title: "Calibrated flood forecast proposal",
      abstract: "Regional holdout evaluation using an open river-basin dataset.",
      reproducibilityNote: "Run notebook.ipynb with seed 42.",
      deliverableIds: ["proposal"],
      artifacts: [
        {
          path: "proposal/model-card.md",
          sha256: "a".repeat(64),
          license: "CC-BY-4.0",
          dataset: "open-river-basin-v2"
        }
      ]
    });

    const review = system.review(submission.id, {
      id: "review-demo",
      reviewerId: "reviewer-independent",
      reviewerTeamId: "reviewer-team",
      scores: [
        { criterionId: "accuracy", score: 9 },
        { criterionId: "reproducibility", score: 8 }
      ],
      checklist: [
        { item: "proposal artifact present", passed: true },
        { item: "dataset and license declared", passed: true }
      ],
      provenanceDecision: "release",
      feedback: "Milestone evidence is complete and ready for sponsor acceptance."
    });

    const award = system.planAward(submission.id, {
      id: "award-demo",
      reviewId: review.id,
      scheduleId: "proposal-award",
      routes: [
        { recipientId: "team-private-017", recipientType: "team", amount: proposalAmount / 2 },
        { recipientId: "university-demo", recipientType: "institution", amount: proposalAmount / 2 }
      ]
    });
    const settled = system.settleAward(award.id, { paymentReference: "base:demo:0xabc123" });

    results.append(
      step(1, "Challenge posted", `${challenge.vertical} template · ${challenge.visibility} · ${challenge.prize.amount} ${challenge.prize.currency} escrowed`, challenge.status),
      step(2, "Solver workspace opened", `${workspace.displayName} · ${workspace.participationMode} · NDA and prequalification recorded`, "private"),
      step(3, "Submission packaged", `${submission.deliverableIds.length} deliverable · version ${submission.version} · artifact manifest recorded`, "submitted"),
      step(4, "Independent review", `Weighted score ${review.weightedScore}/100 · provenance ${review.provenanceDecision}`, review.decision),
      step(5, "Milestone routed", `${award.routes.length} recipients · IP ${award.ipState}`, award.status),
      step(6, "Escrow settled", `${settled.amount} ${settled.currency} · ${settled.paymentReference} · IP ${settled.ipState}`, settled.status)
    );
    metrics.append(
      metric("Prize escrow", `${challenge.prize.amount} ${challenge.prize.currency}`),
      metric("Review score", `${review.weightedScore}/100`),
      metric("Paid milestone", `${settled.amount} ${settled.currency}`)
    );
    metrics.hidden = false;
    status.textContent = "Lifecycle completed with deterministic audit events.";
  } catch (error) {
    results.innerHTML = '<div class="empty">The lifecycle stopped before payout.</div>';
    metrics.hidden = true;
    status.textContent = error.message;
  }
});
