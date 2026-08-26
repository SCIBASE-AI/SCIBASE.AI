from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class ChallengeStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CLOSED = "closed"


class ChallengeVisibility(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class ChallengeType(str, enum.Enum):
    BIOTECH = "biotech"
    MATERIALS = "materials"
    CLIMATE = "climate"
    ML = "ml"
    CHEMISTRY = "chemistry"
    PHYSICS = "physics"
    QUANTUM = "quantum"
    OTHER = "other"


class IPPolicy(str, enum.Enum):
    SOLVER_RETAINS = "solver_retains"
    TRANSFER_ON_PAYOUT = "transfer_on_payout"
    OPEN = "open"


class SubmissionPhase(str, enum.Enum):
    PROPOSAL = "proposal"
    PROTOTYPE = "prototype"
    FINAL = "final"


class SubmissionStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    AWARDED = "awarded"
    HONORABLE_MENTION = "honorable_mention"


class ReviewerType(str, enum.Enum):
    PLATFORM = "platform"
    THIRD_PARTY = "third_party"
    PEER = "peer"


class ReviewRecommendation(str, enum.Enum):
    ACCEPT = "accept"
    REJECT = "reject"
    REVISE = "revise"
    HONORABLE = "honorable"


class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class PayoutStatus(str, enum.Enum):
    PENDING = "pending"
    ESCROWED = "escrowed"
    RELEASED = "released"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PayoutType(str, enum.Enum):
    MILESTONE = "milestone"
    FINAL = "final"
    HONORABLE_MENTION = "honorable_mention"


class RecipientType(str, enum.Enum):
    INDIVIDUAL = "individual"
    TEAM = "team"
    INSTITUTION = "institution"


class Challenge(Base):
    """A scientific or technical challenge posted by an organization."""

    __tablename__ = "bounty_challenges"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    title: str = Column(String(500), nullable=False, index=True)
    description: str = Column(Text, nullable=False)
    scientific_context: Optional[str] = Column(Text, nullable=True)

    challenge_type: str = Column(
        String(50), nullable=False, default=ChallengeType.OTHER.value, index=True
    )
    visibility: str = Column(
        String(20), nullable=False, default=ChallengeVisibility.PUBLIC.value
    )

    # Deliverables and evaluation
    deliverables: List[Any] = Column(JSON, default=list)
    evaluation_criteria: List[Any] = Column(JSON, default=list)
    scoring_rubric: Dict[str, Any] = Column(JSON, default=dict)

    # Timeline
    submission_start: Optional[datetime] = Column(DateTime, nullable=True)
    submission_end: Optional[datetime] = Column(DateTime, nullable=True)

    # Prize
    prize_amount: float = Column(Float, nullable=False, default=0.0)
    prize_currency: str = Column(String(10), nullable=False, default="USD")
    payout_schedule: List[Any] = Column(JSON, default=list)

    # Settings
    anonymous: bool = Column(Boolean, default=False, nullable=False)
    requires_nda: bool = Column(Boolean, default=False, nullable=False)
    has_prequalification: bool = Column(Boolean, default=False, nullable=False)
    ip_policy: str = Column(
        String(50), default=IPPolicy.SOLVER_RETAINS.value, nullable=False
    )
    multi_phase: bool = Column(Boolean, default=False, nullable=False)

    # Sponsor
    sponsor_id: UUID = Column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    sponsor_org: Optional[str] = Column(String(255), nullable=True)

    # Status
    status: str = Column(
        String(30),
        default=ChallengeStatus.DRAFT.value,
        nullable=False,
        index=True,
    )

    # Escrow
    escrow_funded: bool = Column(Boolean, default=False, nullable=False)
    escrow_amount: float = Column(Float, default=0.0, nullable=False)

    created_at: datetime = Column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    submissions: List["Submission"] = relationship(
        "Submission",
        back_populates="challenge",
        cascade="all, delete-orphan",
    )
    milestones: List["Milestone"] = relationship(
        "Milestone",
        back_populates="challenge",
        cascade="all, delete-orphan",
        order_by="Milestone.order",
    )


class Milestone(Base):
    """A milestone within a challenge with its own deadline and payout share."""

    __tablename__ = "bounty_milestones"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    challenge_id: UUID = Column(
        PGUUID(as_uuid=True),
        ForeignKey("bounty_challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: str = Column(String(255), nullable=False)
    description: Optional[str] = Column(Text, nullable=True)
    deadline: datetime = Column(DateTime, nullable=False)
    payout_percentage: float = Column(Float, default=0.0, nullable=False)
    order: int = Column(Integer, default=0, nullable=False)
    is_completed: bool = Column(Boolean, default=False, nullable=False)

    challenge: Optional["Challenge"] = relationship("Challenge", back_populates="milestones")


class Submission(Base):
    """A team's submission for a challenge, with versioned deliverables."""

    __tablename__ = "bounty_submissions"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    challenge_id: UUID = Column(
        PGUUID(as_uuid=True),
        ForeignKey("bounty_challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    team_lead_id: UUID = Column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    team_members: List[str] = Column(JSON, default=list)
    institution_name: Optional[str] = Column(String(255), nullable=True)

    title: str = Column(String(500), nullable=False)
    summary: str = Column(Text, nullable=False)

    # Phase tracking
    current_phase: str = Column(
        String(30),
        default=SubmissionPhase.PROPOSAL.value,
        nullable=False,
    )
    phase_history: List[Any] = Column(JSON, default=list)

    # Deliverables - standardized manifest
    deliverable_manifest: List[Any] = Column(JSON, default=list)
    repository_ref: Optional[str] = Column(String(500), nullable=True)
    notebook_refs: List[str] = Column(JSON, default=list)
    dataset_refs: List[str] = Column(JSON, default=list)
    document_refs: List[str] = Column(JSON, default=list)
    execution_refs: List[str] = Column(JSON, default=list)

    # Status
    status: str = Column(
        String(30),
        default=SubmissionStatus.DRAFT.value,
        nullable=False,
        index=True,
    )
    is_anonymous: bool = Column(Boolean, default=False, nullable=False)

    # Audit / versioning
    version: int = Column(Integer, default=1, nullable=False)
    created_at: datetime = Column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    submitted_at: Optional[datetime] = Column(DateTime, nullable=True)

    challenge: Optional["Challenge"] = relationship("Challenge", back_populates="submissions")
    reviews: List["Review"] = relationship(
        "Review",
        back_populates="submission",
        cascade="all, delete-orphan",
    )
    payouts: List["Payout"] = relationship(
        "Payout",
        back_populates="submission",
        cascade="all, delete-orphan",
    )


class Review(Base):
    """A review of a submission by a platform, third-party, or peer reviewer."""

    __tablename__ = "bounty_reviews"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    submission_id: UUID = Column(
        PGUUID(as_uuid=True),
        ForeignKey("bounty_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_id: UUID = Column(
        PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    reviewer_type: str = Column(
        String(30),
        default=ReviewerType.PLATFORM.value,
        nullable=False,
    )
    is_blind: bool = Column(Boolean, default=False, nullable=False)

    scores: Dict[str, Any] = Column(JSON, default=dict)
    checklist_results: Dict[str, Any] = Column(JSON, default=dict)
    feedback: Optional[str] = Column(Text, nullable=True)
    recommendation: Optional[str] = Column(String(30), nullable=True)

    status: str = Column(
        String(30),
        default=ReviewStatus.PENDING.value,
        nullable=False,
    )
    created_at: datetime = Column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    completed_at: Optional[datetime] = Column(DateTime, nullable=True)

    submission: Optional["Submission"] = relationship("Submission", back_populates="reviews")


class Payout(Base):
    """A payout record — escrowed, milestone, final, or honorable mention."""

    __tablename__ = "bounty_payouts"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    submission_id: UUID = Column(
        PGUUID(as_uuid=True),
        ForeignKey("bounty_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    challenge_id: UUID = Column(
        PGUUID(as_uuid=True),
        ForeignKey("bounty_challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    amount: float = Column(Float, nullable=False)
    currency: str = Column(String(10), default="USD", nullable=False)
    milestone_id: Optional[UUID] = Column(
        PGUUID(as_uuid=True),
        ForeignKey("bounty_milestones.id", ondelete="SET NULL"),
        nullable=True,
    )
    payout_type: str = Column(
        String(30),
        default=PayoutType.FINAL.value,
        nullable=False,
    )

    # Routing
    recipient_type: str = Column(
        String(30),
        default=RecipientType.TEAM.value,
        nullable=False,
    )
    recipient_details: Dict[str, Any] = Column(JSON, default=dict)

    status: str = Column(
        String(30),
        default=PayoutStatus.PENDING.value,
        nullable=False,
        index=True,
    )
    escrow_ref: Optional[str] = Column(String(255), nullable=True)
    transaction_ref: Optional[str] = Column(String(255), nullable=True)
    failure_reason: Optional[str] = Column(Text, nullable=True)

    created_at: datetime = Column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    released_at: Optional[datetime] = Column(DateTime, nullable=True)

    submission: Optional["Submission"] = relationship("Submission", back_populates="payouts")
