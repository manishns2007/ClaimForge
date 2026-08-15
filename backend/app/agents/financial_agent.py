from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.agents.base import BaseAgent
from backend.app.services.document_retriever import HybridDocumentRetriever, DocumentChunkDTO
from backend.app.services.dynamic_extractor import DynamicExtractor
from backend.app.services.grounding_validator import GroundingValidator


class FinancialLineItem(BaseModel):
    vendor_name: str = Field(description="Exact vendor name from invoice")
    invoice_number: str = Field(description="Exact invoice number from invoice")
    equipment_id: Optional[str] = Field(default=None, description="Equipment identifier or serial")
    charge_type: str = Field(default="RENTAL", description="Charge category: RENTAL, STANDBY, ACCESSORIAL")
    billing_period: str = Field(default="Billed Rental Period", description="Billing period or date range")
    units_billed: float = Field(default=1.0, description="Quantity or days billed")
    unit_rate: float = Field(default=0.0, description="Rate per unit")
    billed_amount: float = Field(description="Total billed financial charge")
    description: str = Field(description="Description of line item charge")
    source_document: Optional[str] = Field(default=None, description="Source filename containing this item")
    source_document_id: Optional[str] = Field(default=None, description="Source document database ID")
    page: Optional[int] = Field(default=1, description="Page number where item appears")
    matched_text: Optional[str] = Field(default=None, description="Verbatim text quotation from invoice")
    confidence: float = Field(default=1.0, description="Extraction confidence score")


class FinancialAgentResponse(BaseModel):
    status: str = Field(description="Status of extraction: COMPLETED or NO_FINANCIAL_ITEMS_FOUND")
    line_items: List[FinancialLineItem] = Field(default_factory=list, description="Extracted line items")


class FinancialInvestigator(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="FinancialInvestigator",
            purpose="Extract semantic invoice line items, amounts, rates, and billed date ranges with verbatim provenance."
        )

    def extract_line_items(self, db: Session, investigation_id: str) -> FinancialAgentResponse:
        retriever = HybridDocumentRetriever(db)
        chunks = retriever.get_chunks_for_investigation(investigation_id)

        invoice_chunks_payload = [
            {
                "document_id": c.document_id,
                "filename": c.source_document_filename,
                "page": c.page_number or 1,
                "content": c.content
            }
            for c in chunks
        ]

        input_data = {
            "investigation_id": investigation_id,
            "invoice_chunks": invoice_chunks_payload
        }

        def validator_fn(resp: FinancialAgentResponse, src_chunks: List[DocumentChunkDTO]) -> Tuple[bool, List[str]]:
            if not resp.line_items:
                return True, []
            validated_items, rejections = GroundingValidator.validate_financial_items(resp.line_items, src_chunks)
            if rejections:
                return False, rejections
            return True, []

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
                    matched_snippet = inv_data.billed_amount.matched_text if inv_data.billed_amount else text[:100]

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
                            source_document=fname,
                            source_document_id=doc_id,
                            page=page,
                            matched_text=matched_snippet,
                            confidence=inv_data.billed_amount.confidence if inv_data.billed_amount else 0.9
                        ))

            if not items:
                return FinancialAgentResponse(status="NO_FINANCIAL_ITEMS_FOUND", line_items=[])

            return FinancialAgentResponse(status="COMPLETED", line_items=items)

        return self.execute_with_lifecycle(
            db=db,
            investigation_id=investigation_id,
            input_data=input_data,
            schema_class=FinancialAgentResponse,
            fallback_fn=fallback_handler,
            source_chunks=chunks,
            grounding_validator_fn=validator_fn
        )
