from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict

class NormalizedCharge(BaseModel):
    invoice_number: str
    vendor_name: str
    equipment_id: Optional[str] = None
    charge_type: str  # RENTAL, STANDBY, EXCESS_HOURS, ACCESSORIAL, FREIGHT
    billing_start: Optional[datetime] = None
    billing_end: Optional[datetime] = None
    units_billed: float
    unit_rate: float
    billed_amount: float
    source_document_id: Optional[str] = None
    source_citation: Dict[str, Any]

class ChargeNormalizer:
    @staticmethod
    def normalize_charge(
        invoice_number: str,
        vendor_name: str,
        charge_type: str,
        units_billed: float,
        unit_rate: float,
        billed_amount: float,
        source_citation: Dict[str, Any],
        equipment_id: Optional[str] = None,
        billing_start: Optional[datetime] = None,
        billing_end: Optional[datetime] = None,
        source_document_id: Optional[str] = None
    ) -> NormalizedCharge:
        """
        Normalizes invoice line item charges for deterministic reconciliation.
        """
        return NormalizedCharge(
            invoice_number=invoice_number,
            vendor_name=vendor_name,
            equipment_id=equipment_id,
            charge_type=charge_type.upper(),
            billing_start=billing_start,
            billing_end=billing_end,
            units_billed=float(units_billed),
            unit_rate=float(unit_rate),
            billed_amount=float(billed_amount),
            source_document_id=source_document_id,
            source_citation=source_citation
        )
