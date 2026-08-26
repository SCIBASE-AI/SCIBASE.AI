from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.bounty import (
    ArbitrationChecklist,
    ChallengeCreate,
    ChallengeResponse,
    ChallengeUpdate,
    MilestoneResponse,
    PayoutAction,
    PayoutCreate,
    PayoutResponse,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
    SubmissionAdvancePhase,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionUpdate,
)
from app.services.bounty_service import BountyService

router = APIRouter(prefix="/bounty", tags=["bounty"])


# ---------------------------------------------------------------------------
# Challenge endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/challenges",
    response_model=ChallengeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_challenge(
    challenge_in: ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = BountyService.create_challenge(db, current_user.id, challenge_in)
    return challenge


@router.get("/challenges", response_model=List[ChallengeResponse])
def list_challenges(
    status_filter: Optional[str] = Query(None, alias="status"),
    challenge_type: Optional[str] = Query(None),
    visibility: Optional[str] = Query(None),
    sponsor_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    items, _ = BountyService.list_challenges(
        db,
        status_filter=status_filter,
        challenge_type=challenge_type,
        visibility=visibility,
        sponsor_id=sponsor_id,
        skip=skip,
        limit=limit,
    )
    return items


@router.get("/challenges/{challenge_id}", response_model=ChallengeResponse)
def get_challenge(challenge_id: UUID, db: Session = Depends(get_db)):
    challenge = BountyService.get_challenge(db, challenge_id)
    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )
    return challenge


@router.patch("/challenges/{challenge_id}", response_model=ChallengeResponse)
def update_challenge(
    challenge_id: UUID,
    challenge_in: ChallengeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = BountyService.get_challenge(db, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.sponsor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the challenge sponsor")
    updated = BountyService.update_challenge(db, challenge_id, challenge_in)
    return updated


@router.post(
    "/challenges/{challenge_id}/publish",
    response_model=ChallengeResponse,
)
def publish_challenge(
    challenge_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = BountyService.get_challenge(db, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.sponsor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the challenge sponsor")
    try:
        return BountyService.publish_challenge(db, challenge_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/challenges/{challenge_id}/escrow",
    response_model=ChallengeResponse,
)
def fund_escrow(
    challenge_id: UUID,
    amount: float,
    escrow_ref: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = BountyService.get_challenge(db, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.sponsor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the challenge sponsor")
    try:
        return BountyService.fund_escrow(db, challenge_id, amount, escrow_ref)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

@router.get("/templates", response_model=List[str])
def list_templates():
    return BountyService.list_templates()


@router.get("/templates/{template_key}")
def get_template(template_key: str):
    tpl = BountyService.get_template(template_key)
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return tpl


# ---------------------------------------------------------------------------
# Submission endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/submissions",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_submission(
    submission_in: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return BountyService.create_submission(
            db, current_user.id, submission_in
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/submissions", response_model=List[SubmissionResponse])
def list_submissions(
    challenge_id: Optional[UUID] = Query(None),
    team_lead_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    items, _ = BountyService.list_submissions(
        db,
        challenge_id=challenge_id,
        team_lead_id=team_lead_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )
    return items


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
def get_submission(submission_id: UUID, db: Session = Depends(get_db)):
    submission = BountyService.get_submission(db, submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


@router.patch("/submissions/{submission_id}", response_model=SubmissionResponse)
def update_submission(
    submission_id: UUID,
    submission_in: SubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = BountyService.get_submission(db, submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.team_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the submission team lead")
    try:
        return BountyService.update_submission(db, submission_id, submission_in)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/submissions/{submission_id}/submit",
    response_model=SubmissionResponse,
)
def submit_for_review(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = BountyService.get_submission(db, submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.team_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the submission team lead")
    try:
        return BountyService.submit_for_review(db, submission_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/submissions/{submission_id}/advance-phase",
    response_model=SubmissionResponse,
)
def advance_phase(
    submission_id: UUID,
    phase_in: SubmissionAdvancePhase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = BountyService.get_submission(db, submission_id)
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.team_lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the submission team lead")
    try:
        return BountyService.advance_phase(db, submission_id, phase_in)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Review / Arbitration endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return BountyService.create_review(db, current_user.id, review_in)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/reviews", response_model=List[ReviewResponse])
def list_reviews(
    submission_id: Optional[UUID] = Query(None),
    reviewer_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
):
    return BountyService.list_reviews(
        db, submission_id=submission_id, reviewer_id=reviewer_id
    )


@router.get("/reviews/{review_id}", response_model=ReviewResponse)
def get_review(review_id: UUID, db: Session = Depends(get_db)):
    review = BountyService.get_review(db, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.patch("/reviews/{review_id}/complete", response_model=ReviewResponse)
def complete_review(
    review_id: UUID,
    review_in: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = BountyService.get_review(db, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.reviewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the assigned reviewer")
    updated = BountyService.complete_review(db, review_id, review_in)
    return updated


@router.post("/arbitration/checklist")
def run_arbitration_checklist(
    checklist: ArbitrationChecklist,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return BountyService.run_arbitration_checklist(db, checklist)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# Payout endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/payouts",
    response_model=PayoutResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payout(
    payout_in: PayoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return BountyService.create_payout(db, payout_in)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/payouts", response_model=List[PayoutResponse])
def list_payouts(
    challenge_id: Optional[UUID] = Query(None),
    submission_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    return BountyService.list_payouts(
        db,
        challenge_id=challenge_id,
        submission_id=submission_id,
        status_filter=status_filter,
    )


@router.get("/payouts/{payout_id}", response_model=PayoutResponse)
def get_payout(payout_id: UUID, db: Session = Depends(get_db)):
    payout = BountyService.get_payout(db, payout_id)
    if payout is None:
        raise HTTPException(status_code=404, detail="Payout not found")
    return payout


@router.post("/payouts/{payout_id}/action", response_model=PayoutResponse)
def execute_payout_action(
    payout_id: UUID,
    action_in: PayoutAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return BountyService.execute_payout_action(db, payout_id, action_in)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/submissions/{submission_id}/award",
    response_model=PayoutResponse,
)
def award_submission(
    submission_id: UUID,
    amount: Optional[float] = None,
    recipient_type: str = "team",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        _, payout = BountyService.award_submission(
            db,
            submission_id,
            payout_amount=amount,
            recipient_type=recipient_type,
        )
        return payout
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/submissions/{submission_id}/honorable",
    response_model=PayoutResponse,
)
def mark_honorable_mention(
    submission_id: UUID,
    amount: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return BountyService.mark_honorable_mention(db, submission_id, amount)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/milestones/{milestone_id}/complete",
    response_model=PayoutResponse,
)
def complete_milestone(
    milestone_id: UUID,
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        payout = BountyService.complete_milestone(db, milestone_id, submission_id)
        if payout is None:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return payout
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
