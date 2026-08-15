from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.db.models import Document, DocumentChunk
from backend.app.services.dynamic_extractor import DynamicExtractor


class CommunicationEventItem(BaseModel):
    event_type: str  # OFF_RENT_REQUEST, OFF_RENT_ACKNOWLEDGEMENT, EXTENSION_REQUEST, PICKUP_REQUEST, STANDBY_NOTICE
    timestamp_iso: Optional[str] = None
    participants: str = ""
    statement: str = ""
    confidence: float = 1.0
    source_document_id: Optional[str] = None


class CommunicationAgentResponse(BaseModel):
    status: str
    events: List[CommunicationEventItem] = []


class CommunicationInvestigator(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="CommunicationInvestigator",
            purpose="Extract operational & off-rent notice events from email communications."
        )

    def extract_communication_events(self, db: Session, investigation_id: str) -> CommunicationAgentResponse:
        email_docs = db.query(Document).filter(
            Document.investigation_id == investigation_id,
            Document.file_type.in_(["EML", "TXT"])
        ).all()

        email_chunks = []
        for doc in email_docs:
            chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
            for c in chunks:
                email_chunks.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "content": c.content
                })

        input_data = {"investigation_id": investigation_id, "email_chunks": email_chunks}

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
                            source_document_id=doc_id
                        ))

            if not events:
                return CommunicationAgentResponse(status="NO_COMMUNICATION_EVENTS_FOUND", events=[])

            return CommunicationAgentResponse(status="COMPLETED", events=events)

        return self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=CommunicationAgentResponse,
            fallback_fn=fallback_handler
        )
