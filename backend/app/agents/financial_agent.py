from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.db.models import Document, DocumentChunk
from backend.app.services.dynamic_extractor import DynamicExtractor


class FinancialLineItem(BaseModel):
    vendor_name: str
    invoice_number: str
    equipment_id: Optional[str] = None
    charge_type: str = "RENTAL"  # RENTAL, STANDBY, ACCESSORIAL
    billing_period: str = "Billed Rental Period"
    units_billed: float
    unit_rate: float
    billed_amount: float
    description: str
    source_document_id: Optional[str] = None
    page: Optional[int] = 1


class FinancialAgentResponse(BaseModel):
    status: str
    line_items: List[FinancialLineItem] = []


class FinancialInvestigator(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="FinancialInvestigator",
            purpose="Extract semantic invoice line items, amounts, rates, and billed date ranges."
        )

    def extract_line_items(self, db: Session, investigation_id: str) -> FinancialAgentResponse:
        docs = db.query(Document).filter(
            Document.investigation_id == investigation_id
        ).all()

        invoice_chunks = []
        for doc in docs:
            # Check all documents, prioritizing PDFs or docs with financial keywords
            chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
            for c in chunks:
                invoice_chunks.append({
                    "document_id": doc.id,
                    "filename": doc.filename,
                    "page": c.page_number or 1,
                    "content": c.content
                })

        input_data = {"investigation_id": investigation_id, "invoice_chunks": invoice_chunks}

        def fallback_handler(db_sess: Session, inv_id: str, inp: Dict[str, Any]) -> FinancialAgentResponse:
            items: List[FinancialLineItem] = []
            seen_invoices = set()

            for ch in inp.get("invoice_chunks", []):
                text = ch["content"]
                doc_id = ch["document_id"]
                page = ch.get("page", 1)
                fname = ch.get("filename", "")

                inv_data = DynamicExtractor.extract_invoice_data(
                    text=text,
                    filename=fname,
                    doc_id=doc_id,
                    page=page
                )

                # If financial fields are present (at least billed_amount or invoice_number)
                if inv_data.billed_amount or inv_data.invoice_number:
                    billed_amt = inv_data.billed_amount.value if inv_data.billed_amount else 0.0
                    unit_rate = inv_data.unit_rate.value if inv_data.unit_rate else 0.0
                    units_billed = inv_data.units_billed.value if inv_data.units_billed else 0.0

                    if billed_amt > 0 and unit_rate > 0 and units_billed == 0:
                        units_billed = billed_amt / unit_rate
                    elif billed_amt > 0 and units_billed > 0 and unit_rate == 0:
                        unit_rate = billed_amt / units_billed
                    elif billed_amt > 0 and unit_rate == 0 and units_billed == 0:
                        unit_rate = billed_amt
                        units_billed = 1.0

                    v_name = inv_data.vendor_name.value if inv_data.vendor_name else "Unknown Vendor"
                    inv_num = inv_data.invoice_number.value if inv_data.invoice_number else "INV-UNKNOWN"
                    eq_id = inv_data.equipment_id.value if inv_data.equipment_id else None

                    inv_key = f"{v_name}::{inv_num}::{billed_amt}"
                    if inv_key not in seen_invoices and billed_amt > 0:
                        seen_invoices.add(inv_key)
                        items.append(FinancialLineItem(
                            vendor_name=v_name,
                            invoice_number=inv_num,
                            equipment_id=eq_id,
                            charge_type="RENTAL",
                            billing_period="Billed Rental Period",
                            units_billed=units_billed,
                            unit_rate=unit_rate,
                            billed_amount=billed_amt,
                            description=f"{eq_id or 'Equipment'} Rental ({units_billed} units @ ${unit_rate}/unit)",
                            source_document_id=doc_id,
                            page=page
                        ))

            if not items:
                return FinancialAgentResponse(status="NO_FINANCIAL_ITEMS_FOUND", line_items=[])

            return FinancialAgentResponse(status="COMPLETED", line_items=items)

        return self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=FinancialAgentResponse,
            fallback_fn=fallback_handler
        )
