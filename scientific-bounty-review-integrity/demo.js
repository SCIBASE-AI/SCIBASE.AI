const ScientificBountyReviewIntegrity = require('./index.js');

const integrity = new ScientificBountyReviewIntegrity({ threshold: 0.7 });

const submission = {
  id: 'bounty_108_demo',
  title: 'Scientific Bounty Review Integrity Module',
  technical_merit: 0.95,
  reproducibility: 0.90,
  reviewer_affiliation: 'Independent'
};

const reviewers = [
  { name: 'Dr. Smith', reviewer_affiliation: 'University A' },
  { name: 'Dr. Jones', reviewer_affiliation: 'University B' },
  { name: 'Dr. Brown', reviewer_affiliation: 'Independent' }
];

const rubric = [
  { key: 'technical_merit', weight: 0.6 },
  { key: 'reproducibility', weight: 0.4 }
];

const decision = integrity.generateDecision(submission, reviewers, rubric, 1000);
console.log(JSON.stringify(decision, null, 2));
