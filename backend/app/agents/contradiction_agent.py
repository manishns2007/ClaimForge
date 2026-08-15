import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.db.models import Evidence
from backend.app.services.document_retriever import HybridDocumentRetriever


class ContradictionFindingItem(BaseModel):
    contradiction_type: str = Field(description="CONTRACT_AMENDMENT_OVERRIDE, CONTINUED_OPERATION, LATE_PICKUP_AGREEMENT, STANDBY_CLAUSE_APPLIES")
    description: str = Field(description="Detailed factual description of the counter-evidence")
    severity: str = Field(default="MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")
    evidence_ids: List[str] = Field(default_factory=list, description="IDs of supporting evidence records in DB")
    source_citations: Dict[str, Any] = Field(default_factory=dict, description="Document filename, clause, page citations")
    impact: str = Field(description="Impact of contradiction on dispute recoverability")


class ContradictionAgentResponse(BaseModel):
    status: str = Field(description="Status: COMPLETED")
    has_contradiction: bool = Field(default=False, description="True if at least one valid contradiction was identified")
    findings: List[ContradictionFindingItem] = Field(default_factory=list, description="List of contradiction items")


class ContradictionHunter(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="ContradictionHunter",
            purpose="Adversarially search available evidence to DISPROVE and invalidate candidate claims using Hybrid RAG."
        )

    def search_for_contradictions(
        self,
        db: Session,
        investigation_id: str,
        claim_hypothesis: Dict[str, Any],
        supporting_evidence_ids: List[str]
    ) -> ContradictionAgentResponse:
        """
        Adversarially scans all uploaded documents and evidence for counter-arguments using Hybrid RAG.
        Validates returned evidence_ids against database.
        """
        retriever = HybridDocumentRetriever(db)
        all_chunks = retriever.get_chunks_for_investigation(investigation_id)

        # Adversarially search for counter-arguments
        counter_queries = [
            "contract amendment override",
            "physical equipment pickup condition",
            "billing continues until pickup",
            "written notice alone does not terminate charges"
        ]
        adversarial_chunks_dict = {c.id: c for c in all_chunks}
        for cq in counter_queries:
            matches = retriever.search_chunks(investigation_id, keywords=cq.split(), top_k=2)
            for m in matches:
                adversarial_chunks_dict[m.id] = m

        chunks = list(adversarial_chunks_dict.values())
        all_evidence = db.query(Evidence).filter(Evidence.investigation_id == investigation_id).all()

        doc_contents = [
            {
                "document_id": c.document_id,
                "filename": c.source_document_filename,
                "page": c.page_number or 1,
                "content": c.content,
                "score": c.score
            }
            for c in chunks
        ]

        evidence_items = [{
            "id": e.id,
            "fact": e.extracted_fact,
            "source": e.source_type,
            "citation": e.source_citation
        } for e in all_evidence]

        input_data = {
            "investigation_id": investigation_id,
            "adversarial_instruction": "You are not trying to validate this claim. You are trying to DISPROVE it. Search for contract amendments, pickup clauses, ongoing telemetry activity, or extension requests.",
            "candidate_claim": claim_hypothesis,
            "supporting_evidence": supporting_evidence_ids,
            "all_evidence": evidence_items,
            "all_documents": doc_contents
        }

        def fallback_handler(db_sess: Session, inv_id: str, inp: Dict[str, Any]) -> ContradictionAgentResponse:
            findings: List[ContradictionFindingItem] = []
            seen_contradictions = set()

            # Check for Contract Amendment counter-evidence
            for d in inp.get("all_documents", []):
                fname = (d.get("filename") or "").lower()
                content = d.get("content", "")
                content_lower = content.lower()
                doc_id = d.get("document_id")
                page = d.get("page", 1)

                if "amendment" in fname or "amendment" in content_lower:
                    if re.search(r"(?:physical|equipment)\s+(?:pickup|transport|return)", content_lower) or "pickup" in content_lower:
                        sec_match = re.search(r"(Clause\s+\d+(?:\.\d+)?|Section\s+\d+(?:\.\d+)?)", content, re.IGNORECASE)
                        sec_ref = sec_match.group(1) if sec_match else "Contract Amendment"

                        contra_key = f"{doc_id}::{sec_ref}"
                        if contra_key not in seen_contradictions:
                            seen_contradictions.add(contra_key)

                            matching_ev = db_sess.query(Evidence).filter(
                                Evidence.investigation_id == inv_id,
                                Evidence.source_document_id == doc_id
                            ).first()
                            ev_ids = [matching_ev.id] if matching_ev else []

                            findings.append(ContradictionFindingItem(
                                contradiction_type="CONTRACT_AMENDMENT_OVERRIDE",
                                description=f"{sec_ref} explicitly stipulates that billing continues until physical equipment pickup and transport.",
                                severity="CRITICAL",
                                evidence_ids=ev_ids,
                                source_citations={"filename": d.get("filename"), "clause": sec_ref, "page": page},
                                impact="Invalidates off-rent email cutoff claim. Billed charges are contractually valid per amendment."
                            ))

            # Validate evidence IDs against DB
            validated_findings = []
            for f in findings:
                f.evidence_ids = self.validate_evidence_ids(db_sess, inv_id, f.evidence_ids)
                validated_findings.append(f)

            return ContradictionAgentResponse(
                status="COMPLETED",
                has_contradiction=len(validated_findings) > 0,
                findings=validated_findings
            )

        resp = self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=ContradictionAgentResponse,
            fallback_fn=fallback_handler
        )

        for item in resp.findings:
            item.evidence_ids = self.validate_evidence_ids(db, investigation_id, item.evidence_ids)

        return resp
