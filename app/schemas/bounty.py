from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


class MilestoneCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    deadline: datetime
    payout_percentage: float = Field(default=0.0, ge=0, le=100)
    order: int = Field(default=0, ge=0)


class MilestoneResponse(MilestoneCreate):
    id: UUID
    challenge_id: UUID
    is_completed: bool

    class Config:
        from_attributes = True


class ChallengeCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    description: str = Field(..., min_length=10)
    scientific_context: Optional[str] = None
    challenge_type: str = "other"
    visibility: str = "public"
    deliverables: List[Any] = Field(default_factory=list)
    evaluation_criteria: List[Any] = Field(default_factory=list)
    scoring_rubric: Dict[str, Any] = Field(default_factory=dict)
    submission_start: Optional[datetime] = None
    submission_end: Optional[datetime] = None
    prize_amount: float = Field(..., ge=0)
    prize_currency: str = "USD"
    payout_schedule: List[Any] = Field(default_factory=list)
    anonymous: bool = False
    requires_nda: bool = False
    has_prequalification: bool = False
    ip_policy: str = "solver_retains"
    multi_phase: bool = False
    sponsor_org: Optional[str] = None
    milestones: List[MilestoneCreate] = Field(default_factory=list)

    @validator("submission_end")
    def end_after_start(cls, v, values):
        start = values.get("submission_start")
        if v and start and v <= start:
            raise ValueError("submission_end must be after submission_start")
        return v

    @validator("challenge_type")
    def valid_type(cls, v):
        valid = {
            "biotech", "materials", "climate", "ml",
            "chemistry", "physics", "quantum", "other",
        }
        if v not in valid:
            raise ValueError(f"challenge_type must be one of {valid}")
        return v

    @validator("visibility")
    def valid_visibility(cls, v):
        if v not in ("public", "private"):
            raise ValueError("visibility must be 'public' or 'private'")
        return v

    @validator("ip_policy")
    def valid_ip(cls, v):
        if v not in ("solver_retains", "transfer_on_payout", "open"):
            raise ValueError(
                "ip_policy must be 'solver_retains', 'transfer_on_payout', or 'open'"
            )
        return v


class ChallengeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=500)
    description: Optional[str] = None
    scientific_context: Optional[str] = None
    deliverables: Optional[List[Any]] = None
    evaluation_criteria: Optional[List[Any]] = None
    scoring_rubric: Optional[Dict[str, Any]] = None
    submission_start: Optional[datetime] = None
    submission_end: Optional[datetime] = None
    prize_amount: Optional[float] = Field(None, ge=0)
    payout_schedule: Optional[List[Any]] = None
    anonymous: Optional[bool] = None
    requires_nda: Optional[bool] = None
    ip_policy: Optional[str] = None
    status: Optional[str] = None


class ChallengeResponse(BaseModel):
    id: UUID
    title: str
    description: str
    scientific_context: Optional[str]
    challenge_type: str
    visibility: str
    deliverables: List[Any]
    evaluation_criteria: List[Any]
    scoring_rubric: Dict[str, Any]
    submission_start: Optional[datetime]
    submission_end: Optional[datetime]
    prize_amount: float
    prize_currency: str
    payout_schedule: List[Any]
    anonymous: bool
    requires_nda: bool
    has_prequalification: bool
    ip_policy: str
    multi_phase: bool
    sponsor_id: UUID
    sponsor_org: Optional[str]
    status: str
    escrow_funded: bool
    escrow_amount: float
    created_at: datetime
    updated_at: datetime
    milestones: List[MilestoneResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class DeliverableItem(BaseModel):
    name: str
    type: str  # code, dataset, notebook, document, model
    ref: str
    version: Optional[str] = None
    checksum: Optional[str] = None


class SubmissionPackageBuilder(BaseModel):
    """Automated manifest of deliverables."""
    deliverables: List[DeliverableItem]
    repository_ref: Optional[str] = None
    notebook_refs: List[str] = Field(default_factory=list)
    dataset_refs: List[str] = Field(default_factory=list)
    document_refs: List[str] = Field(default_factory=list)
    execution_refs: List[str] = Field(default_factory=list)


class SubmissionCreate(BaseModel):
    challenge_id: UUID
    title: str = Field(..., min_length=3, max_length=500)
    summary: str = Field(..., min_length=10)
    team_members: List[UUID] = Field(default_factory=list)
    institution_name: Optional[str] = None
    package: SubmissionPackageBuilder
    is_anonymous: bool = False


class SubmissionUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    team_members: Optional[List[UUID]] = None
    package: Optional[SubmissionPackageBuilder] = None


class SubmissionAdvancePhase(BaseModel):
    target_phase: str = Field(..., pattern="^(proposal|prototype|final)$")
    notes: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: UUID
    challenge_id: UUID
    team_lead_id: UUID
    team_members: List[Any]
    institution_name: Optional[str]
    title: str
    summary: str
    current_phase: str
    phase_history: List[Any]
    deliverable_manifest: List[Any]
    repository_ref: Optional[str]
    notebook_refs: List[Any]
    dataset_refs: List[Any]
    document_refs: List[Any]
    execution_refs: List[Any]
    status: str
    is_anonymous: bool
    version: int
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    submission_id: UUID
    reviewer_type: str = "platform"
    is_blind: bool = False
    scores: Dict[str, Any] = Field(default_factory=dict)
    checklist_results: Dict[str, Any] = Field(default_factory=dict)
    feedback: Optional[str] = None
    recommendation: Optional[str] = None


class ReviewUpdate(BaseModel):
    scores: Optional[Dict[str, Any]] = None
    checklist_results: Optional[Dict[str, Any]] = None
    feedback: Optional[str] = None
    recommendation: Optional[str] = None
    status: Optional[str] = None


class ReviewResponse(BaseModel):
    id: UUID
    submission_id: UUID
    reviewer_id: UUID
    reviewer_type: str
    is_blind: bool
    scores: Dict[str, Any]
    checklist_results: Dict[str, Any]
    feedback: Optional[str]
    recommendation: Optional[str]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class PayoutCreate(BaseModel):
    submission_id: UUID
    amount: float = Field(..., ge=0)
    milestone_id: Optional[UUID] = None
    payout_type: str = "final"
    recipient_type: str = "team"
    recipient_details: Dict[str, Any] = Field(default_factory=dict)


class PayoutResponse(BaseModel):
    id: UUID
    submission_id: UUID
    challenge_id: UUID
    amount: float
    currency: str
    milestone_id: Optional[UUID]
    payout_type: str
    recipient_type: str
    recipient_details: Dict[str, Any]
    status: str
    escrow_ref: Optional[str]
    transaction_ref: Optional[str]
    failure_reason: Optional[str]
    created_at: datetime
    released_at: Optional[datetime]

    class Config:
        from_attributes = True


class PayoutAction(BaseModel):
    action: str = Field(..., pattern="^(escrow|release|cancel)$")
    escrow_ref: Optional[str] = None
    transaction_ref: Optional[str] = None
    failure_reason: Optional[str] = None


class ArbitrationChecklist(BaseModel):
    """Automated checklist for deliverables verification."""
    submission_id: UUID
    items: Dict[str, bool] = Field(default_factory=dict)
    notes: Optional[str] = None


class ChallengeTemplate(BaseModel):
    """Template for R&D verticals."""
    name: str
    challenge_type: str
    description_template: str
    default_deliverables: List[Any] = Field(default_factory=list)
    default_criteria: List[Any] = Field(default_factory=list)
    default_rubric: Dict[str, Any] = Field(default_factory=dict)
    default_milestones: List[Dict[str, Any]] = Field(default_factory=list)
