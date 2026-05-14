import { orchestrateAssistantSuite } from "./research-assistant.js";
import { corpus, project } from "./sample-data.js";

export function buildDemoReport() {
  return orchestrateAssistantSuite({ project, corpus });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildDemoReport(), null, 2));
}
