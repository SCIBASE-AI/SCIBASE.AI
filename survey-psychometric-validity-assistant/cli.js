import { readFile } from "node:fs/promises";
import { evaluateSurveyPacket } from "./src/guard.js";

try {
  if (process.argv.length !== 3) throw new Error("Usage: node cli.js packet.json");
  const result = evaluateSurveyPacket(JSON.parse(await readFile(process.argv[2], "utf8")));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.decision === "RELEASE" ? 0 : result.decision === "REVIEW" ? 2 : 3;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
