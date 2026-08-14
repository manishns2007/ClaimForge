from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class ScoreBreakdown(BaseModel):
    score_total: float
    recoverability_score: float  # 0.0 to 1.0
    expected_recovery_value: float
    recommendation: str  # DISPUTE, HUMAN_REVIEW, DO_NOT_DISPUTE
    factor_breakdown: Dict[str, float]
    applied_penalties: Dict[str, float]
    override_reason: Optional[str] = None

class ScoringEngine:
    @staticmethod
    def calculate_recoverability_score(
        disputed_amount: float,
        has_contract_support: bool = False,
        has_financial_discrepancy: bool = False,
        has_vendor_acknowledgement: bool = False,
        has_telemetry_corroboration: bool = False,
        has_gps_corroboration: bool = False,
        has_contradiction: bool = False,
        has_missing_critical_evidence: bool = False,
        contradiction_details: Optional[str] = None,
        missing_rule_details: Optional[str] = None
    ) -> ScoreBreakdown:
        """
        Calculates transparent recoverability score (0-100) and expected recovery value.
        Enforces critical contradiction overrides (DO_NOT_DISPUTE) and missing rule overrides (HUMAN_REVIEW).
        """
        factors: Dict[str, float] = {}
        penalties: Dict[str, float] = {}

        if has_contract_support:
            factors["CONTRACT_SUPPORT"] = 25.0
        if has_financial_discrepancy:
            factors["FINANCIAL_DISCREPANCY"] = 20.0
        if has_vendor_acknowledgement:
            factors["VENDOR_ACKNOWLEDGEMENT"] = 20.0
        if has_telemetry_corroboration:
            factors["TELEMETRY_CORROBORATION"] = 15.0
        if has_gps_corroboration:
            factors["GPS_CORROBORATION"] = 10.0

        if has_contradiction:
            penalties["CONTRADICTION"] = -20.0
        if has_missing_critical_evidence:
            penalties["MISSING_CRITICAL_EVIDENCE"] = -20.0

        raw_score = sum(factors.values()) + sum(penalties.values())
        clamped_score = max(0.0, min(100.0, raw_score))
        norm_score = clamped_score / 100.0
        expected_recovery = round(disputed_amount * norm_score, 2)

        # Recommendation logic
        recommendation = "DO_NOT_DISPUTE"
        if clamped_score >= 75.0:
            recommendation = "DISPUTE"
        elif clamped_score >= 50.0:
            recommendation = "HUMAN_REVIEW"
        else:
            recommendation = "DO_NOT_DISPUTE"

        override_reason = None

        # CRITICAL HARD OVERRIDES
        if has_contradiction:
            recommendation = "DO_NOT_DISPUTE"
            override_reason = f"CRITICAL CONTRADICTION OVERRIDE: Claim contradicted by evidence ({contradiction_details or 'Counter-evidence found'}). Claim rejected."
        elif has_missing_critical_evidence:
            recommendation = "HUMAN_REVIEW"
            override_reason = f"CRITICAL RULE OVERRIDE: Missing required contract rules or evidence ({missing_rule_details or 'Unresolved rules'}). Requires human review."

        return ScoreBreakdown(
            score_total=clamped_score,
            recoverability_score=norm_score,
            expected_recovery_value=expected_recovery,
            recommendation=recommendation,
            factor_breakdown=factors,
            applied_penalties=penalties,
            override_reason=override_reason
        )
