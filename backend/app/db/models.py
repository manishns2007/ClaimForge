import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Text, Float, Integer, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    vertical: Mapped[str] = mapped_column(String(100), default="EQUIPMENT_RENTAL")
    status: Mapped[str] = mapped_column(String(50), default="PENDING")  # PENDING, INGESTING, READY, RUNNING, COMPLETED, FAILED
    total_analyzed_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_disputed_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_expected_recovery: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="investigation", cascade="all, delete-orphan")
    events_log: Mapped[List["InvestigationEvent"]] = relationship("InvestigationEvent", back_populates="investigation", cascade="all, delete-orphan")
    entities: Mapped[List["Entity"]] = relationship("Entity", back_populates="investigation", cascade="all, delete-orphan")
    events: Mapped[List["Event"]] = relationship("Event", back_populates="investigation", cascade="all, delete-orphan")
    charges: Mapped[List["Charge"]] = relationship("Charge", back_populates="investigation", cascade="all, delete-orphan")
    contract_rules: Mapped[List["ContractRule"]] = relationship("ContractRule", back_populates="investigation", cascade="all, delete-orphan")
    evidence_items: Mapped[List["Evidence"]] = relationship("Evidence", back_populates="investigation", cascade="all, delete-orphan")
    claims: Mapped[List["Claim"]] = relationship("Claim", back_populates="investigation", cascade="all, delete-orphan")
    agent_runs: Mapped[List["AgentRun"]] = relationship("AgentRun", back_populates="investigation", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)  # PDF, CSV, EML, TXT
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="UPLOADED")  # UPLOADED, PARSING, PARSED, FAILED
    doc_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="documents")
    chunks: Mapped[List["DocumentChunk"]] = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # VENDOR, INVOICE, EQUIPMENT, CONTRACT
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    attributes_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="entities")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    source_document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # ENGINE_STOP, OFF_RENT_REQ, PICKUP, INVOICE_PERIOD
    description: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    location_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    source_citation: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="events")


class Charge(Base):
    __tablename__ = "charges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    source_document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    charge_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    billed_amount: Mapped[float] = mapped_column(Float, nullable=False)
    expected_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    units_billed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    units_actual: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source_citation: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="charges")


class ContractRule(Base):
    __tablename__ = "contract_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    source_document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    rule_type: Mapped[str] = mapped_column(String(100), nullable=False)  # BILLING_BASIS, DAILY_RATE, OFF_RENT_CONDITION, PICKUP_CONDITION
    rule_value_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    section_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source_citation: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="contract_rules")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    source_document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PDF, CSV, EML, TXT
    extracted_fact: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    location_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    extraction_method: Mapped[str] = mapped_column(String(50), default="DETERMINISTIC_PARSER")
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    source_citation: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="evidence_items")
    claim_links: Mapped[List["ClaimEvidence"]] = relationship("ClaimEvidence", back_populates="evidence", cascade="all, delete-orphan")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    charge_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("charges.id", ondelete="SET NULL"), nullable=True)
    original_amount: Mapped[float] = mapped_column(Float, nullable=False)
    disputed_amount: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    recoverability_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 to 1.0
    expected_recovery_value: Mapped[float] = mapped_column(Float, default=0.0)
    recommendation: Mapped[str] = mapped_column(String(50), default="HUMAN_REVIEW")  # DISPUTE, HUMAN_REVIEW, DO_NOT_DISPUTE
    status: Mapped[str] = mapped_column(String(50), default="CANDIDATE")  # CANDIDATE, INVESTIGATING, VERIFIED, HUMAN_REVIEW, APPROVED, REJECTED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="claims")
    evidence_links: Mapped[List["ClaimEvidence"]] = relationship("ClaimEvidence", back_populates="claim", cascade="all, delete-orphan")


class ClaimEvidence(Base):
    __tablename__ = "claim_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    claim_id: Mapped[str] = mapped_column(String(36), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    evidence_id: Mapped[str] = mapped_column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False)
    relation_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SUPPORTS, CONTRADICTS, CORROBORATES
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    impact_score: Mapped[float] = mapped_column(Float, default=0.0)

    claim: Mapped["Claim"] = relationship("Claim", back_populates="evidence_links")
    evidence: Mapped["Evidence"] = relationship("Evidence", back_populates="claim_links")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    input_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    output_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="agent_runs")


class InvestigationEvent(Base):
    __tablename__ = "investigation_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="events_log")


class AgentFindingRecord(Base):
    __tablename__ = "agent_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # CONTRACT, FINANCIAL, COMMUNICATION, REASONING
    finding_summary: Mapped[str] = mapped_column(Text, nullable=False)
    finding_data_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    investigation: Mapped["Investigation"] = relationship("Investigation")


class ContradictionRecord(Base):
    __tablename__ = "contradictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    claim_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("claims.id", ondelete="SET NULL"), nullable=True)
    contradiction_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    source_citations_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    evidence_ids_json: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    investigation: Mapped["Investigation"] = relationship("Investigation")

