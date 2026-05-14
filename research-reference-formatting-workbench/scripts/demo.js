'use strict';

const sample = require('../data/sample-manuscript.json');
const { buildPublicationPackage } = require('../src/reference-workbench');

const pkg = buildPublicationPackage(sample, { style: 'nature' });

console.log(`Manuscript: ${pkg.title}`);
console.log(`Style: ${pkg.style}`);
console.log(`Cited references: ${pkg.citations.citationOrder.length}`);
console.log(`Resolved cross-references: ${pkg.crossReferences.resolved.length}`);
console.log(`Ready for export: ${pkg.readiness.ready}`);
console.log(`Warnings: ${pkg.readiness.warnings.length}`);
console.log(`Digest: ${pkg.exportPlan.digest}`);
console.log('First bibliography entry:');
console.log(pkg.citations.bibliography[0].text);
