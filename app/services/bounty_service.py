from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID, uuid4

from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session

from app.models.bounty import (
    Challenge,
    ChallengeStatus,
    ChallengeType,
    ChallengeVisibility,
    Milestone,
    Payout,
    PayoutStatus,
    PayoutType,
    RecipientType,
    Review,
    ReviewRecommendation,
    ReviewStatus,
    ReviewerType,
    Submission,
    SubmissionPhase,
    SubmissionStatus,
)
from app.schemas.bounty import (
    ArbitrationChecklist,
    ChallengeCreate,
    ChallengeTemplate,
    ChallengeUpdate,
    PayoutAction,
    PayoutCreate,
    ReviewCreate,
    ReviewUpdate,
    SubmissionAdvancePhase,
    SubmissionCreate,
    SubmissionPackageBuilder,
    SubmissionUpdate,
)

# ---------------------------------------------------------------------------
# Challenge Templates for R&D verticals
# ---------------------------------------------------------------------------

CHALLENGE_TEMPLATES: Dict[str, ChallengeTemplate] = {
    "biotech": ChallengeTemplate(
        name="Biotech Challenge",
        challenge_type="biotech",
        description_template=(
            "Describe the biological or biomedical problem, including "
            "relevant organisms, pathways, or datasets."
        ),
        default_deliverables=[
            {"name": "Analysis pipeline", "type": "code"},
            {"name": "Results dataset", "type": "dataset"},
            {"name": "Technical report", "type": "document"},
        ],
        default_criteria=[
            {"criterion": "Reproducibility", "weight": 0.25},
            {"criterion": "Biological validity", "weight": 0.35},
            {"criterion": "Methodology rigor", "weight": 0.25},
            {"criterion": "Documentation", "weight": 0.15},
        ],
        default_rubric={
            "pass_threshold": 70,
            "scale": "0-100",
        },
        default_milestones=[
            {"name": "Proposal", "payout_percentage": 20},
            {"name": "Prototype", "payout_percentage": 30},
            {"name": "Final", "payout_percentage": 50},
        ],
    ),
    "materials": ChallengeTemplate(
        name="Materials Science Challenge",
        challenge_type="materials",
        description_template=(
            "Describe the materials science problem, including relevant "
            "properties, compositions, or processing conditions."
        ),
        default_deliverables=[
            {"name": "Model / simulation", "type": "code"},
            {"name": "Characterization data", "type": "dataset"},
        ],
        default_criteria=[
            {"criterion": "Accuracy", "weight": 0.4},
            {"criterion": "Novelty", "weight": 0.3},
            {"criterion": "Feasibility", "weight": 0.3},
        ],
    ),
    "climate": ChallengeTemplate(
        name="Climate Challenge",
        challenge_type="climate",
        description_template=(
            "Describe the climate forecasting or mitigation problem, "
            "including region, timeframe, and data sources."
        ),
        default_deliverables=[
            {"name": "Forecasting model", "type": "code"},
            {"name": "Validation dataset", "type": "dataset"},
            {"name": "Whitepaper", "type": "document"},
        ],
        default_criteria=[
            {"criterion": "Forecast accuracy", "weight": 0.4},
            {"criterion": "Regional applicability", "weight": 0.3},
            {"criterion": "Scalability", "weight": 0.3},
        ],
    ),
    "ml": ChallengeTemplate(
        name="Machine Learning Challenge",
        challenge_type="ml",
        description_template=(
            "Describe the ML problem, including input/output, "
            "dataset characteristics, and evaluation metric."
        ),
        default_deliverables=[
            {"name": "Trained model", "type": "model"},
            {"name": "Training notebook", "type": "notebook"},
            {"name": "Evaluation script", "type": "code"},
        ],
        default_criteria=[
            {"criterion": "Performance metric", "weight": 0.4},
            {"criterion": "Generalization", "weight": 0.3},
            {"criterion": "Efficiency", "weight": 0.15},
            {"criterion": "Reproducibility", "weight": 0.15},
        ],
    ),
    "chemistry": ChallengeTemplate(
        name="Chemistry Challenge",
        challenge_type="chemistry",
        description_template=(
            "Describe the chemistry problem, including reactions, "
            "molecular structures, or properties of interest."
        ),
        default_deliverables=[
            {"name": "Computational model", "type": "code"},
            {"name": "Molecular dataset", "type": "dataset"},
        ],
        default_criteria=[
            {"criterion": "Accuracy", "weight": 0.4},
            {"criterion": "Novelty", "weight": 0.3},
            {"criterion": "Safety considerations", "weight": 0.3},
        ],
    ),
    "quantum": ChallengeTemplate(
        name="Quantum Computing Challenge",
        challenge_type="quantum",
        description_template=(
            "Describe the quantum computing problem, including qubit "
            "count, circuit depth, or noise model."
        ),
        default_deliverables=[
            {"name": "Quantum circuit / algorithm", "type": "code"},
            {"name": "Benchmark results", "type": "dataset"},
        ],
        default_criteria=[
            {"criterion": "Error reduction", "weight": 0.4},
            {"criterion": "Circuit efficiency", "weight": 0.3},
            {"criterion": "Scalability", "weight": 0.3},
        ],
    ),
}


class BountyService:
    """Service layer for the Scientific Bounty System."""

    # ------------------------------------------------------------------
    # Challenge Management
    # ------------------------------------------------------------------

    @staticmethod
    def create_challenge(
        db: Session, sponsor_id: UUID, challenge_in: ChallengeCreate
    ) -> Challenge:
        """Create a new scientific challenge."""
        challenge = Challenge(
            id=uuid4(),
            title=challenge_in.title,
            description=challenge_in.description,
            scientific_context=challenge_in.scientific_context,
            challenge_type=challenge_in.challenge_type,
            visibility=challenge_in.visibility,
            deliverables=challenge_in.deliverables,
            evaluation_criteria=challenge_in.evaluation_criteria,
            scoring_rubric=challenge_in.scoring_rubric,
            submission_start=challenge_in.submission_start,
            submission_end=challenge_in.submission_end,
            prize_amount=challenge_in.prize_amount,
            prize_currency=challenge_in.prize_currency,
            payout_schedule=challenge_in.payout_schedule,
            anonymous=challenge_in.anonymous,
            requires_nda=challenge_in.requires_nda,
            has_prequalification=challenge_in.has_prequalification,
            ip_policy=challenge_in.ip_policy,
            multi_phase=challenge_in.multi_phase,
            sponsor_id=sponsor_id,
            sponsor_org=challenge_in.sponsor_org,
            status=ChallengeStatus.DRAFT.value,
        )
        db.add(challenge)
        db.flush()

        for ms in challenge_in.milestones:
            milestone = Milestone(
                id=uuid4(),
                challenge_id=challenge.id,
                name=ms.name,
                description=ms.description,
                deadline=ms.deadline,
                payout_percentage=ms.payout_percentage,
                order=ms.order,
            )
            db.add(milestone)

        db.commit()
        db.refresh(challenge)
        return challenge

    @staticmethod
    def get_challenge(db: Session, challenge_id: UUID) -> Optional[Challenge]:
        return db.query(Challenge).filter(Challenge.id == challenge_id).first()

    @staticmethod
    def list_challenges(
        db: Session,
        *,
        status_filter: Optional[str] = None,
        challenge_type: Optional[str] = None,
        visibility: Optional[str] = None,
        sponsor_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Challenge], int]:
        query = db.query(Challenge)

        if status_filter:
            query = query.filter(Challenge.status == status_filter)
        if challenge_type:
            query = query.filter(Challenge.challenge_type == challenge_type)
        if visibility:
            query = query.filter(Challenge.visibility == visibility)
        if sponsor_id:
            query = query.filter(Challenge.sponsor_id == sponsor_id)

        total = query.count()
        items = (
            query.order_by(desc(Challenge.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    def update_challenge(
        db: Session, challenge_id: UUID, challenge_in: ChallengeUpdate
    ) -> Optional[Challenge]:
        challenge = BountyService.get_challenge(db, challenge_id)
        if challenge is None:
            return None

        update_data = challenge_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(challenge, field, value)

        db.add(challenge)
        db.commit()
        db.refresh(challenge)
        return challenge

    @staticmethod
    def publish_challenge(db: Session, challenge_id: UUID) -> Optional[Challenge]:
        """Move a challenge from DRAFT to OPEN."""
        challenge = BountyService.get_challenge(db, challenge_id)
        if challenge is None:
            return None
        if challenge.status != ChallengeStatus.DRAFT.value:
            raise ValueError(
                f"Challenge must be in DRAFT status to publish. Current: {challenge.status}"
            )
        if challenge.prize_amount <= 0:
            raise ValueError("Challenge must have a positive prize amount to publish")
        if not challenge.deliverables:
            raise ValueError("Challenge must define at least one deliverable")

        challenge.status = ChallengeStatus.OPEN.value
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
        return challenge

    @staticmethod
    def fund_escrow(
        db: Session, challenge_id: UUID, amount: float, escrow_ref: str
    ) -> Optional[Challenge]:
        """Fund the escrow account for a challenge."""
        challenge = BountyService.get_challenge(db, challenge_id)
        if challenge is None:
            return None
        if amount < challenge.prize_amount:
            raise ValueError(
                f"Escrow amount {amount} is less than prize amount {challenge.prize_amount}"
            )
        challenge.escrow_funded = True
        challenge.escrow_amount = amount
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
        return challenge

    @staticmethod
    def get_template(template_key: str) -> Optional[ChallengeTemplate]:
        return CHALLENGE_TEMPLATES.get(template_key)

    @staticmethod
    def list_templates() -> List[str]:
        return list(CHALLENGE_TEMPLATES.keys())

    # ------------------------------------------------------------------
    # Submission Management
    # ------------------------------------------------------------------

    @staticmethod
    def create_submission(
        db: Session,
        team_lead_id: UUID,
        submission_in: SubmissionCreate,
    ) -> Submission:
        """Create a new submission for a challenge."""
        challenge = BountyService.get_challenge(db, submission_in.challenge_id)
        if challenge is None:
            raise ValueError("Challenge not found")
        if challenge.status not in (
            ChallengeStatus.OPEN.value,
            ChallengeStatus.IN_PROGRESS.value,
        ):
            raise ValueError(
                f"Challenge is not open for submissions. Status: {challenge.status}"
            )

        now = datetime.utcnow()
        if challenge.submission_end and now > challenge.submission_end:
            raise ValueError("Submission deadline has passed")

        pkg = submission_in.package
        manifest = BountyService._build_manifest(pkg)

        is_anon = submission_in.is_anonymous or challenge.anonymous

        submission = Submission(
            id=uuid4(),
            challenge_id=submission_in.challenge_id,
            team_lead_id=team_lead_id,
            team_members=[str(m) for m in submission_in.team_members],
            institution_name=submission_in.institution_name,
            title=submission_in.title,
            summary=submission_in.summary,
            current_phase=SubmissionPhase.PROPOSAL.value,
            phase_history=[
                {
                    "phase": SubmissionPhase.PROPOSAL.value,
                    "entered_at": now.isoformat(),
                    "action": "created",
                }
            ],
            deliverable_manifest=manifest,
            repository_ref=pkg.repository_ref,
            notebook_refs=pkg.notebook_refs,
            dataset_refs=pkg.dataset_refs,
            document_refs=pkg.document_refs,
            execution_refs=pkg.execution_refs,
            status=SubmissionStatus.DRAFT.value,
            is_anonymous=is_anon,
        )
        db.add(submission)

        if challenge.status == ChallengeStatus.OPEN.value:
            challenge.status = ChallengeStatus.IN_PROGRESS.value
            db.add(challenge)

        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def _build_manifest(pkg: SubmissionPackageBuilder) -> List[Dict[str, Any]]:
        """Build a standardized deliverable manifest from a submission package."""
        manifest: List[Dict[str, Any]] = []
        for item in pkg.deliverables:
            entry = {
                "name": item.name,
                "type": item.type,
                "ref": item.ref,
                "version": item.version,
                "checksum": item.checksum,
                "included_at": datetime.utcnow().isoformat(),
            }
            manifest.append(entry)
        return manifest

    @staticmethod
    def get_submission(db: Session, submission_id: UUID) -> Optional[Submission]:
        return db.query(Submission).filter(Submission.id == submission_id).first()

    @staticmethod
    def list_submissions(
        db: Session,
        *,
        challenge_id: Optional[UUID] = None,
        team_lead_id: Optional[UUID] = None,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Submission], int]:
        query = db.query(Submission)
        if challenge_id:
            query = query.filter(Submission.challenge_id == challenge_id)
        if team_lead_id:
            query = query.filter(Submission.team_lead_id == team_lead_id)
        if status_filter:
            query = query.filter(Submission.status == status_filter)

        total = query.count()
        items = (
            query.order_by(desc(Submission.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    def update_submission(
        db: Session, submission_id: UUID, submission_in: SubmissionUpdate
    ) -> Optional[Submission]:
        submission = BountyService.get_submission(db, submission_id)
        if submission is None:
            return None
        if submission.status not in (
            SubmissionStatus.DRAFT.value,
            SubmissionStatus.SUBMITTED.value,
        ):
            raise ValueError(
                "Cannot update submission that is under review or already decided"
            )

        update_data = submission_in.dict(exclude_unset=True)
        if "package" in update_data and update_data["package"] is not None:
            pkg = SubmissionPackageBuilder(**update_data["package"])
            update_data["deliverable_manifest"] = BountyService._build_manifest(pkg)
            update_data["repository_ref"] = pkg.repository_ref
            update_data["notebook_refs"] = pkg.notebook_refs
            update_data["dataset_refs"] = pkg.dataset_refs
            update_data["document_refs"] = pkg.document_refs
            update_data["execution_refs"] = pkg.execution_refs
            del update_data["package"]

        update_data["version"] = submission.version + 1

        for field, value in update_data.items():
            setattr(submission, field, value)

        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def submit_for_review(db: Session, submission_id: UUID) -> Optional[Submission]:
        """Submit a draft submission for review."""
        submission = BountyService.get_submission(db, submission_id)
        if submission is None:
            return None
        if submission.status != SubmissionStatus.DRAFT.value:
            raise ValueError("Only draft submissions can be submitted for review")
        if not submission.deliverable_manifest:
            raise ValueError("Submission must include at least one deliverable")

        submission.status = SubmissionStatus.SUBMITTED.value
        submission.submitted_at = datetime.utcnow()
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def advance_phase(
        db: Session,
        submission_id: UUID,
        phase_in: SubmissionAdvancePhase,
    ) -> Optional[Submission]:
        """Advance a multi-phase submission to the next phase."""
        submission = BountyService.get_submission(db, submission_id)
        if submission is None:
            return None

        challenge = BountyService.get_challenge(db, submission.challenge_id)
        if challenge is None or not challenge.multi_phase:
            raise ValueError("Challenge does not support multi-phase submissions")

        valid_transitions = {
            SubmissionPhase.PROPOSAL.value: SubmissionPhase.PROTOTYPE.value,
            SubmissionPhase.PROTOTYPE.value: SubmissionPhase.FINAL.value,
        }
        expected_next = valid_transitions.get(submission.current_phase)
        if expected_next is None:
            raise ValueError("Already at final phase")
        if phase_in.target_phase != expected_next:
            raise ValueError(
                f"Expected next phase: {expected_next}, got: {phase_in.target_phase}"
            )

        now = datetime.utcnow()
        submission.current_phase = phase_in.target_phase
        submission.phase_history.append(
            {
                "phase": phase_in.target_phase,
                "entered_at": now.isoformat(),
                "action": "advanced",
                "notes": phase_in.notes,
            }
        )
        submission.version += 1
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    # ------------------------------------------------------------------
    # Review / Arbitration
    # ------------------------------------------------------------------

    @staticmethod
    def create_review(
        db: Session, reviewer_id: UUID, review_in: ReviewCreate
    ) -> Review:
        """Create a review for a submission."""
        submission = BountyService.get_submission(db, review_in.submission_id)
        if submission is None:
            raise ValueError("Submission not found")
        if submission.status not in (
            SubmissionStatus.SUBMITTED.value,
            SubmissionStatus.UNDER_REVIEW.value,
        ):
            raise ValueError("Submission is not in a reviewable state")

        review = Review(
            id=uuid4(),
            submission_id=review_in.submission_id,
            reviewer_id=reviewer_id,
            reviewer_type=review_in.reviewer_type,
            is_blind=review_in.is_blind or submission.is_anonymous,
            scores=review_in.scores,
            checklist_results=review_in.checklist_results,
            feedback=review_in.feedback,
            recommendation=review_in.recommendation,
            status=ReviewStatus.IN_PROGRESS.value,
        )
        db.add(review)

        if submission.status == SubmissionStatus.SUBMITTED.value:
            submission.status = SubmissionStatus.UNDER_REVIEW.value
            db.add(submission)

        db.commit()
        db.refresh(review)
        return review

    @staticmethod
    def get_review(db: Session, review_id: UUID) -> Optional[Review]:
        return db.query(Review).filter(Review.id == review_id).first()

    @staticmethod
    def list_reviews(
        db: Session,
        submission_id: Optional[UUID] = None,
        reviewer_id: Optional[UUID] = None,
    ) -> List[Review]:
        query = db.query(Review)
        if submission_id:
            query = query.filter(Review.submission_id == submission_id)
        if reviewer_id:
            query = query.filter(Review.reviewer_id == reviewer_id)
        return query.order_by(desc(Review.created_at)).all()

    @staticmethod
    def complete_review(
        db: Session, review_id: UUID, review_in: ReviewUpdate
    ) -> Optional[Review]:
        """Complete a review and optionally update the submission status."""
        review = BountyService.get_review(db, review_id)
        if review is None:
            return None

        update_data = review_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(review, field, value)

        review.status = ReviewStatus.COMPLETED.value
        review.completed_at = datetime.utcnow()
        db.add(review)

        if review.recommendation == ReviewRecommendation.ACCEPT.value:
            submission = BountyService.get_submission(db, review.submission_id)
            if submission:
                submission.status = SubmissionStatus.ACCEPTED.value
                db.add(submission)
        elif review.recommendation == ReviewRecommendation.REJECT.value:
            submission = BountyService.get_submission(db, review.submission_id)
            if submission:
                submission.status = SubmissionStatus.REJECTED.value
                db.add(submission)

        db.commit()
        db.refresh(review)
        return review

    @staticmethod
    def run_arbitration_checklist(
        db: Session, checklist: ArbitrationChecklist
    ) -> Dict[str, Any]:
        """Run an automated arbitration checklist against a submission."""
        submission = BountyService.get_submission(db, checklist.submission_id)
        if submission is None:
            raise ValueError("Submission not found")

        challenge = BountyService.get_challenge(db, submission.challenge_id)
        if challenge is None:
            raise ValueError("Challenge not found")

        required_deliverables = challenge.deliverables or []
        provided = {d.get("name"): d for d in submission.deliverable_manifest}

        results: List[Dict[str, Any]] = []
        all_passed = True

        for req in required_deliverables:
            req_name = req.get("name", "") if isinstance(req, dict) else str(req)
            req_type = req.get("type", "") if isinstance(req, dict) else ""
            matched = any(
                d.get("name") == req_name and d.get("type") == req_type
                for d in submission.deliverable_manifest
            )
            if not matched:
                matched = any(
                    d.get("type") == req_type for d in submission.deliverable_manifest
                )
            results.append(
                {
                    "name": req_name,
                    "type": req_type,
                    "present": matched,
                    "status": "pass" if matched else "fail",
                }
            )
            if not matched:
                all_passed = False

        custom_items = checklist.items
        for key, passed in custom_items.items():
            results.append(
                {
                    "name": key,
                    "present": passed,
                    "status": "pass" if passed else "fail",
                }
            )
            if not passed:
                all_passed = False

        return {
            "submission_id": str(checklist.submission_id),
            "all_passed": all_passed,
            "results": results,
            "notes": checklist.notes,
            "checked_at": datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------
    # Payout Management
    # ------------------------------------------------------------------

    @staticmethod
    def create_payout(db: Session, payout_in: PayoutCreate) -> Payout:
        """Create a payout record for a submission."""
        submission = BountyService.get_submission(db, payout_in.submission_id)
        if submission is None:
            raise ValueError("Submission not found")
        if submission.status not in (
            SubmissionStatus.ACCEPTED.value,
            SubmissionStatus.AWARDED.value,
            SubmissionStatus.HONORABLE_MENTION.value,
        ):
            raise ValueError(
                "Submission must be accepted, awarded, or honorable mention to create payout"
            )

        challenge = BountyService.get_challenge(db, submission.challenge_id)
        if challenge is None:
            raise ValueError("Challenge not found")

        total_paid = (
            db.query(Payout)
            .filter(
                and_(
                    Payout.submission_id == payout_in.submission_id,
                    Payout.status == PayoutStatus.RELEASED.value,
                )
            )
            .all()
        )
        paid_sum = sum(p.amount for p in total_paid)
        remaining = challenge.prize_amount - paid_sum
        if payout_in.amount > remaining and payout_in.payout_type != PayoutType.HONORABLE_MENTION.value:
            raise ValueError(
                f"Payout amount {payout_in.amount} exceeds remaining prize {remaining}"
            )

        payout = Payout(
            id=uuid4(),
            submission_id=payout_in.submission_id,
            challenge_id=submission.challenge_id,
            amount=payout_in.amount,
            currency=challenge.prize_currency,
            milestone_id=payout_in.milestone_id,
            payout_type=payout_in.payout_type,
            recipient_type=payout_in.recipient_type,
            recipient_details=payout_in.recipient_details,
            status=PayoutStatus.PENDING.value,
        )
        db.add(payout)
        db.commit()
        db.refresh(payout)
        return payout

    @staticmethod
    def get_payout(db: Session, payout_id: UUID) -> Optional[Payout]:
        return db.query(Payout).filter(Payout.id == payout_id).first()

    @staticmethod
    def list_payouts(
        db: Session,
        *,
        challenge_id: Optional[UUID] = None,
        submission_id: Optional[UUID] = None,
        status_filter: Optional[str] = None,
    ) -> List[Payout]:
        query = db.query(Payout)
        if challenge_id:
            query = query.filter(Payout.challenge_id == challenge_id)
        if submission_id:
            query = query.filter(Payout.submission_id == submission_id)
        if status_filter:
            query = query.filter(Payout.status == status_filter)
        return query.order_by(desc(Payout.created_at)).all()

    @staticmethod
    def execute_payout_action(
        db: Session, payout_id: UUID, action_in: PayoutAction
    ) -> Optional[Payout]:
        """Execute an escrow, release, or cancel action on a payout."""
        payout = BountyService.get_payout(db, payout_id)
        if payout is None:
            return None

        if action_in.action == "escrow":
            if payout.status != PayoutStatus.PENDING.value:
                raise ValueError("Only pending payouts can be escrowed")
            payout.status = PayoutStatus.ESCROWED.value
            payout.escrow_ref = action_in.escrow_ref
        elif action_in.action == "release":
            if payout.status not in (
                PayoutStatus.PENDING.value,
                PayoutStatus.ESCROWED.value,
            ):
                raise ValueError("Only pending or escrowed payouts can be released")
            payout.status = PayoutStatus.RELEASED.value
            payout.transaction_ref = action_in.transaction_ref
            payout.released_at = datetime.utcnow()

            submission = BountyService.get_submission(db, payout.submission_id)
            if submission and payout.payout_type == PayoutType.FINAL.value:
                submission.status = SubmissionStatus.AWARDED.value
                db.add(submission)
        elif action_in.action == "cancel":
            if payout.status == PayoutStatus.RELEASED.value:
                raise ValueError("Cannot cancel a released payout")
            payout.status = PayoutStatus.CANCELLED.value
            payout.failure_reason = action_in.failure_reason

        db.add(payout)
        db.commit()
        db.refresh(payout)
        return payout

    @staticmethod
    def award_submission(
        db: Session,
        submission_id: UUID,
        payout_amount: Optional[float] = None,
        recipient_type: str = RecipientType.TEAM.value,
        recipient_details: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Submission, Payout]:
        """Award a submission and create the final payout."""
        submission = BountyService.get_submission(db, submission_id)
        if submission is None:
            raise ValueError("Submission not found")
        if submission.status != SubmissionStatus.ACCEPTED.value:
            raise ValueError("Submission must be accepted before awarding")

        challenge = BountyService.get_challenge(db, submission.challenge_id)
        if challenge is None:
            raise ValueError("Challenge not found")

        amount = payout_amount if payout_amount is not None else challenge.prize_amount
        payout = BountyService.create_payout(
            db,
            PayoutCreate(
                submission_id=submission_id,
                amount=amount,
                payout_type=PayoutType.FINAL.value,
                recipient_type=recipient_type,
                recipient_details=recipient_details or {},
            ),
        )

        submission.status = SubmissionStatus.AWARDED.value
        db.add(submission)
        db.commit()
        db.refresh(submission)
        db.refresh(payout)
        return submission, payout

    @staticmethod
    def mark_honorable_mention(db: Session, submission_id: UUID, amount: float) -> Payout:
        """Mark a submission as honorable mention with a partial payout."""
        submission = BountyService.get_submission(db, submission_id)
        if submission is None:
            raise ValueError("Submission not found")
        if submission.status == SubmissionStatus.AWARDED.value:
            raise ValueError("Cannot mark an awarded submission as honorable mention")

        payout = BountyService.create_payout(
            db,
            PayoutCreate(
                submission_id=submission_id,
                amount=amount,
                payout_type=PayoutType.HONORABLE_MENTION.value,
                recipient_type=RecipientType.TEAM.value,
                recipient_details={},
            ),
        )

        submission.status = SubmissionStatus.HONORABLE_MENTION.value
        db.add(submission)
        db.commit()
        db.refresh(payout)
        return payout

    @staticmethod
    def complete_milestone(
        db: Session, milestone_id: UUID, submission_id: UUID
    ) -> Optional[Payout]:
        """Complete a milestone and create a partial payout."""
        milestone = (
            db.query(Milestone).filter(Milestone.id == milestone_id).first()
        )
        if milestone is None:
            return None

        challenge = BountyService.get_challenge(db, milestone.challenge_id)
        if challenge is None:
            return None

        milestone_payout_amount = (
            challenge.prize_amount * milestone.payout_percentage / 100.0
        )

        payout = BountyService.create_payout(
            db,
            PayoutCreate(
                submission_id=submission_id,
                amount=milestone_payout_amount,
                milestone_id=milestone_id,
                payout_type=PayoutType.MILESTONE.value,
                recipient_type=RecipientType.TEAM.value,
                recipient_details={},
            ),
        )

        milestone.is_completed = True
        db.add(milestone)
        db.commit()
        db.refresh(payout)
        return payout
