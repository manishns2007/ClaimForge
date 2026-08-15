from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.db.models import Document, DocumentChunk
from backend.app.services.dynamic_extractor import DynamicExtractor


class ContractFindingItem(BaseModel):
    rule_type: str  # BILLING_BASIS, DAILY_RATE, HOURLY_RATE, OFF_RENT_TRIGGER, PICKUP_CONDITION, STANDBY_RATE
    rule_value: Any
    clarity: str = "EXPLICIT"  # EXPLICIT, IMPLIED, UNKNOWN
    confidence: float = 1.0
    source_document_id: Optional[str] = None
    page: Optional[int] = 1
    section_reference: Optional[str] = None
    evidence_text: str


class ContractAgentResponse(BaseModel):
    status: str  # COMPLETED, NO_CONTRACT_RULES_FOUND
    findings: List[ContractFindingItem] = []


class ContractIntelligenceAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="ContractIntelligenceAgent",
            purpose="Extract semantic contractual terms, billing basis, and off-rent triggers from contract PDFs."
        )

    def extract_findings(self, db: Session, investigation_id: str) -> ContractAgentResponse:
        docs = db.query(Document).filter(
            Document.investigation_id == investigation_id
        ).all()

        chunks_data = []
        for doc in docs:
            chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
            for c in chunks:
                chunks_data.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "page": c.page_number or 1,
                    "content": c.content
                })

        input_data = {"investigation_id": investigation_id, "document_chunks": chunks_data}

        def fallback_handler(db_sess: Session, inv_id: str, inp: Dict[str, Any]) -> ContractAgentResponse:
            findings: List[ContractFindingItem] = []
            seen_rules = set()

            for ch in inp.get("document_chunks", []):
                text = ch["content"]
                fname = ch["filename"]
                doc_id = ch["document_id"]
                page = ch.get("page", 1)

                rules = DynamicExtractor.extract_contract_rules(
                    text=text,
                    filename=fname,
                    doc_id=doc_id,
                    page=page
                )

                for r in rules:
                    rule_key = f"{r.rule_type}::{r.rule_value}::{doc_id}"
                    if rule_key not in seen_rules:
                        seen_rules.add(rule_key)
                        findings.append(ContractFindingItem(
                            rule_type=r.rule_type,
                            rule_value=r.rule_value,
                            clarity="EXPLICIT",
                            confidence=r.confidence,
                            source_document_id=doc_id,
                            page=page,
                            section_reference=r.section_reference,
                            evidence_text=r.matched_text
                        ))

            return ContractAgentResponse(status="COMPLETED", findings=findings)

        return self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=ContractAgentResponse,
            fallback_fn=fallback_handler
        )
