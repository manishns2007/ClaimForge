from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.services.document_retriever import HybridDocumentRetriever, DocumentChunkDTO
from backend.app.services.dynamic_extractor import DynamicExtractor
from backend.app.services.grounding_validator import GroundingValidator


class ContractFindingItem(BaseModel):
    rule_type: str = Field(description="Contract rule type: BILLING_BASIS, DAILY_RATE, OFF_RENT_TRIGGER, PICKUP_CONDITION, STANDBY_RATE")
    rule_value: Any = Field(description="Extracted rule value (rate amount or condition string)")
    clarity: str = Field(default="EXPLICIT", description="EXPLICIT, IMPLIED, or UNKNOWN")
    confidence: float = Field(default=1.0, description="Extraction confidence score")
    source_document: Optional[str] = Field(default=None, description="Contract filename")
    source_document_id: Optional[str] = Field(default=None, description="Contract document database ID")
    page: Optional[int] = Field(default=1, description="Page number")
    section_reference: Optional[str] = Field(default=None, description="Clause or section identifier, e.g. Clause 4.2")
    evidence_text: str = Field(description="Verbatim contract quotation")
    matched_text: Optional[str] = Field(default=None, description="Verbatim matched text quote")


class ContractAgentResponse(BaseModel):
    status: str = Field(description="Extraction status: COMPLETED or NO_CONTRACT_RULES_FOUND")
    findings: List[ContractFindingItem] = Field(default_factory=list, description="Extracted contractual rule findings")


class ContractIntelligenceAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="ContractIntelligenceAgent",
            purpose="Extract semantic contractual terms, billing basis, and off-rent triggers from contract documents using Hybrid RAG."
        )

    def extract_findings(self, db: Session, investigation_id: str) -> ContractAgentResponse:
        retriever = HybridDocumentRetriever(db)
        
        # 1. Retrieve all contract chunks or run targeted clause retrieval across large MSAs
        all_chunks = retriever.get_chunks_for_investigation(investigation_id, file_types=["PDF"])
        
        # If large document set (> 5 pages), perform targeted Hybrid RAG clause searches
        if len(all_chunks) > 5:
            target_queries = [
                "standby weather credit",
                "off-rent notice deadline",
                "daily rental rate",
                "physical pickup condition",
                "billing continues until pickup"
            ]
            retrieved_chunk_dict = {}
            for q in target_queries:
                matched = retriever.search_clauses(investigation_id, q, top_k=3)
                for mc in matched:
                    retrieved_chunk_dict[mc.id] = mc
            chunks = list(retrieved_chunk_dict.values())
        else:
            chunks = all_chunks

        chunks_data = [
            {
                "document_id": c.document_id,
                "filename": c.source_document_filename,
                "page": c.page_number or 1,
                "content": c.content,
                "score": c.score
            }
            for c in chunks
        ]

        input_data = {
            "investigation_id": investigation_id,
            "document_chunks": chunks_data
        }

        def validator_fn(resp: ContractAgentResponse, src_chunks: List[DocumentChunkDTO]) -> Tuple[bool, List[str]]:
            if not resp.findings:
                return True, []
            validated, rejections = GroundingValidator.validate_contract_findings(resp.findings, src_chunks)
            if rejections:
                return False, rejections
            return True, []

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
                            source_document=fname,
                            source_document_id=doc_id,
                            page=page,
                            section_reference=r.section_reference,
                            evidence_text=r.matched_text,
                            matched_text=r.matched_text
                        ))

            return ContractAgentResponse(status="COMPLETED", findings=findings)

        return self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=ContractAgentResponse,
            fallback_fn=fallback_handler,
            source_chunks=chunks,
            grounding_validator_fn=validator_fn
        )
