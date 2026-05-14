import { createResearchPacket } from "./research-workflow.js";
import { samplePaper } from "./sample-paper.js";

const packet = createResearchPacket(samplePaper, {
  summaryMode: "executive",
  citationStyle: "nature",
});

console.log(JSON.stringify(packet, null, 2));
