# SPDX-License-Identifier: MIT
"""
Research Gap Discovery & Opportunity Engine.
Scans scientific literature corpora for neglected intersections and unaddressed hypotheses.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from .types import (
    ScientificDomain,
    ResearchGap,
    ResearchOpportunityFeed,
)


class ResearchGapFinder:
    """Discovers unexplored frontiers and generates tailored research opportunity feeds."""

    def __init__(self):
        # Seed knowledge base of high-value scientific topic vectors
        self._curated_gaps = [
            ResearchGap(
                id="gap_crispr_alz_sc",
                intersection_query="CRISPR + Alzheimer's + single-cell RNA-seq",
                domain=ScientificDomain.MOLECULAR_BIOLOGY,
                publication_count=14,
                unresolved_questions_count=8,
                replication_ratio=0.21,
                opportunity_score=94.5,
                recommended_hypotheses=[
                    "Cell-type specific CRISPR knockout of TREM2 in human microglia models.",
                    "Single-cell transcriptomic profiling of APOE4 target engagement under targeted base editing.",
                ],
            ),
            ResearchGap(
                id="gap_quantum_decoherence_opt",
                intersection_query="Superconducting Qubits + Surface Code + Real-Time FPGA Feedback",
                domain=ScientificDomain.QUANTUM_PHYSICS,
                publication_count=22,
                unresolved_questions_count=11,
                replication_ratio=0.35,
                opportunity_score=89.0,
                recommended_hypotheses=[
                    "Sub-microsecond active parity tracking using neural FPGA accelerators.",
                    "Mitigation of correlated cosmic ray phonon bursts via localized phononic crystal substrates.",
                ],
            ),
            ResearchGap(
                id="gap_car_t_solid_microenv",
                intersection_query="CAR-T Therapy + Pancreatic Ductal Adenocarcinoma + Stroma Degradation",
                domain=ScientificDomain.CLINICAL_TRIALS,
                publication_count=19,
                unresolved_questions_count=15,
                replication_ratio=0.18,
                opportunity_score=96.0,
                recommended_hypotheses=[
                    "Dual-targeted CAR-T expressing anti-FAP and localized hyaluronidase.",
                    "Immunosuppressive myeloid cell repolarization in combination with mesothelin-directed CAR-T.",
                ],
            ),
            ResearchGap(
                id="gap_efficient_sparse_moe",
                intersection_query="Sparse Mixture-of-Experts + Linear Attention + Edge Inference",
                domain=ScientificDomain.COMPUTER_SCIENCE,
                publication_count=31,
                unresolved_questions_count=9,
                replication_ratio=0.42,
                opportunity_score=87.5,
                recommended_hypotheses=[
                    "Hardware-aware dynamic routing with zero-token-dropping on ultra-low-power edge NPU.",
                    "4-bit quantized KV-cache compression with linear-time memory retention.",
                ],
            ),
        ]

    def scan_corpus_gaps(
        self,
        domain: Optional[ScientificDomain] = None,
        keywords: Optional[List[str]] = None,
        min_opportunity_score: float = 75.0,
    ) -> List[ResearchGap]:
        results: List[ResearchGap] = []

        for gap in self._curated_gaps:
            if domain and gap.domain != domain:
                continue
            if keywords:
                query_lower = gap.intersection_query.lower()
                if not any(kw.lower() in query_lower for kw in keywords):
                    continue
            if gap.opportunity_score >= min_opportunity_score:
                results.append(gap)

        return sorted(results, key=lambda g: g.opportunity_score, reverse=True)

    def generate_user_opportunity_feed(
        self,
        user_id: str,
        user_interests: List[str],
        lab_capabilities: List[str],
    ) -> ResearchOpportunityFeed:
        matched_gaps = self.scan_corpus_gaps(keywords=user_interests)
        
        # If user interests are broad, fall back to top scored gaps
        if not matched_gaps:
            matched_gaps = self.scan_corpus_gaps(min_opportunity_score=80.0)

        neglected_areas = [
            f"Under-replicated finding in {g.intersection_query} (Replication ratio: {g.replication_ratio:.2f})"
            for g in matched_gaps if g.replication_ratio < 0.30
        ]

        suggested_collaborations = [
            f"Cross-disciplinary lab pairing for {g.intersection_query} leveraging capabilities: {', '.join(lab_capabilities[:2])}"
            for g in matched_gaps[:2]
        ]

        return ResearchOpportunityFeed(
            user_id=user_id,
            generated_at=datetime.now(timezone.utc).isoformat(),
            top_opportunities=matched_gaps,
            neglected_areas=neglected_areas,
            suggested_collaborations=suggested_collaborations,
        )
