import os
import pytest
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

from backend.app.main import app
from backend.app.db.database import Base, get_db
from backend.app.db.models import (
    Investigation, Document, Charge, ContractRule, Evidence, Claim, AgentFindingRecord, ContradictionRecord
)
from backend.app.services.dynamic_extractor import DynamicExtractor
from backend.app.services.demo_generator import DemoDatasetGenerator
from backend.app.services.document_ingestion import DocumentIngestionService
from backend.app.agents.orchestrator import AIInvestigationOrchestrator
from backend.app.services.investigation_service import DeterministicInvestigationPipeline

TEST_DB_URL = "sqlite:///./storage/test_dynamic_grounding.db"
os.makedirs("./storage", exist_ok=True)
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./storage/test_dynamic_grounding.db"):
        try:
            os.remove("./storage/test_dynamic_grounding.db")
        except Exception:
            pass

client = TestClient(app)

class DummyUploadFile:
    def __init__(self, path: Path, filename: str, content_type: str):
        self.path = path
        self.filename = filename
        self.content_type = content_type
    async def read(self):
        return self.path.read_bytes()


# =========================================================================
# TEST 1 — NOVEL FINANCIAL DOCUMENT (ADVERSARIAL VENDOR & AMOUNTS)
# =========================================================================
def test_1_novel_financial_document(tmp_path):
    """
    Upload a document containing novel vendor, invoice, equipment, rate, quantity, total.
    Verify values extracted strictly from document.
    Ensure NO demo fallbacks (7500, 4500, Heavy Machinery Rentals Corp, INV-DEFAULT, CAT 320) exist.
    """
    db = TestingSessionLocal()
    inv = Investigation(title="Novel Adversarial Invoice Investigation", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    # Generate adversarial invoice PDF
    pdf_path = tmp_path / "adversarial_invoice.pdf"
    c = canvas.Canvas(str(pdf_path))
    c.drawString(100, 750, "INVOICE #ADV-999")
    c.drawString(100, 730, "Vendor: ADVERSARIAL-VENDOR-XYZ")
    c.drawString(100, 710, "Equipment: TEST-EQUIPMENT-999")
    c.drawString(100, 690, "Billing Period: 2027-04-10 to 2027-04-14")
    c.drawString(100, 670, "Daily Rate: $1,234.56 / day")
    c.drawString(100, 650, "Quantity: 4 days")
    c.drawString(100, 630, "Total Amount Due: $4,938.24")
    c.save()

    import asyncio
    files = [DummyUploadFile(pdf_path, "adversarial_invoice.pdf", "application/pdf")]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = AIInvestigationOrchestrator.run_full_investigation(db, inv.id)
    assert res["success"] is True

    # Check database records
    claim = db.query(Claim).filter(Claim.investigation_id == inv.id).first()
    assert claim is not None
    assert claim.vendor_name == "ADVERSARIAL-VENDOR-XYZ"
    assert claim.invoice_number == "ADV-999"
    assert claim.original_amount == 4938.24

    charges = db.query(Charge).filter(Charge.investigation_id == inv.id).all()
    assert len(charges) >= 1
    charge = charges[0]
    assert charge.billed_amount == 4938.24
    assert charge.unit_rate == 1234.56
    assert charge.units_billed == 4.0

    # Ensure NO demo constants leaked into the record
    forbidden_tokens = ["7500", "4500", "Heavy Machinery Rentals Corp", "INV-DEFAULT", "CAT 320", "INV-2026-90412"]
    for field_val in [claim.vendor_name, claim.invoice_number, str(claim.original_amount), str(claim.reason)]:
        for token in forbidden_tokens:
            assert token.lower() not in field_val.lower(), f"Forbidden token '{token}' leaked into claim field: {field_val}"

    db.close()


# =========================================================================
# TEST 2 — UNIQUE AMOUNT EXTRACTION ($1,234.56)
# =========================================================================
def test_2_unique_amount_extraction(tmp_path):
    """
    Upload a document with Total Amount: $1,234.56.
    Verify 1234.56 is extracted, NOT 7500.0.
    """
    text = "INVOICE #INV-UNIQUE-101\nVendor: Unique Supplier LLC\nTotal Amount: $1,234.56"
    extracted = DynamicExtractor.extract_invoice_data(text=text, filename="unique.pdf")

    assert extracted.billed_amount is not None
    assert extracted.billed_amount.value == 1234.56
    assert extracted.billed_amount.value != 7500.0
    assert extracted.vendor_name.value == "Unique Supplier LLC"
    assert extracted.invoice_number.value == "INV-UNIQUE-101"


# =========================================================================
# TEST 3 — NO FINANCIAL INFORMATION IN DOCUMENT
# =========================================================================
def test_3_no_financial_information(tmp_path):
    """
    Upload a document containing no financial values (e.g. standard policy guide).
    Expected:
    charges == []
    original_amount == 0
    disputed_amount == 0
    expected_recovery_value == 0
    recommendation == HUMAN_REVIEW
    INV-DEFAULT MUST NOT exist.
    """
    db = TestingSessionLocal()
    inv = Investigation(title="Non-Financial Document Audit", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    pdf_path = tmp_path / "general_safety_manual.pdf"
    c = canvas.Canvas(str(pdf_path))
    c.drawString(100, 750, "GENERAL CONSTRUCTION SITE SAFETY MANUAL")
    c.drawString(100, 730, "All personnel must wear high-visibility vests and hard hats.")
    c.drawString(100, 710, "Speed limit on site is 15 mph.")
    c.save()

    import asyncio
    files = [DummyUploadFile(pdf_path, "general_safety_manual.pdf", "application/pdf")]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = AIInvestigationOrchestrator.run_full_investigation(db, inv.id)
    assert res["success"] is True
    assert res["financial_items"] == 0

    det = res["deterministic_result"]
    assert det["original_amount"] == 0.0
    assert det["disputed_amount"] == 0.0
    assert det["expected_recovery_value"] == 0.0
    assert det["recommendation"] == "HUMAN_REVIEW"

    # Verify DB charges is empty
    charges = db.query(Charge).filter(Charge.investigation_id == inv.id).all()
    assert len(charges) == 0

    # Verify INV-DEFAULT does not exist anywhere in this investigation
    all_claims = db.query(Claim).filter(Claim.investigation_id == inv.id).all()
    for cl in all_claims:
        assert cl.invoice_number != "INV-DEFAULT"
        assert "Heavy Machinery" not in cl.vendor_name

    db.close()


# =========================================================================
# TEST 4 — NOVEL DATES (UNRELATED TO CASE A)
# =========================================================================
def test_4_novel_dates_extraction(tmp_path):
    """
    Upload documents with novel dates (e.g. October 15, 2027).
    Verify system parses the actual dates and no hardcoded 2026-06-11 is used.
    """
    email_text = (
        "From: project_lead@metrobuild.org\n"
        "To: dispatch@rigrentals.com\n"
        "Date: Fri, 15 Oct 2027 09:30:00 -0400\n"
        "Subject: Off-rent crane notification\n"
        "\n"
        "Please off-rent the mobile crane effective October 15, 2027 at 09:30.\n"
        "Reply: Received and acknowledged. Off-rent logged effective October 15, 2027 at 09:30.\n"
    )
    events = DynamicExtractor.extract_communication_events(email_text, filename="email.eml")
    assert len(events) >= 1
    req_event = events[0]
    assert req_event.timestamp is not None
    assert req_event.timestamp.year == 2027
    assert req_event.timestamp.month == 10
    assert req_event.timestamp.day == 15
    assert req_event.timestamp.year != 2026


# =========================================================================
# TEST 5 — DEMO REGRESSION (CASE A, CASE B, CASE C)
# =========================================================================
def test_5_demo_regression_case_a(tmp_path):
    """
    Case A: Clearly recoverable overcharge.
    Expected: DISPUTE, disputed_amount = 3000.0, recoverability score >= 75.
    """
    db = TestingSessionLocal()
    case_dir = tmp_path / "case_a_reg"
    c_pdf, i_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_a(case_dir)

    inv = Investigation(title="Case A Regression", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    import asyncio
    files = [
        DummyUploadFile(c_pdf, "contract_case_a.pdf", "application/pdf"),
        DummyUploadFile(i_pdf, "invoice_case_a.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_a.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_a.csv", "text/csv")
    ]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = DeterministicInvestigationPipeline.run_investigation(db, inv.id)
    assert res["success"] is True
    assert res["recommendation"] == "DISPUTE"
    assert res["disputed_amount"] == 3000.0
    assert res["expected_recovery_value"] == 2700.0
    assert res["score"] == 90.0
    db.close()


def test_5_demo_regression_case_b(tmp_path):
    """
    Case B: Ambiguous / Weather Standby.
    Expected: HUMAN_REVIEW.
    """
    db = TestingSessionLocal()
    case_dir = tmp_path / "case_b_reg"
    c_pdf, i_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_b(case_dir)

    inv = Investigation(title="Case B Regression", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    import asyncio
    files = [
        DummyUploadFile(c_pdf, "contract_case_b.pdf", "application/pdf"),
        DummyUploadFile(i_pdf, "invoice_case_b.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_b.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_b.csv", "text/csv")
    ]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = DeterministicInvestigationPipeline.run_investigation(db, inv.id)
    assert res["success"] is True
    assert res["recommendation"] == "HUMAN_REVIEW"
    assert res["score"] == 20.0
    db.close()


def test_5_demo_regression_case_c(tmp_path):
    """
    Case C: Contradicted by Contract Amendment.
    Expected: DO_NOT_DISPUTE, recoverability score = 30.0, contradiction detected.
    """
    db = TestingSessionLocal()
    case_dir = tmp_path / "case_c_reg"
    c_pdf, a_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_c(case_dir)

    inv = Investigation(title="Case C Regression", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    import asyncio
    files = [
        DummyUploadFile(c_pdf, "contract_case_c.pdf", "application/pdf"),
        DummyUploadFile(a_pdf, "amendment_clause_case_c.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_c.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_c.csv", "text/csv")
    ]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = DeterministicInvestigationPipeline.run_investigation(db, inv.id)
    assert res["success"] is True
    assert res["recommendation"] == "DO_NOT_DISPUTE"
    assert res["score"] <= 30.0
    db.close()


# =========================================================================
# TEST 6 — ADVERSARIAL DIRECT DATABASE INSPECTION (PHASE 8)
# =========================================================================
def test_6_direct_sqlite_adversarial_inspection(tmp_path):
    """
    Directly query SQLite database models to guarantee complete document provenance.
    Search for INV-DEFAULT, Heavy Machinery Rentals Corp in adversarial record.
    """
    db = TestingSessionLocal()
    inv = Investigation(title="Strict DB Provenance Audit", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    doc_pdf = tmp_path / "client_custom_invoice.pdf"
    c = canvas.Canvas(str(doc_pdf))
    c.drawString(100, 750, "INVOICE #CUST-7788")
    c.drawString(100, 730, "Vendor: Titan Earthmoving Ltd")
    c.drawString(100, 710, "Equipment: Bulldozer D8T")
    c.drawString(100, 690, "Billing Period: 2028-01-10 to 2028-01-15")
    c.drawString(100, 670, "Daily Rate: $2,500.00 / day")
    c.drawString(100, 650, "Quantity: 5 days")
    c.drawString(100, 630, "Total Amount Due: $12,500.00")
    c.save()

    import asyncio
    files = [DummyUploadFile(doc_pdf, "client_custom_invoice.pdf", "application/pdf")]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    AIInvestigationOrchestrator.run_full_investigation(db, inv.id)

    # 1. Inspect Claim
    claim = db.query(Claim).filter(Claim.investigation_id == inv.id).first()
    assert claim.vendor_name == "Titan Earthmoving Ltd"
    assert claim.invoice_number == "CUST-7788"
    assert claim.original_amount == 12500.0

    # 2. Inspect Charges
    charge = db.query(Charge).filter(Charge.investigation_id == inv.id).first()
    assert charge.billed_amount == 12500.0
    assert charge.unit_rate == 2500.0
    assert charge.units_billed == 5.0
    assert charge.source_citation["filename"] == "client_custom_invoice.pdf"

    # 3. Inspect Agent Findings
    findings = db.query(AgentFindingRecord).filter(AgentFindingRecord.investigation_id == inv.id).all()
    assert len(findings) >= 1

    # 4. Search entire investigation records for demo contamination
    contamination_strings = ["INV-DEFAULT", "Heavy Machinery Rentals Corp", "CAT 320 Excavator"]
    for ch in db.query(Charge).filter(Charge.investigation_id == inv.id).all():
        for cs in contamination_strings:
            assert cs not in ch.description
    
    db.close()
