import { readFile } from "node:fs/promises";
import { evaluateSubmissionProvenance, renderReviewerReport } from "../src/index.js";

const packet = JSON.parse(
  await readFile(new URL("../examples/submissions.json", import.meta.url), "utf8")
);
const result = evaluateSubmissionProvenance(packet);

process.stdout.write(renderReviewerReport(result));
