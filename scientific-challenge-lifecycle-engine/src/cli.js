import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runChallengeLifecycle } from "./index.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = JSON.parse(readFileSync(join(root, "sample", "biomarker-challenge.json"), "utf8"));
const result = runChallengeLifecycle(
  fixture.challenge,
  fixture.submission,
  fixture.reviewers,
  fixture.reviews,
);

console.log(
  JSON.stringify(
    {
      challenge: result.challengeId,
      submission: result.submissionId,
      status: result.status,
      finalScore: result.scoring.finalScore,
      payoutReady: result.payoutPlan.readyForPayout,
      payoutSchedule: result.payoutPlan.payoutSchedule,
      ipHandoff: result.ipHandoff,
      auditHash: result.auditHash,
    },
    null,
    2,
  ),
);
