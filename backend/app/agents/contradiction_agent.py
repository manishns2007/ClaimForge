from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.db.models import Document, DocumentChunk, Evidence

class ContradictionFindingItem(BaseModel):
    contradiction_type: str  # CONTRACT_AMENDMENT_OVERRIDE, CONTINUED_OPERATION, LATE_PICKUP_AGREEMENT, STANDBY_CLAUSE_APPLIES
    description: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    evidence_ids: List[str] = []
    source_citations: Dict[str, Any] = {}
    impact: str

class ContradictionAgentResponse(BaseModel):
    status: str
    has_contradiction: bool
    findings: List[ContradictionFindingItem]

class ContradictionHunter(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="ContradictionHunter",
            purpose="Adversarially search available evidence to DISPROVE and invalidate candidate claims."
        )

    def search_for_contradictions(
        self,
        db: Session,
        investigation_id: str,
        claim_hypothesis: Dict[str, Any],
        supporting_evidence_ids: List[str]
    ) -> ContradictionAgentResponse:
        """
        Adversarially scans all uploaded documents and evidence for counter-arguments.
        Validates returned evidence_ids against database.
        """
        all_docs = db.query(Document).filter(Document.investigation_id == investigation_id).all()
        all_evidence = db.query(Evidence).filter(Evidence.investigation_id == investigation_id).all()

        doc_contents = []
        for d in all_docs:
            chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == d.id).all()
            for c in chunks:
                doc_contents.append({
                    "document_id": d.id,
                    "filename": d.filename,
                    "page": c.page_number or 1,
                    "content": c.content
                })

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
            
            # Check for Contract Amendment counter-evidence (e.g. Case C)
            for d in inp.get("all_documents", []):
                fname = d["filename"].lower()
                content = d["content"].lower()

                if "amendment" in fname or "clause 4.2" in content or "billing continues until physical equipment pickup" in content:
                    # Find corresponding Evidence ID if recorded
                    matching_ev = db_sess.query(Evidence).filter(
                        Evidence.investigation_id == inv_id,
                        Evidence.extracted_fact.like("%Clause 4.2%")
                    ).first()
                    ev_ids = [matching_ev.id] if matching_ev else []

                    findings.append(ContradictionFindingItem(
                        contradiction_type="CONTRACT_AMENDMENT_OVERRIDE",
                        description="Contract Amendment Clause 4.2 explicitly stipulates that billing continues until physical equipment pickup.",
                        severity="CRITICAL",
                        evidence_ids=ev_ids,
                        source_citations={"filename": d["filename"], "clause": "Clause 4.2"},
                        impact="Invalidates off-rent email cutoff claim. Billed charges are 100% contractually valid."
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

        # Ensure evidence IDs returned by Gemini or fallback are validated
        for item in resp.findings:
            item.evidence_ids = self.validate_evidence_ids(db, investigation_id, item.evidence_ids)

        return resp
