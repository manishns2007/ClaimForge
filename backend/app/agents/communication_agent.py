from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.services.document_retriever import SqliteDocumentRetriever, DocumentChunkDTO
from backend.app.services.dynamic_extractor import DynamicExtractor
from backend.app.services.grounding_validator import GroundingValidator


class CommunicationEventItem(BaseModel):
    event_type: str = Field(description="Communication event type: OFF_RENT_REQUEST, OFF_RENT_ACKNOWLEDGEMENT, EXTENSION_REQUEST, PICKUP_REQUEST, STANDBY_NOTICE")
    timestamp_iso: Optional[str] = Field(default=None, description="ISO 8601 formatted timestamp")
    participants: str = Field(default="", description="Sender and recipient participants")
    statement: str = Field(default="", description="Verbatim statement or notice excerpt")
    confidence: float = Field(default=1.0, description="Extraction confidence score")
    source_document: Optional[str] = Field(default=None, description="Email filename")
    source_document_id: Optional[str] = Field(default=None, description="Document database ID")
    matched_text: Optional[str] = Field(default=None, description="Verbatim quotation from email text")


class CommunicationAgentResponse(BaseModel):
    status: str = Field(description="Extraction status: COMPLETED or NO_COMMUNICATION_EVENTS_FOUND")
    events: List[CommunicationEventItem] = Field(default_factory=list, description="Extracted communication events")


class CommunicationInvestigator(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="CommunicationInvestigator",
            purpose="Extract operational & off-rent notice events from email communications."
        )

    def extract_communication_events(self, db: Session, investigation_id: str) -> CommunicationAgentResponse:
        retriever = SqliteDocumentRetriever(db)
        email_chunks = retriever.get_chunks_for_investigation(investigation_id, file_types=["EML", "TXT"])
        if not email_chunks:
            # Fallback to all chunks if file_type filter yields none
            email_chunks = retriever.get_chunks_for_investigation(investigation_id)

        chunks_data = [
            {
                "document_id": c.document_id,
                "filename": c.source_document_filename,
                "content": c.content
            }
            for c in email_chunks
        ]

        input_data = {
            "investigation_id": investigation_id,
            "email_chunks": chunks_data
        }

        def validator_fn(resp: CommunicationAgentResponse, src_chunks: List[DocumentChunkDTO]) -> Tuple[bool, List[str]]:
            if not resp.events:
                return True, []
            validated, rejections = GroundingValidator.validate_communication_events(resp.events, src_chunks)
            if rejections:
                return False, rejections
            return True, []

        def fallback_handler(db_sess: Session, inv_id: str, inp: Dict[str, Any]) -> CommunicationAgentResponse:
            events: List[CommunicationEventItem] = []
            seen_events = set()

            for ch in inp.get("email_chunks", []):
                text = ch["content"]
                doc_id = ch["document_id"]
                fname = ch.get("filename", "")

                comm_events = DynamicExtractor.extract_communication_events(
                    text=text,
                    filename=fname,
                    doc_id=doc_id
                )

                for ce in comm_events:
                    ev_key = f"{ce.event_type}::{ce.timestamp_iso}::{doc_id}"
                    if ev_key not in seen_events:
                        seen_events.add(ev_key)
                        events.append(CommunicationEventItem(
                            event_type=ce.event_type,
                            timestamp_iso=ce.timestamp_iso,
                            participants=ce.participants,
                            statement=ce.statement,
                            confidence=ce.confidence,
                            source_document=fname,
                            source_document_id=doc_id,
                            matched_text=ce.statement
                        ))

            if not events:
                return CommunicationAgentResponse(status="NO_COMMUNICATION_EVENTS_FOUND", events=[])

            return CommunicationAgentResponse(status="COMPLETED", events=events)

        return self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=CommunicationAgentResponse,
            fallback_fn=fallback_handler,
            source_chunks=email_chunks,
            grounding_validator_fn=validator_fn
        )
