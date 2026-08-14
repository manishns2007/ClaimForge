from typing import Dict, Any, Optional, List
from pydantic import BaseModel, ConfigDict

class NormalizedContractRule(BaseModel):
    rule_type: str  # BILLING_BASIS, DAILY_RATE, HOURLY_RATE, OFF_RENT_TRIGGER, PICKUP_CONDITION, STANDBY_RATE
    value: Any
    section_reference: Optional[str] = None
    source_document_id: Optional[str] = None
    source_citation: Dict[str, Any]

class ContractValidationResult(BaseModel):
    is_valid: bool
    missing_rules: List[str]
    rule_summary: Dict[str, Any]
    status: str  # VALID, REVIEW_REQUIRED, INVALID

class ContractRuleNormalizer:
    @staticmethod
    def normalize_rule(
        rule_type: str,
        value: Any,
        source_citation: Dict[str, Any],
        section_reference: Optional[str] = None,
        source_document_id: Optional[str] = None
    ) -> NormalizedContractRule:
        """
        Normalizes a contract rule into standard domain representation with explicit source citation.
        """
        return NormalizedContractRule(
            rule_type=rule_type.upper(),
            value=value,
            section_reference=section_reference,
            source_document_id=source_document_id,
            source_citation=source_citation
        )

    @staticmethod
    def validate_rules(rules: List[NormalizedContractRule]) -> ContractValidationResult:
        """
        Validates extracted contract rules.
        Does NOT silently assume missing rules.
        If off-rent trigger or billing rates are missing, flags CONTRACT_RULE_MISSING.
        """
        rule_map: Dict[str, NormalizedContractRule] = {r.rule_type: r for r in rules}
        missing_rules = []

        # Required rule types for financial calculation
        if "OFF_RENT_TRIGGER" not in rule_map:
            missing_rules.append("OFF_RENT_TRIGGER")
        if "DAILY_RATE" not in rule_map and "HOURLY_RATE" not in rule_map:
            missing_rules.append("BILLING_RATE")

        is_valid = len(missing_rules) == 0
        status = "VALID" if is_valid else "REVIEW_REQUIRED"

        return ContractValidationResult(
            is_valid=is_valid,
            missing_rules=missing_rules,
            rule_summary={k: v.value for k, v in rule_map.items()},
            status=status
        )
