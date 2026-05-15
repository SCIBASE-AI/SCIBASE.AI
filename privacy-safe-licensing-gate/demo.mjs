import {buildLicensingReadinessReport, samplePackages} from './src/privacy-safe-licensing-gate.mjs';

const report = buildLicensingReadinessReport(samplePackages);

console.log(JSON.stringify(report, null, 2));
