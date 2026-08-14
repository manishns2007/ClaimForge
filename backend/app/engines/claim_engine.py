from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.app.engines.reconciliation_engine import ReconciliationResult

class ClaimCandidate(BaseModel):
    is_claim: bool
    vendor_name: str
    invoice_number: str
    original_amount: float
    disputed_amount: float
    reason: str
    calculation: Dict[str, Any]
    supporting_evidence_ids: List[str]
    missing_evidence: List[str]
    has_contradiction: bool
    contradiction_reason: Optional[str] = None
    status: str  # CANDIDATE, REVIEW_REQUIRED, REJECTED

class ClaimEngine:
    @staticmethod
    def evaluate_claim_candidate(
        vendor_name: str,
        invoice_number: str,
        reconciliation: ReconciliationResult,
        supporting_evidence_ids: List[str],
        missing_evidence: List[str],
        contradiction_evidence_ids: List[str],
        contradiction_reason: Optional[str] = None
    ) -> ClaimCandidate:
        """
        Evaluates financial reconciliation results to form a structured claim candidate.
        If essential evidence or contract rules are missing, marks as REVIEW_REQUIRED.
        """
        has_contradiction = len(contradiction_evidence_ids) > 0 or (contradiction_reason is not None and len(contradiction_reason) > 0)
        
        if not reconciliation.has_discrepancy:
            return ClaimCandidate(
                is_claim=False,
                vendor_name=vendor_name,
                invoice_number=invoice_number,
                original_amount=reconciliation.billed_amount,
                disputed_amount=0.0,
                reason="No financial discrepancy detected.",
                calculation=reconciliation.audit_record.model_dump(),
                supporting_evidence_ids=supporting_evidence_ids,
                missing_evidence=missing_evidence,
                has_contradiction=has_contradiction,
                contradiction_reason=contradiction_reason,
                status="REJECTED"
            )

        if missing_evidence:
            return ClaimCandidate(
                is_claim=True,
                vendor_name=vendor_name,
                invoice_number=invoice_number,
                original_amount=reconciliation.billed_amount,
                disputed_amount=reconciliation.disputed_amount,
                reason=f"Discrepancy detected (${reconciliation.disputed_amount:.2f}), but missing critical evidence: {', '.join(missing_evidence)}",
                calculation=reconciliation.audit_record.model_dump(),
                supporting_evidence_ids=supporting_evidence_ids,
                missing_evidence=missing_evidence,
                has_contradiction=has_contradiction,
                contradiction_reason=contradiction_reason,
                status="REVIEW_REQUIRED"
            )

        return ClaimCandidate(
            is_claim=True,
            vendor_name=vendor_name,
            invoice_number=invoice_number,
            original_amount=reconciliation.billed_amount,
            disputed_amount=reconciliation.disputed_amount,
            reason=reconciliation.discrepancy_reason,
            calculation=reconciliation.audit_record.model_dump(),
            supporting_evidence_ids=supporting_evidence_ids,
            missing_evidence=[],
            has_contradiction=has_contradiction,
            contradiction_reason=contradiction_reason,
            status="CANDIDATE"
        )
