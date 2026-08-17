import os
import random
import string
import pytest
from pathlib import Path
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.models import Base, Investigation, Document, DocumentChunk, Claim, Evidence, ContradictionRecord
from backend.app.services.document_ingestion import DocumentIngestionService
from backend.app.agents.orchestrator import AIInvestigationOrchestrator
from backend.app.services.investigation_service import DeterministicInvestigationPipeline

TEST_DB_URL = "sqlite:///./storage/test_anti_mock.db"
os.makedirs("./storage", exist_ok=True)
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

class DummyUploadFile:
    def __init__(self, path: Path, filename: str, content_type: str = "application/pdf"):
        self.path = path
        self.filename = filename
        self.content_type = content_type
    async def read(self):
        return self.path.read_bytes()

def random_string(length=8):
    return ''.join(random.choices(string.ascii_uppercase, k=length))

def generate_random_claim_doc(target_dir: Path, claimant_name: str, invoice_num: str, daily_rate: float, days: int) -> Path:
    os.makedirs(target_dir, exist_ok=True)
    pdf_path = target_dir / f"invoice_{invoice_num}.pdf"
    total_amount = daily_rate * days

    c = canvas.Canvas(str(pdf_path))
    c.drawString(100, 750, f"INVOICE #{invoice_num}")
    c.drawString(100, 730, f"Vendor: {claimant_name}")
    c.drawString(100, 710, f"Invoice Date: August 16, 2026")
    c.drawString(100, 690, f"Billing Period: August 01, 2026 to August {days:02d}, 2026")
    c.drawString(100, 670, f"Item: Service Fee — {days} days @ ${daily_rate:,.2f}/day")
    c.drawString(100, 650, f"Total Amount Billed: ${total_amount:,.2f}")
    c.save()
    return pdf_path


def test_randomized_value_propagation_anti_mock(tmp_path):
    """
    PROVES: If we upload Document A with random (Claimant, Rate, Days, Amount),
    ClaimForge extracts and reasons strictly over those random values.
    When mutated to Document B with different random values, the output changes accordingly.
    """
    import asyncio
    db = TestingSessionLocal()

    # 1. Document A (Random values)
    claimant_a = f"Alpha-{random_string(6)} Solutions"
    inv_num_a = f"INV-A-{random.randint(10000, 99999)}"
    rate_a = float(random.randint(1500, 3500))
    days_a = random.randint(4, 9)
    total_a = rate_a * days_a

    doc_a_path = generate_random_claim_doc(tmp_path / "case_a", claimant_a, inv_num_a, rate_a, days_a)

    inv_a = Investigation(title=f"Test Run A - {inv_num_a}", vertical="COMMERCIAL_CLAIM")
    db.add(inv_a)
    db.commit()
    db.refresh(inv_a)

    asyncio.run(DocumentIngestionService.process_uploads(
        db, inv_a.id, [DummyUploadFile(doc_a_path, f"invoice_{inv_num_a}.pdf")]
    ))

    res_a = DeterministicInvestigationPipeline.run_investigation(db, inv_a.id)
    assert res_a["success"] is True
    assert res_a["original_amount"] == total_a

    db_claim_a = db.query(Claim).filter(Claim.investigation_id == inv_a.id).first()
    assert db_claim_a is not None
    assert db_claim_a.vendor_name == claimant_a
    assert db_claim_a.invoice_number == inv_num_a
    assert db_claim_a.original_amount == total_a

    # 2. Document B (Different random values)
    claimant_b = f"Beta-{random_string(6)} Global"
    inv_num_b = f"INV-B-{random.randint(10000, 99999)}"
    rate_b = float(random.randint(4000, 7000))
    days_b = random.randint(10, 15)
    total_b = rate_b * days_b

    assert claimant_a != claimant_b
    assert inv_num_a != inv_num_b
    assert total_a != total_b

    doc_b_path = generate_random_claim_doc(tmp_path / "case_b", claimant_b, inv_num_b, rate_b, days_b)

    inv_b = Investigation(title=f"Test Run B - {inv_num_b}", vertical="COMMERCIAL_CLAIM")
    db.add(inv_b)
    db.commit()
    db.refresh(inv_b)

    asyncio.run(DocumentIngestionService.process_uploads(
        db, inv_b.id, [DummyUploadFile(doc_b_path, f"invoice_{inv_num_b}.pdf")]
    ))

    res_b = DeterministicInvestigationPipeline.run_investigation(db, inv_b.id)
    assert res_b["success"] is True
    assert res_b["original_amount"] == total_b

    db_claim_b = db.query(Claim).filter(Claim.investigation_id == inv_b.id).first()
    assert db_claim_b is not None
    assert db_claim_b.vendor_name == claimant_b
    assert db_claim_b.invoice_number == inv_num_b
    assert db_claim_b.original_amount == total_b

    # Crucial Assertion: A != B
    assert db_claim_a.vendor_name != db_claim_b.vendor_name
    assert db_claim_a.original_amount != db_claim_b.original_amount
    db.close()


def test_cross_case_isolation(tmp_path):
    """
    PROVES: Investigation B never accesses or inherits evidence from Investigation A.
    """
    import asyncio
    db = TestingSessionLocal()

    # Case Alice
    doc_alice = generate_random_claim_doc(tmp_path / "case_alice", "Alice Healthcare Corp", "INV-ALICE-100", 2500.0, 4)
    inv_alice = Investigation(title="Investigation Alice", vertical="MEDICAL_CLAIM")
    db.add(inv_alice)
    db.commit()
    db.refresh(inv_alice)

    asyncio.run(DocumentIngestionService.process_uploads(
        db, inv_alice.id, [DummyUploadFile(doc_alice, "invoice_alice.pdf")]
    ))

    # Case Bob
    doc_bob = generate_random_claim_doc(tmp_path / "case_bob", "Bob Logistics Ltd", "INV-BOB-200", 8000.0, 11)
    inv_bob = Investigation(title="Investigation Bob", vertical="LOGISTICS_CLAIM")
    db.add(inv_bob)
    db.commit()
    db.refresh(inv_bob)

    asyncio.run(DocumentIngestionService.process_uploads(
        db, inv_bob.id, [DummyUploadFile(doc_bob, "invoice_bob.pdf")]
    ))

    # Run Bob
    res_bob = DeterministicInvestigationPipeline.run_investigation(db, inv_bob.id)
    assert res_bob["success"] is True

    # Check that Bob's investigation evidence contains zero chunks/evidence from Alice
    bob_evidence = db.query(Evidence).filter(Evidence.investigation_id == inv_bob.id).all()
    for ev in bob_evidence:
        assert "Alice" not in ev.extracted_fact
        assert "invoice_alice.pdf" != ev.source_citation.get("filename")

    # Check that Bob's document chunks only belong to Bob's document
    bob_docs = db.query(Document).filter(Document.investigation_id == inv_bob.id).all()
    bob_doc_ids = {d.id for d in bob_docs}
    bob_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(bob_doc_ids)).all()
    for ch in bob_chunks:
        assert "Alice Healthcare" not in ch.content
        assert "INV-ALICE-100" not in ch.content
    db.close()


def test_insufficient_evidence_handling(tmp_path):
    """
    PROVES: When an uploaded document has zero financial charges, ClaimForge does NOT invent data.
    It flags recommendation as HUMAN_REVIEW with $0.00 disputed amount.
    """
    import asyncio
    db = TestingSessionLocal()

    # Create a non-financial memo PDF
    non_fin_pdf = tmp_path / "general_memo.pdf"
    c = canvas.Canvas(str(non_fin_pdf))
    c.drawString(100, 750, "PROJECT STATUS UPDATE MEMORANDUM")
    c.drawString(100, 730, "Subject: General Safety Meeting Recap")
    c.drawString(100, 710, "All team members attended the weekly Monday morning briefing.")
    c.drawString(100, 690, "No incidents reported on site.")
    c.save()

    inv = Investigation(title="Non-Financial Memo Investigation", vertical="COMMERCIAL")
    db.add(inv)
    db.commit()
    db.refresh(inv)

    asyncio.run(DocumentIngestionService.process_uploads(
        db, inv.id, [DummyUploadFile(non_fin_pdf, "general_memo.pdf")]
    ))

    res = DeterministicInvestigationPipeline.run_investigation(db, inv.id)
    assert res["success"] is True
    assert res["disputed_amount"] == 0.0
    assert res["recommendation"] == "HUMAN_REVIEW"
    assert "No verified document-grounded financial charges found" in res["reason"]

    db_claim = db.query(Claim).filter(Claim.investigation_id == inv.id).first()
    assert db_claim.disputed_amount == 0.0
    assert db_claim.recommendation == "HUMAN_REVIEW"
    db.close()
