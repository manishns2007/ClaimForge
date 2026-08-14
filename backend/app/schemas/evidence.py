from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class EvidenceCreate(BaseModel):
    investigation_id: str
    source_document_id: Optional[str] = None
    source_type: str  # PDF, CSV, EML, TXT
    extracted_fact: str
    timestamp: Optional[datetime] = None
    location_reference: Optional[str] = None
    extraction_method: Optional[str] = "DETERMINISTIC_PARSER"
    confidence: Optional[float] = 1.0
    source_citation: Dict[str, Any]

class EvidenceResponse(BaseModel):
    id: str
    investigation_id: str
    source_document_id: Optional[str] = None
    source_type: str
    extracted_fact: str
    timestamp: Optional[datetime] = None
    location_reference: Optional[str] = None
    extraction_method: str
    confidence: float
    source_citation: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
