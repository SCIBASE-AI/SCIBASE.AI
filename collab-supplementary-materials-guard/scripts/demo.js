import {
  buildSupplementManifest,
  evaluateSupplementaryExport,
  samplePackets,
} from '../src/index.js';

const blockedEvaluation = evaluateSupplementaryExport(samplePackets.blocked);
const readyEvaluation = evaluateSupplementaryExport(samplePackets.ready);

console.log(JSON.stringify({
  blocked: buildSupplementManifest(samplePackets.blocked, blockedEvaluation),
  ready: buildSupplementManifest(samplePackets.ready, readyEvaluation),
}, null, 2));
