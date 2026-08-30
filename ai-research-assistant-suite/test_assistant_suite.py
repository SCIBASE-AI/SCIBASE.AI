# SPDX-License-Identifier: MIT
"""
Comprehensive Unit Test Suite for the AI-Powered Research Assistant Suite.
Validates peer review reports, reproducibility verification, and research gap discovery.
"""

import unittest
from .types import ScientificDomain, Recommendation
from .assistant_suite import AIResearchAssistantSuite
from .peer_review_engine import PeerReviewEngine
from .reproducibility_checker import ReproducibilityChecker
from .research_gap_finder import ResearchGapFinder


class TestAIResearchAssistantSuite(unittest.TestCase):

    def setUp(self):
        self.suite = AIResearchAssistantSuite()
        self.peer_engine = PeerReviewEngine()
        self.repro_checker = ReproducibilityChecker()
        self.gap_finder = ResearchGapFinder()

    def test_peer_review_flags_short_abstract_and_missing_p_values(self):
        report = self.peer_engine.evaluate_manuscript(
            title="Preliminary study on cellular growth",
            abstract="Short abstract with few details.",
            methods="We grew cells and observed significant differences across treatments.",
            results="Significant improvement seen in cell density.",
            domain=ScientificDomain.GENERAL_SCIENCE,
            citations=["Ref1", "Ref2"],
        )

        self.assertIsNotNone(report.id)
        self.assertLess(report.overall_score, 85.0)
        flag_categories = [f.category.value for f in report.flags]
        self.assertIn("CLARITY", flag_categories)
        self.assertIn("STATISTICAL", flag_categories)
        self.assertIn("CITATION", flag_categories)

    def test_peer_review_domain_template_clinical_trials_success(self):
        report = self.peer_engine.evaluate_manuscript(
            title="Phase II Double-Blind Randomized Controlled Trial of Compound X",
            abstract="We present a randomized, double-blind, placebo-controlled trial evaluating Compound X in 120 patients with moderate hypertension over 12 weeks of treatment.",
            methods="A double-blind randomized controlled trial (RCT) protocol was approved by the Institutional Review Board (IRB #2026-88). Sample size N = 120 (60 active, 60 placebo control group).",
            results="The primary endpoint achieved significant reduction in systolic BP (delta = -14.2 mmHg, p < 0.001, 95% CI [-18.1, -10.3]).",
            domain=ScientificDomain.CLINICAL_TRIALS,
            citations=["Ref1", "Ref2", "Ref3", "Ref4", "Ref5", "Ref6"],
        )

        self.assertEqual(report.recommendation, Recommendation.ACCEPT)
        self.assertGreaterEqual(report.overall_score, 85.0)
        self.assertTrue(report.domain_specific_checks.get("randomized_controlled_protocol"))
        self.assertTrue(report.domain_specific_checks.get("ethics_irb_approval"))
        self.assertTrue(report.domain_specific_checks.get("placebo_or_standard_of_care"))

    def test_peer_review_domain_template_quantum_physics(self):
        report = self.peer_engine.evaluate_manuscript(
            title="Surface Code Error Mitigation in Transmon Architectures",
            abstract="This paper introduces active error mitigation protocols on a 17-qubit superconducting quantum processor running surface code parity tracking across 500 syndrome cycles.",
            methods="We define the system Hamiltonian and calibrated qubit coherence T1 and T2 times. Noise calibration and dynamical decoupling pulses were applied.",
            results="State fidelity exceeded 99.4% with sample size n = 5000 measurement shots per circuit (p = 0.002).",
            domain=ScientificDomain.QUANTUM_PHYSICS,
            citations=["Q1", "Q2", "Q3", "Q4", "Q5"],
        )

        self.assertTrue(report.domain_specific_checks.get("hamiltonian_or_operator_formulation"))
        self.assertTrue(report.domain_specific_checks.get("coherence_or_fidelity_metrics"))
        self.assertTrue(report.domain_specific_checks.get("error_mitigation_documented"))

    def test_reproducibility_checker_verified_success(self):
        report = self.repro_checker.verify_project(
            project_id="proj_alpha_99",
            project_name="SingleCell-Transcriptomics-Pipeline",
            manifest_dependencies={"scanpy": "1.9.3", "anndata": "0.8.0", "numpy": "1.24.3"},
            installed_dependencies={"scanpy": "1.9.3", "anndata": "0.8.0", "numpy": "1.24.3"},
            files=["pipeline.py", "tests/test_pipeline.py", "data/raw_counts.csv", "requirements.txt"],
            execution_results=[
                {"passed": True, "divergence": 0.005, "environment": "Ubuntu 22.04 LTS / Python 3.10"}
            ],
        )

        self.assertEqual(report.status, "VERIFIED_REPRODUCIBLE")
        self.assertGreaterEqual(report.confidence_score, 85.0)
        self.assertTrue(report.deterministic_execution)
        self.assertTrue(report.raw_data_present)
        self.assertTrue(report.clean_pipelines_detected)
        self.assertEqual(len(report.dependencies), 3)

    def test_reproducibility_checker_missing_deps_failure(self):
        report = self.repro_checker.verify_project(
            project_id="proj_broken_01",
            project_name="Unpinned-Script",
            manifest_dependencies={"torch": "2.1.0", "cuda-toolkit": "12.1"},
            installed_dependencies={"torch": "1.12.0"},  # cuda-toolkit missing, torch mismatched
            files=["run.py"],  # No data, no test suite
            execution_results=[{"passed": False, "divergence": 0.45}],
        )

        self.assertEqual(report.status, "FAILED")
        self.assertLess(report.confidence_score, 60.0)
        self.assertFalse(report.deterministic_execution)
        self.assertFalse(report.raw_data_present)

    def test_research_gap_finder_corpus_scan(self):
        gaps = self.gap_finder.scan_corpus_gaps(domain=ScientificDomain.MOLECULAR_BIOLOGY)
        self.assertGreaterEqual(len(gaps), 1)
        top_gap = gaps[0]
        self.assertIn("CRISPR", top_gap.intersection_query)
        self.assertGreater(top_gap.opportunity_score, 80.0)
        self.assertGreaterEqual(len(top_gap.recommended_hypotheses), 1)

    def test_research_gap_user_feed_generation(self):
        feed = self.gap_finder.generate_user_opportunity_feed(
            user_id="researcher_101",
            user_interests=["Alzheimer's", "CRISPR", "RNA-seq"],
            lab_capabilities=["Next-Gen Sequencing (NovaSeq)", "Patch-Clamp Rig", "BSL-2 Culture"],
        )

        self.assertEqual(feed.user_id, "researcher_101")
        self.assertGreater(len(feed.top_opportunities), 0)
        self.assertGreater(len(feed.suggested_collaborations), 0)

    def test_unified_assistant_suite_orchestrator(self):
        review = self.suite.run_auto_peer_review(
            title="Unified Test Title",
            abstract="This is a comprehensive abstract covering our scientific goals, methodology, cohort analysis, and findings in full detail.",
            methods="Sample size n = 100 with clear control groups and data available online.",
            results="Significant p = 0.001 effect size observed across replicates.",
            domain=ScientificDomain.GENERAL_SCIENCE,
            citations=["C1", "C2", "C3", "C4", "C5"],
        )
        self.assertIsNotNone(review.id)

        repro = self.suite.verify_reproducibility(
            project_id="proj_unified",
            project_name="Unified Project",
            manifest_dependencies={"scipy": "1.10.0"},
            installed_dependencies={"scipy": "1.10.0"},
            files=["test.py", "data.csv"],
        )
        self.assertIsNotNone(repro.project_id)

        feed = self.suite.discover_research_gaps(
            user_id="user_test",
            user_interests=["quantum"],
            lab_capabilities=["Dilution Fridge"],
        )
        self.assertIsNotNone(feed.user_id)


if __name__ == "__main__":
    unittest.main()
