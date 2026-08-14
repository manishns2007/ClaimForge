from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.document import DocumentResponse

class InvestigationCreate(BaseModel):
    title: str
    vertical: Optional[str] = "EQUIPMENT_RENTAL"

class InvestigationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None

class InvestigationResponse(BaseModel):
    id: str
    title: str
    vertical: str
    status: str
    total_analyzed_amount: float
    total_disputed_amount: float
    total_expected_recovery: float
    created_at: datetime
    updated_at: datetime
    documents: Optional[List[DocumentResponse]] = []

    model_config = ConfigDict(from_attributes=True)
