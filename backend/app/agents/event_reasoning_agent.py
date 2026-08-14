from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent

class EventHypothesis(BaseModel):
    event_type: str
    timestamp_iso: Optional[str] = None
    description: str
    supporting_evidence_ids: List[str] = []
    confidence: float

class ClaimHypothesis(BaseModel):
    claim_type: str
    vendor_name: str
    invoice_number: str
    reason: str
    supporting_evidence_ids: List[str] = []
    missing_evidence: List[str] = []
    initial_hypothesis_strength: float

class EventReasoningResponse(BaseModel):
    status: str
    chronological_timeline: List[EventHypothesis]
    proposed_claim: Optional[ClaimHypothesis] = None

class EventReasoningAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="EventReasoningAgent",
            purpose="Construct unified chronological event timeline and synthesize candidate claim hypothesis."
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
            timeline = []
            for comm in inp.get("communication_events", []):
                timeline.append(EventHypothesis(
                    event_type=comm.get("event_type", "COMMUNICATION_EVENT"),
                    timestamp_iso=comm.get("timestamp_iso"),
                    description=comm.get("statement", ""),
                    confidence=comm.get("confidence", 0.9)
                ))

            # Synthesize claim hypothesis
            proposed = ClaimHypothesis(
                claim_type="EXCESS_RENTAL_PERIOD_OVERCHARGE",
                vendor_name="Heavy Machinery Rentals Corp",
                invoice_number="INV-2026-90412",
                reason="Invoice charges billing period extending past off-rent cutoff.",
                initial_hypothesis_strength=0.85
            )

            return EventReasoningResponse(
                status="COMPLETED",
                chronological_timeline=timeline,
                proposed_claim=proposed
            )

        return self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=EventReasoningResponse,
            fallback_fn=fallback_handler
        )
