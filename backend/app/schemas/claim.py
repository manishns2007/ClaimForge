from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.evidence import EvidenceResponse

class ClaimEvidenceLink(BaseModel):
    id: str
    claim_id: str
    evidence_id: str
    relation_type: str  # SUPPORTS, CONTRADICTS, CORROBORATES
    weight: float
    impact_score: float
    evidence: Optional[EvidenceResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ClaimCreate(BaseModel):
    investigation_id: str
    vendor_name: str
    invoice_number: str
    charge_id: Optional[str] = None
    original_amount: float
    disputed_amount: float
    reason: str
    recoverability_score: Optional[float] = 0.0
    expected_recovery_value: Optional[float] = 0.0
    recommendation: Optional[str] = "HUMAN_REVIEW"  # DISPUTE, HUMAN_REVIEW, DO_NOT_DISPUTE
    status: Optional[str] = "CANDIDATE"

class ClaimResponse(BaseModel):
    id: str
    investigation_id: str
    vendor_name: str
    invoice_number: str
    charge_id: Optional[str] = None
    original_amount: float
    disputed_amount: float
    reason: str
    recoverability_score: float
    expected_recovery_value: float
    recommendation: str
    status: str
    created_at: datetime
    updated_at: datetime
    evidence_links: Optional[List[ClaimEvidenceLink]] = []

    model_config = ConfigDict(from_attributes=True)
