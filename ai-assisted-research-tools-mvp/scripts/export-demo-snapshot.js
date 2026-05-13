import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { composeResearchAssistantReport, loadSampleManuscript } from "../src/research-tools.js";

const report = composeResearchAssistantReport(loadSampleManuscript());
const outFile = join("docs", "demo", "assistant-report-snapshot.json");

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
