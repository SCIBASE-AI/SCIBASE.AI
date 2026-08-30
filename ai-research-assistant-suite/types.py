# SPDX-License-Identifier: MIT
"""
Domain models and dataclasses for the AI-Powered Research Assistant Suite.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone


class ScientificDomain(str, Enum):
    MOLECULAR_BIOLOGY = "MOLECULAR_BIOLOGY"
    QUANTUM_PHYSICS = "QUANTUM_PHYSICS"
    CLINICAL_TRIALS = "CLINICAL_TRIALS"
    COMPUTER_SCIENCE = "COMPUTER_SCIENCE"
    GENERAL_SCIENCE = "GENERAL_SCIENCE"


class ReviewSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ReviewCategory(str, Enum):
    CLARITY = "CLARITY"
    METHODOLOGY = "METHODOLOGY"
    STATISTICAL = "STATISTICAL"
    CITATION = "CITATION"
    CLAIM_EVIDENCE = "CLAIM_EVIDENCE"


class Recommendation(str, Enum):
    ACCEPT = "ACCEPT"
    MINOR_REVISION = "MINOR_REVISION"
    MAJOR_REVISION = "MAJOR_REVISION"
    REJECT = "REJECT"


@dataclass
class ReviewFlag:
    category: ReviewCategory
    severity: ReviewSeverity
    message: str
    suggestion: str
    location: Optional[str] = None


@dataclass
class PeerReviewReport:
    id: str
    manuscript_title: str
    domain: ScientificDomain
    overall_score: float  # 0.0 - 100.0
    recommendation: Recommendation
    flags: List[ReviewFlag] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    domain_specific_checks: Dict[str, Any] = field(default_factory=dict)
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class DependencyCheck:
    package: str
    required_version: str
    installed_version: Optional[str] = None
    status: str = "MATCH"  # "MATCH", "MISMATCH", "MISSING"


@dataclass
class ReproducibilityAttempt:
    attempt_id: str
    timestamp: str
    environment: str
    passed: bool
    divergence_metric: float  # 0.0 to 1.0
    logs: List[str] = field(default_factory=list)


@dataclass
class ReproducibilityReport:
    project_id: str
    project_name: str
    confidence_score: float  # 0.0 - 100.0
    deterministic_execution: bool
    clean_pipelines_detected: bool
    raw_data_present: bool
    dependencies: List[DependencyCheck] = field(default_factory=list)
    attempts: List[ReproducibilityAttempt] = field(default_factory=list)
    status: str = "VERIFIED_REPRODUCIBLE"  # "VERIFIED_REPRODUCIBLE", "CONDITIONALLY_REPRODUCIBLE", "FAILED"
    summary: str = ""


@dataclass
class ResearchGap:
    id: str
    intersection_query: str
    domain: ScientificDomain
    publication_count: int
    unresolved_questions_count: int
    replication_ratio: float
    opportunity_score: float  # 0.0 - 100.0
    recommended_hypotheses: List[str] = field(default_factory=list)


@dataclass
class ResearchOpportunityFeed:
    user_id: str
    generated_at: str
    top_opportunities: List[ResearchGap] = field(default_factory=list)
    neglected_areas: List[str] = field(default_factory=list)
    suggested_collaborations: List[str] = field(default_factory=list)
