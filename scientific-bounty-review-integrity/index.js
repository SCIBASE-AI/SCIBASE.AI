const crypto = require('crypto');

class ScientificBountyReviewIntegrity {
  constructor(config = {}) {
    this.threshold = config.threshold || 0.7;
    this.conflictFields = config.conflictFields || ['reviewer_affiliation', 'funding_source'];
  }

  createEvidenceManifest(artifacts) {
    const manifest = {
      artifacts: artifacts.map(a => ({
        name: a.name,
        sha256: crypto.createHash('sha256').update(JSON.stringify(a)).digest('hex'),
        timestamp: new Date().toISOString()
      })),
      created_at: new Date().toISOString()
    };
    manifest.audit_hash = crypto.createHash('sha256')
      .update(JSON.stringify(manifest))
      .digest('hex');
    return manifest;
  }

  filterConflictedReviewers(reviewers, submission) {
    return reviewers.filter(r => {
      for (let field of this.conflictFields) {
        if (r[field] === submission[field]) return false;
      }
      return true;
    });
  }

  evaluateRubric(submission, rubric) {
    let totalScore = 0;
    let totalWeight = 0;
    for (let criterion of rubric) {
      const score = submission[criterion.key] || 0;
      const weight = criterion.weight || 1;
      totalScore += score * weight;
      totalWeight += weight;
    }
    const normalizedScore = totalScore / totalWeight;
    return {
      score: normalizedScore,
      passes: normalizedScore >= this.threshold,
      threshold: this.threshold
    };
  }

  calculatePayoutSplits(totalAmount, milestones) {
    const splits = [];
    let remaining = totalAmount;
    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      const amount = i === milestones.length - 1
        ? remaining
        : Math.floor(totalAmount * milestone.percentage / 100);
      splits.push({
        milestone: milestone.name,
        percentage: milestone.percentage,
        amount: amount,
        status: 'pending'
      });
      remaining -= amount;
    }
    return splits;
  }

  generateDecision(submission, reviewers, rubric, totalPayout) {
    const validReviewers = this.filterConflictedReviewers(reviewers, submission);
    const evaluation = this.evaluateRubric(submission, rubric);
    const manifest = this.createEvidenceManifest([submission]);
    const payouts = this.calculatePayoutSplits(totalPayout, [
      { name: 'phase_1', percentage: 30 },
      { name: 'phase_2', percentage: 40 },
      { name: 'phase_3', percentage: 30 }
    ]);
    return {
      submission_id: submission.id,
      evaluation: evaluation,
      reviewer_count: validReviewers.length,
      conflict_exclusions: reviewers.length - validReviewers.length,
      evidence_manifest: manifest,
      payout_splits: payouts,
      ip_handoff_state: 'pending_acceptance',
      blocker_reasons: evaluation.passes ? [] : ['evaluation_threshold_not_met'],
      audit_hash: manifest.audit_hash,
      decision_timestamp: new Date().toISOString(),
      status: evaluation.passes ? 'approved' : 'rejected'
    };
  }
}

module.exports = ScientificBountyReviewIntegrity;
