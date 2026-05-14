import { evaluateBountySubmission } from "./evaluation-ledger.js";
import { challenge, reviews, submission } from "./sample-ledger.js";

const report = evaluateBountySubmission(challenge, submission, reviews);

console.log(JSON.stringify(report, null, 2));
