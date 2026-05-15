import {buildLicensingApiCatalog, buildLicensingReadinessReport, samplePackages} from './src/privacy-safe-licensing-gate.mjs';

const report = buildLicensingReadinessReport(samplePackages);
const catalog = buildLicensingApiCatalog(samplePackages);

console.log(JSON.stringify({readinessReport: report, licensingApiCatalog: catalog}, null, 2));
