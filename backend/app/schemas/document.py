from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict

class DocumentChunkResponse(BaseModel):
    id: str
    chunk_index: int
    page_number: Optional[int] = None
    content: str
    metadata_json: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: str
    investigation_id: str
    filename: str
    file_type: str
    file_size: int
    storage_path: str
    status: str
    doc_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
