import math
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, ConfigDict
from backend.app.services.charge_normalizer import NormalizedCharge
from backend.app.services.contract_rule_normalizer import NormalizedContractRule

class ReconciliationAudit(BaseModel):
    formula: str
    inputs: Dict[str, Any]
    result: float

class ReconciliationResult(BaseModel):
    has_discrepancy: bool
    billed_amount: float
    expected_amount: float
    disputed_amount: float
    discrepancy_reason: str
    audit_record: ReconciliationAudit
    details: Dict[str, Any] = {}

class ReconciliationEngine:
    @staticmethod
    def reconcile_off_rent_charge(
        charge: NormalizedCharge,
        contract_rules: List[NormalizedContractRule],
        off_rent_notice_ts: Optional[datetime],
        vendor_ack_ts: Optional[datetime],
        engine_shutdown_ts: Optional[datetime],
        physical_pickup_ts: Optional[datetime]
    ) -> ReconciliationResult:
        """
        Reconciles an invoice charge against contractual off-rent rules and telemetry/communication timestamps.
        """
        rule_map = {r.rule_type: r for r in contract_rules}
        
        # Check off-rent trigger rule in contract
        trigger_rule = rule_map.get("OFF_RENT_TRIGGER")
        off_rent_trigger = trigger_rule.value if trigger_rule else "EMAIL_NOTIFICATION"

        daily_rate_rule = rule_map.get("DAILY_RATE")
        unit_rate = daily_rate_rule.value if daily_rate_rule else charge.unit_rate

        # Determine effective off-rent cutoff timestamp according to contract rule
        cutoff_ts: Optional[datetime] = None
        cutoff_reason = ""

        if off_rent_trigger == "PHYSICAL_PICKUP":
            cutoff_ts = physical_pickup_ts
            cutoff_reason = f"Contract Clause specifies billing continues until physical equipment pickup (Pickup: {physical_pickup_ts})"
        elif off_rent_trigger == "EMAIL_ACKNOWLEDGEMENT":
            cutoff_ts = vendor_ack_ts or off_rent_notice_ts
            cutoff_reason = f"Contract specifies billing stops upon vendor acknowledgement ({cutoff_ts})"
        else:  # EMAIL_NOTIFICATION / DEFAULT
            cutoff_ts = off_rent_notice_ts
            cutoff_reason = f"Contract specifies billing stops upon off-rent notice ({cutoff_ts})"

        # Check if billing_end exceeds cutoff_ts
        billed_end = charge.billing_end
        billed_start = charge.billing_start

        if billed_start and billed_end and cutoff_ts:
            # Ensure cutoff_ts has timezone info
            if cutoff_ts.tzinfo is None:
                cutoff_ts = cutoff_ts.replace(tzinfo=timezone.utc)
            if billed_end.tzinfo is None:
                billed_end = billed_end.replace(tzinfo=timezone.utc)
            if billed_start.tzinfo is None:
                billed_start = billed_start.replace(tzinfo=timezone.utc)

            if billed_end > cutoff_ts:
                # Excess days billed post cutoff
                excess_seconds = (billed_end - max(billed_start, cutoff_ts)).total_seconds()
                excess_days = math.ceil(excess_seconds / 86400.0) if excess_seconds > 0 else 0
                
                # Ensure excess days does not exceed total units billed
                excess_days = min(excess_days, int(charge.units_billed))

                expected_units = max(0.0, charge.units_billed - excess_days)
                expected_amount = expected_units * unit_rate
                disputed_amount = excess_days * unit_rate

                formula_str = f"{excess_days} excess days * ${unit_rate:.2f}/day"
                audit = ReconciliationAudit(
                    formula=formula_str,
                    inputs={
                        "units_billed": charge.units_billed,
                        "expected_units": expected_units,
                        "excess_days": excess_days,
                        "unit_rate": unit_rate,
                        "billed_end": billed_end.isoformat(),
                        "cutoff_ts": cutoff_ts.isoformat(),
                        "off_rent_trigger": off_rent_trigger
                    },
                    result=disputed_amount
                )

                return ReconciliationResult(
                    has_discrepancy=disputed_amount > 0,
                    billed_amount=charge.billed_amount,
                    expected_amount=expected_amount,
                    disputed_amount=disputed_amount,
                    discrepancy_reason=f"Billed {excess_days} day(s) post off-rent cutoff. {cutoff_reason}",
                    audit_record=audit,
                    details={
                        "excess_days": excess_days,
                        "cutoff_ts": cutoff_ts.isoformat(),
                        "off_rent_trigger": off_rent_trigger
                    }
                )

        # No discrepancy found
        audit = ReconciliationAudit(
            formula="0 excess days * rate",
            inputs={"billed_amount": charge.billed_amount},
            result=0.0
        )
        return ReconciliationResult(
            has_discrepancy=False,
            billed_amount=charge.billed_amount,
            expected_amount=charge.billed_amount,
            disputed_amount=0.0,
            discrepancy_reason="Billed period matches contractual rules and operational timestamps.",
            audit_record=audit,
            details={}
        )
