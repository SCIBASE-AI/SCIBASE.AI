import {
  buildTransferManifest,
  evaluateExportControlReadiness,
  sampleChallenges,
} from '../src/index.js';

const blockedEvaluation = evaluateExportControlReadiness(sampleChallenges.blocked);
const releasableEvaluation = evaluateExportControlReadiness(sampleChallenges.releasable);

console.log(JSON.stringify({
  blocked: buildTransferManifest(sampleChallenges.blocked, blockedEvaluation),
  releasable: buildTransferManifest(sampleChallenges.releasable, releasableEvaluation),
}, null, 2));
