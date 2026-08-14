from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class InvestigationEventCreate(BaseModel):
    investigation_id: str
    event_type: str
    message: str
    details_json: Optional[Dict[str, Any]] = None

class InvestigationEventResponse(BaseModel):
    id: str
    investigation_id: str
    event_type: str
    message: str
    details_json: Optional[Dict[str, Any]] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
