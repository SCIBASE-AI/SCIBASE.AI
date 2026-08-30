# SPDX-License-Identifier: MIT
"""
Auto Peer Review Report Generation Engine.
Performs deterministic structural and methodological manuscript evaluation.
"""

import re
import uuid
from typing import Dict, Any, List
from .types import (
    ScientificDomain,
    ReviewFlag,
    ReviewCategory,
    ReviewSeverity,
    PeerReviewReport,
    Recommendation,
)


class PeerReviewEngine:
    """Automated reviewer providing editorial and methodological feedback."""

    def __init__(self):
        self._domain_validators = {
            ScientificDomain.MOLECULAR_BIOLOGY: self._validate_molecular_biology,
            ScientificDomain.QUANTUM_PHYSICS: self._validate_quantum_physics,
            ScientificDomain.CLINICAL_TRIALS: self._validate_clinical_trials,
            ScientificDomain.COMPUTER_SCIENCE: self._validate_computer_science,
            ScientificDomain.GENERAL_SCIENCE: self._validate_general_science,
        }

    def evaluate_manuscript(
        self,
        title: str,
        abstract: str,
        methods: str,
        results: str,
        domain: ScientificDomain = ScientificDomain.GENERAL_SCIENCE,
        citations: List[str] = None,
    ) -> PeerReviewReport:
        citations = citations or []
        flags: List[ReviewFlag] = []
        strengths: List[str] = []
        weaknesses: List[str] = []

        # 1. Clarity and Structure Analysis
        if len(abstract.strip().split()) < 50:
            flags.append(
                ReviewFlag(
                    category=ReviewCategory.CLARITY,
                    severity=ReviewSeverity.MEDIUM,
                    message="Abstract is too brief (< 50 words) to convey complete scientific scope.",
                    suggestion="Expand abstract with background, methodology, quantitative findings, and conclusion.",
                    location="Abstract",
                )
            )
        else:
            strengths.append("Comprehensive abstract articulating research problem and summary.")

        # 2. Statistical and Methodological Red Flags
        full_text = f"{methods} {results}".lower()
        
        # Check for statistical significance claims without sample size / p-values
        if "significant" in full_text and not re.search(r"p\s*<\s*0\.\d+|p\s*=\s*0\.\d+", full_text):
            flags.append(
                ReviewFlag(
                    category=ReviewCategory.STATISTICAL,
                    severity=ReviewSeverity.HIGH,
                    message="Claims statistical significance without reporting exact p-values or confidence intervals.",
                    suggestion="Report exact p-values, degrees of freedom, and 95% confidence intervals.",
                    location="Results",
                )
            )

        if "sample size" not in full_text and "n =" not in full_text and "n=" not in full_text:
            flags.append(
                ReviewFlag(
                    category=ReviewCategory.METHODOLOGY,
                    severity=ReviewSeverity.HIGH,
                    message="Sample size (N) is not explicitly defined in the methodology.",
                    suggestion="Explicitly state cohort/sample size (N) and statistical power calculations.",
                    location="Methods",
                )
            )
        else:
            strengths.append("Sample sizing and cohort parameters are clearly documented.")

        # 3. Claims vs. Evidence Alignment
        if "proves" in full_text or "undeniably" in full_text:
            flags.append(
                ReviewFlag(
                    category=ReviewCategory.CLAIM_EVIDENCE,
                    severity=ReviewSeverity.MEDIUM,
                    message="Overly definitive terminology ('proves', 'undeniably') found in empirical context.",
                    suggestion="Use rigorous hedging (e.g. 'demonstrates', 'strongly indicates', 'supports the hypothesis').",
                    location="Discussion/Results",
                )
            )

        # 4. Citation and Scope Integrity
        if len(citations) < 5:
            flags.append(
                ReviewFlag(
                    category=ReviewCategory.CITATION,
                    severity=ReviewSeverity.MEDIUM,
                    message=f"Sparse reference list ({len(citations)} citations). Prior art coverage may be insufficient.",
                    suggestion="Broaden literature review to include recent domain benchmarks and baseline studies.",
                    location="References",
                )
            )
        else:
            strengths.append(f"Solid literature grounding with {len(citations)} cited peer references.")

        # 5. Domain-Adaptive Verification
        validator = self._domain_validators.get(domain, self._validate_general_science)
        domain_checks = validator(methods, results)

        for check_name, passed in domain_checks.items():
            if not passed:
                flags.append(
                    ReviewFlag(
                        category=ReviewCategory.METHODOLOGY,
                        severity=ReviewSeverity.HIGH,
                        message=f"Domain requirement unsatisfied: {check_name.replace('_', ' ')}.",
                        suggestion=f"Provide documentation and verification for {check_name.replace('_', ' ')}.",
                        location=f"Domain Checks ({domain.value})",
                    )
                )

        # Calculate Overall Score and Recommendation
        base_score = 100.0
        for f in flags:
            if f.severity == ReviewSeverity.CRITICAL:
                base_score -= 30.0
            elif f.severity == ReviewSeverity.HIGH:
                base_score -= 15.0
            elif f.severity == ReviewSeverity.MEDIUM:
                base_score -= 8.0
            else:
                base_score -= 3.0

        overall_score = max(0.0, min(100.0, round(base_score, 1)))

        if overall_score >= 85.0:
            recommendation = Recommendation.ACCEPT
        elif overall_score >= 70.0:
            recommendation = Recommendation.MINOR_REVISION
        elif overall_score >= 50.0:
            recommendation = Recommendation.MAJOR_REVISION
        else:
            recommendation = Recommendation.REJECT

        if flags:
            weaknesses.extend([f.message for f in flags[:3]])

        return PeerReviewReport(
            id=f"rev_{uuid.uuid4().hex[:8]}",
            manuscript_title=title,
            domain=domain,
            overall_score=overall_score,
            recommendation=recommendation,
            flags=flags,
            strengths=strengths,
            weaknesses=weaknesses,
            domain_specific_checks=domain_checks,
        )

    # ── Domain-Specific Rule Validators ───────────────────────────────────

    def _validate_molecular_biology(self, methods: str, results: str) -> Dict[str, bool]:
        text = f"{methods} {results}".lower()
        return {
            "negative_and_positive_controls": "control" in text or "vehicle" in text,
            "accession_or_sequence_ids": bool(re.search(r"ncbi|genbank|uniprot|pdb|geo", text)),
            "replicate_counts_defined": bool(re.search(r"triplicate|replicates|n\s*=\s*\d+", text)),
        }

    def _validate_quantum_physics(self, methods: str, results: str) -> Dict[str, bool]:
        text = f"{methods} {results}".lower()
        return {
            "hamiltonian_or_operator_formulation": "hamiltonian" in text or "operator" in text or "state" in text,
            "coherence_or_fidelity_metrics": "fidelity" in text or "coherence" in text or "t1" in text or "t2" in text,
            "error_mitigation_documented": "error" in text or "noise" in text or "calibration" in text,
        }

    def _validate_clinical_trials(self, methods: str, results: str) -> Dict[str, bool]:
        text = f"{methods} {results}".lower()
        return {
            "randomized_controlled_protocol": "random" in text or "rct" in text or "double-blind" in text,
            "ethics_irb_approval": "irb" in text or "ethics" in text or "institutional review" in text or "consent" in text,
            "placebo_or_standard_of_care": "placebo" in text or "standard of care" in text or "control group" in text,
        }

    def _validate_computer_science(self, methods: str, results: str) -> Dict[str, bool]:
        text = f"{methods} {results}".lower()
        return {
            "hardware_and_runtime_specs": "gpu" in text or "cpu" in text or "ram" in text or "runtime" in text,
            "baseline_comparisons": "baseline" in text or "state-of-the-art" in text or "sota" in text or "benchmark" in text,
            "random_seed_reproducibility": "seed" in text or "deterministic" in text or "epochs" in text,
        }

    def _validate_general_science(self, methods: str, results: str) -> Dict[str, bool]:
        text = f"{methods} {results}".lower()
        return {
            "methodology_described": len(methods.strip()) > 100,
            "data_availability_statement": "data available" in text or "repository" in text or "supplementary" in text,
        }
