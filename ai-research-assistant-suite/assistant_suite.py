# SPDX-License-Identifier: MIT
"""
Unified AI Research Assistant Suite Orchestrator.
Exposes peer review, reproducibility verification, and research gap discovery.
"""

from typing import Dict, Any, List, Optional
from .types import (
    ScientificDomain,
    PeerReviewReport,
    ReproducibilityReport,
    ResearchOpportunityFeed,
)
from .peer_review_engine import PeerReviewEngine
from .reproducibility_checker import ReproducibilityChecker
from .research_gap_finder import ResearchGapFinder


class AIResearchAssistantSuite:
    """Master suite providing end-to-end intelligent research co-pilot capabilities."""

    def __init__(self):
        self.peer_reviewer = PeerReviewEngine()
        self.reproducibility_checker = ReproducibilityChecker()
        self.gap_finder = ResearchGapFinder()

    def run_auto_peer_review(
        self,
        title: str,
        abstract: str,
        methods: str,
        results: str,
        domain: ScientificDomain = ScientificDomain.GENERAL_SCIENCE,
        citations: Optional[List[str]] = None,
    ) -> PeerReviewReport:
        return self.peer_reviewer.evaluate_manuscript(
            title=title,
            abstract=abstract,
            methods=methods,
            results=results,
            domain=domain,
            citations=citations or [],
        )

    def verify_reproducibility(
        self,
        project_id: str,
        project_name: str,
        manifest_dependencies: Dict[str, str],
        installed_dependencies: Dict[str, str],
        files: List[str],
        execution_results: Optional[List[Dict[str, Any]]] = None,
    ) -> ReproducibilityReport:
        return self.reproducibility_checker.verify_project(
            project_id=project_id,
            project_name=project_name,
            manifest_dependencies=manifest_dependencies,
            installed_dependencies=installed_dependencies,
            files=files,
            execution_results=execution_results or [],
        )

    def discover_research_gaps(
        self,
        user_id: str,
        user_interests: List[str],
        lab_capabilities: List[str],
    ) -> ResearchOpportunityFeed:
        return self.gap_finder.generate_user_opportunity_feed(
            user_id=user_id,
            user_interests=user_interests,
            lab_capabilities=lab_capabilities,
        )
