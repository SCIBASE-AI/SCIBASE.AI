import { evaluateSurveyPacket } from "./guard.js";

// Call the publication callback only after this local gate permits release.
// The host remains responsible for other review gates and authorization.
export async function releaseSurveyReview({ packet, review, publish, options }) {
  if (typeof publish !== "function") throw new TypeError("publish must be a function");
  const result = evaluateSurveyPacket(packet, options);
  if (!result.releaseGate.canReleaseAiReview) return { published: false, result };
  const receipt = await publish(review, result);
  return { published: true, result, receipt };
}
