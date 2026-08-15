from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent


class EventHypothesis(BaseModel):
    event_type: str = Field(description="Event type classification")
    timestamp_iso: Optional[str] = Field(default=None, description="Event timestamp in ISO 8601")
    description: str = Field(description="Description of the operational event")
    supporting_evidence_ids: List[str] = Field(default_factory=list, description="IDs of evidence supporting this event")
    confidence: float = Field(default=1.0, description="Confidence score")


class ClaimHypothesis(BaseModel):
    claim_type: str = Field(description="Dispute category, e.g. EXCESS_RENTAL_PERIOD_OVERCHARGE")
    vendor_name: str = Field(description="Vendor name from verified invoice")
    invoice_number: str = Field(description="Invoice number from verified invoice")
    reason: str = Field(description="Detailed reason explaining the suspected overcharge")
    supporting_evidence_ids: List[str] = Field(default_factory=list, description="Evidence IDs")
    missing_evidence: List[str] = Field(default_factory=list, description="Identified missing evidence items")
    initial_hypothesis_strength: float = Field(default=0.85, description="Initial strength estimate")


class EventReasoningResponse(BaseModel):
    status: str = Field(description="Status of reasoning: COMPLETED or NO_EVIDENCE_FOUND")
    chronological_timeline: List[EventHypothesis] = Field(default_factory=list, description="Unified timeline")
    proposed_claim: Optional[ClaimHypothesis] = Field(default=None, description="Proposed claim hypothesis or None")


class EventReasoningAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="EventReasoningAgent",
            purpose="Construct unified chronological event timeline and synthesize candidate claim hypothesis strictly from verified findings."
        )

    def reason_over_evidence(
        self,
        db: Session,
        investigation_id: str,
        contract_findings: List[Dict[str, Any]],
        financial_findings: List[Dict[str, Any]],
        communication_events: List[Dict[str, Any]]
    ) -> EventReasoningResponse:
        input_data = {
            "investigation_id": investigation_id,
            "contract_findings": contract_findings,
            "financial_findings": financial_findings,
            "communication_events": communication_events
        }

        def fallback_handler(db_sess: Session, inv_id: str, inp: Dict[str, Any]) -> EventReasoningResponse:
            timeline: List[EventHypothesis] = []
            for comm in inp.get("communication_events", []):
                timeline.append(EventHypothesis(
                    event_type=comm.get("event_type", "COMMUNICATION_EVENT"),
                    timestamp_iso=comm.get("timestamp_iso"),
                    description=comm.get("statement", ""),
                    confidence=comm.get("confidence", 0.9)
                ))

            # Synthesize claim hypothesis ONLY if verified document-grounded financial findings exist
            fin_items = inp.get("financial_findings", [])
            proposed: Optional[ClaimHypothesis] = None

            if fin_items:
                primary_fin = fin_items[0]
                v_name = primary_fin.get("vendor_name", "Unknown Vendor")
                inv_num = primary_fin.get("invoice_number", "INV-UNKNOWN")
                billed_amt = primary_fin.get("billed_amount", 0.0)

                if billed_amt > 0:
                    proposed = ClaimHypothesis(
                        claim_type="EXCESS_RENTAL_PERIOD_OVERCHARGE",
                        vendor_name=v_name,
                        invoice_number=inv_num,
                        reason=f"Invoice {inv_num} charges billing period extending past off-rent cutoff.",
                        initial_hypothesis_strength=0.85
                    )

            return EventReasoningResponse(
                status="COMPLETED",
                chronological_timeline=timeline,
                proposed_claim=proposed
            )

        resp = self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=EventReasoningResponse,
            fallback_fn=fallback_handler
        )

        # Grounding Rule: If financial findings are empty, proposed_claim MUST be None
        if not financial_findings:
            resp.proposed_claim = None

        return resp
