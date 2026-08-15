import os
import io
import time
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
import pymupdf as fitz
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.models import Base, Investigation, Document, DocumentChunk, Claim, Charge, Evidence
from backend.app.services.vision_ocr import VisionOCRService
from backend.app.parsers.pdf_parser import parse_pdf
from backend.app.parsers.csv_parser import parse_csv
from backend.app.parsers.email_parser import parse_eml
from backend.app.services.document_retriever import (
    SqliteDocumentRetriever,
    HybridDocumentRetriever,
    DocumentChunkDTO
)
from backend.app.services.grounding_validator import GroundingValidator
from backend.app.agents.contract_agent import ContractIntelligenceAgent, ContractAgentResponse, ContractFindingItem
from backend.app.agents.financial_agent import FinancialInvestigator, FinancialAgentResponse, FinancialLineItem
from backend.app.agents.contradiction_agent import ContradictionHunter
from backend.app.agents.orchestrator import AIInvestigationOrchestrator
from backend.app.services.document_ingestion import DocumentIngestionService
from backend.app.services.demo_generator import DemoDatasetGenerator
from backend.app.services.investigation_service import DeterministicInvestigationPipeline

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


class DummyUploadFile:
    def __init__(self, path: Path, filename: str, content_type: str):
        self.path = path
        self.filename = filename
        self.content_type = content_type

    async def read(self):
        return self.path.read_bytes()


# =========================================================================
# 1. PDF TABLE EXTRACTION
# =========================================================================
def test_1_pdf_table_extraction(tmp_path):
    """Test 1: PDF with tabular data is extracted into Markdown table."""
    pdf_path = tmp_path / "table_invoice.pdf"
    
    # Generate PDF with table lines and text
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((50, 50), "INVOICE #INV-GRID-100\nVendor: Grid Logistics Inc.")
    
    # Draw table borders and cells
    rect = fitz.Rect(50, 100, 550, 250)
    page.draw_rect(rect, color=(0, 0, 0), width=1)
    page.draw_line((50, 140), (550, 140), color=(0, 0, 0), width=1)
    page.draw_line((200, 100), (200, 250), color=(0, 0, 0), width=1)
    page.draw_line((350, 100), (350, 250), color=(0, 0, 0), width=1)
    
    page.insert_text((60, 125), "Description")
    page.insert_text((210, 125), "Quantity")
    page.insert_text((360, 125), "Total Amount")
    
    page.insert_text((60, 180), "Heavy Excavator EXC-99")
    page.insert_text((210, 180), "5 Days")
    page.insert_text((360, 180), "$7,500.00")
    
    doc.save(str(pdf_path))
    doc.close()
    
    res = parse_pdf(pdf_path)
    assert res["success"] is True
    assert len(res["chunks"]) >= 1
    chunk = res["chunks"][0]
    assert "INV-GRID-100" in chunk["content"]
    assert "Grid Logistics Inc" in chunk["content"]
    assert "$7,500.00" in chunk["content"]


# =========================================================================
# 2. SCANNED PDF OCR FALLBACK
# =========================================================================
def test_2_scanned_pdf_ocr_fallback(tmp_path):
    """Test 2: Scanned PDF page with no raw selectable text routes to Vision OCR."""
    pdf_path = tmp_path / "scanned_invoice.pdf"
    
    # Create a PDF with only an image (no direct selectable text)
    doc = fitz.open()
    page = doc.new_page()
    # Insert tiny blank text
    page.insert_text((10, 10), " ")
    doc.save(str(pdf_path))
    doc.close()

    mock_ocr = {
        "success": True,
        "text": "INVOICE #SCANNED-991\nVendor: Apex Earthworks\nTotal Amount: $4,500.00",
        "method": "GEMINI_FLASH_VISION"
    }

    with patch.object(VisionOCRService, "transcribe_image_bytes", return_value=mock_ocr):
        res = parse_pdf(pdf_path)
        assert res["success"] is True
        assert len(res["chunks"]) == 1
        assert "SCANNED-991" in res["chunks"][0]["content"]
        assert res["chunks"][0]["metadata_json"]["ocr_applied"] is True
        assert res["chunks"][0]["metadata_json"]["extraction_method"] == "GEMINI_FLASH_VISION"


# =========================================================================
# 3. PNG/JPG OCR INGESTION
# =========================================================================
def test_3_image_ocr_ingestion(tmp_path, db_session):
    """Test 3: Standalone PNG/JPG receipt parsed via VisionOCRService."""
    inv = Investigation(title="Image Receipt Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    img_path = tmp_path / "delivery_receipt.png"
    img_path.write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...")

    mock_ocr = {
        "success": True,
        "text": "DELIVERY RECEIPT\nVendor: Rapid Heavy Transport\nEquipment Picked Up: June 9, 2026\nSigned by Driver.",
        "method": "GEMINI_FLASH_VISION"
    }

    import asyncio
    with patch.object(VisionOCRService, "transcribe_image_file", return_value=mock_ocr):
        files = [DummyUploadFile(img_path, "delivery_receipt.png", "image/png")]
        docs = asyncio.run(DocumentIngestionService.process_uploads(db_session, inv.id, files))
        assert len(docs) == 1
        assert docs[0].file_type == "IMAGE"

        chunks = db_session.query(DocumentChunk).filter(DocumentChunk.document_id == docs[0].id).all()
        assert len(chunks) == 1
        assert "June 9, 2026" in chunks[0].content


# =========================================================================
# 4. EML EXTRACTION & 5. CSV EXTRACTION
# =========================================================================
def test_4_eml_and_5_csv_extraction(tmp_path):
    """Test 4 & 5: Native EML and CSV parsers produce structured chunks and metadata."""
    eml_path = tmp_path / "notice.eml"
    eml_path.write_text(
        "From: ops@contractor.com\nTo: dispatch@rentals.com\nDate: Mon, 15 Jun 2026 10:00:00 -0400\nSubject: Off-rent notice\n\nOff-rent crane effective June 15.",
        encoding="utf-8"
    )
    eml_res = parse_eml(eml_path)
    assert eml_res["success"] is True
    assert "June 15" in eml_res["chunks"][0]["content"]

    csv_path = tmp_path / "telemetry.csv"
    csv_path.write_text(
        "timestamp,latitude,longitude,rpm,hydraulic_pressure,engine_hours,equipment_id\n2026-06-15T10:00:00Z,35.1,-119.2,0,0,120.5,CRANE-10\n",
        encoding="utf-8"
    )
    csv_res = parse_csv(csv_path)
    assert csv_res["success"] is True
    assert "CRANE-10" in csv_res["chunks"][0]["content"]


# =========================================================================
# 6. BM25 RETRIEVAL & 7. DENSE EMBEDDINGS & 8. RRF RANKING
# =========================================================================
def test_6_bm25_and_7_dense_and_8_rrf_ranking(db_session):
    """Test 6, 7, 8: HybridDocumentRetriever ranks chunks using BM25, Dense vectors, and RRF."""
    inv = Investigation(title="Hybrid RAG Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(
        investigation_id=inv.id,
        filename="contract_msa.pdf",
        file_type="PDF",
        file_size=500,
        storage_path="/tmp/msa.pdf"
    )
    db_session.add(doc)
    db_session.commit()

    c1 = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        content="General Terms: All equipment must be operated safely and maintained in accordance with manufacturer specifications.",
        page_number=1
    )
    c2 = DocumentChunk(
        document_id=doc.id,
        chunk_index=1,
        content="Section 8.2 Standby Weather Credit: Lessee shall receive a 40% daily rental credit during documented inclement weather standby.",
        page_number=2
    )
    c3 = DocumentChunk(
        document_id=doc.id,
        chunk_index=2,
        content="Insurance and Indemnification: Lessee shall maintain comprehensive commercial general liability insurance.",
        page_number=3
    )
    db_session.add_all([c1, c2, c3])
    db_session.commit()

    retriever = HybridDocumentRetriever(db_session, rrf_k=60)
    
    # Query for weather standby
    results = retriever.search_chunks(
        investigation_id=inv.id,
        keywords=["standby", "weather", "credit"],
        top_k=3
    )

    assert len(results) >= 1
    # Top ranked chunk MUST be Chunk 2 (Section 8.2 Standby Weather Credit)
    assert results[0].id == c2.id
    assert results[0].score is not None
    assert results[0].score > 0.0
    assert "Standby Weather Credit" in results[0].content


# =========================================================================
# 9. NEEDLE-IN-A-HAYSTACK 100+ PAGE SYNTHETIC MSA RETRIEVAL
# =========================================================================
def test_9_needle_in_haystack_100_page_msa(db_session):
    """Test 9: Search a 100-page synthetic MSA and retrieve the exact hidden standby clause."""
    inv = Investigation(title="100-Page MSA Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(
        investigation_id=inv.id,
        filename="giant_master_service_agreement.pdf",
        file_type="PDF",
        file_size=100000,
        storage_path="/tmp/giant_msa.pdf"
    )
    db_session.add(doc)
    db_session.commit()

    # Generate 100 filler chunks + 1 hidden needle chunk on page 73
    needle_chunk_id = None
    chunks_to_add = []
    for page_num in range(1, 102):
        if page_num == 73:
            content = "Section 73.4 Standby Weather Allowance: In the event of adverse weather or wind exceeding 35 mph, a 50% weather standby discount applies."
        else:
            content = f"Article {page_num}: Standard boilerplate operational guidelines and general commercial provisions for page {page_num}."
        
        c = DocumentChunk(
            document_id=doc.id,
            chunk_index=page_num - 1,
            content=content,
            page_number=page_num
        )
        chunks_to_add.append(c)

    db_session.add_all(chunks_to_add)
    db_session.commit()

    retriever = HybridDocumentRetriever(db_session)
    t0 = time.time()
    top_matches = retriever.search_clauses(
        investigation_id=inv.id,
        query="standby weather allowance discount",
        top_k=3
    )
    duration = time.time() - t0

    assert len(top_matches) >= 1
    assert top_matches[0].page_number == 73, f"Expected page 73 needle, got page {top_matches[0].page_number}"
    assert "Section 73.4 Standby Weather Allowance" in top_matches[0].content
    print(f"\n[Retrieval Benchmark] 100-Page MSA Needle Retrieved in {duration*1000:.2f}ms (Page: {top_matches[0].page_number}, RRF: {top_matches[0].score})")


# =========================================================================
# 10. CROSS-DOCUMENT RETRIEVAL & 11. CONTRADICTION RETRIEVAL
# =========================================================================
def test_10_cross_document_and_11_contradiction_retrieval(db_session):
    """Test 10 & 11: ContradictionHunter uses Hybrid RAG to find contradictory amendment."""
    inv = Investigation(title="Contradiction Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc_contract = Document(investigation_id=inv.id, filename="contract.pdf", file_type="PDF", file_size=100, storage_path="/tmp/c.pdf")
    doc_amend = Document(investigation_id=inv.id, filename="contract_amendment.pdf", file_type="PDF", file_size=100, storage_path="/tmp/a.pdf")
    db_session.add_all([doc_contract, doc_amend])
    db_session.commit()

    c1 = DocumentChunk(document_id=doc_contract.id, chunk_index=0, content="Clause 2.1: Rental charges terminate upon email notice.", page_number=1)
    c2 = DocumentChunk(document_id=doc_amend.id, chunk_index=0, content="Contract Amendment Section 9: Notwithstanding Clause 2.1, billing continues until physical equipment pickup and transport.", page_number=1)
    db_session.add_all([c1, c2])
    db_session.commit()

    hunter = ContradictionHunter()
    resp = hunter.search_for_contradictions(
        db=db_session,
        investigation_id=inv.id,
        claim_hypothesis={"disputed_amount": 3000.0, "reason": "Email notice sent"},
        supporting_evidence_ids=[]
    )

    assert resp.has_contradiction is True
    assert len(resp.findings) >= 1
    assert "CONTRACT_AMENDMENT_OVERRIDE" in resp.findings[0].contradiction_type
    assert "physical equipment pickup" in resp.findings[0].description


# =========================================================================
# 12. PROVENANCE PRESERVATION & 13. GROUNDING VALIDATOR COMPATIBILITY
# =========================================================================
def test_12_provenance_and_13_grounding_validator(db_session):
    """Test 12 & 13: Verifies exact chunk provenance tracing and GroundingValidator verification."""
    inv = Investigation(title="Provenance Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(investigation_id=inv.id, filename="inv_provenance.pdf", file_type="PDF", file_size=100, storage_path="/tmp/inv.pdf")
    db_session.add(doc)
    db_session.commit()

    chunk = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        content="INVOICE #INV-8899\nVendor: TITAN CRANE SERVICES\nTotal Due: $8,400.00",
        page_number=4
    )
    db_session.add(chunk)
    db_session.commit()

    retriever = HybridDocumentRetriever(db_session)
    chunks_dto = retriever.get_chunks_for_investigation(inv.id)
    assert len(chunks_dto) == 1
    cdto = chunks_dto[0]

    assert cdto.filename == "inv_provenance.pdf"
    assert cdto.page == 4
    assert cdto.document_id == doc.id

    # Valid Grounded Item
    valid_item = FinancialLineItem(
        vendor_name="TITAN CRANE SERVICES",
        invoice_number="INV-8899",
        billed_amount=8400.0,
        unit_rate=8400.0,
        units_billed=1.0,
        description="Crane Rental",
        source_document="inv_provenance.pdf",
        source_document_id=doc.id,
        page=4,
        matched_text="Total Due: $8,400.00",
        confidence=0.95
    )
    valid_items, rejections = GroundingValidator.validate_financial_items([valid_item], chunks_dto)
    assert len(valid_items) == 1
    assert len(rejections) == 0


# =========================================================================
# 14. PYDANTIC AI + HYBRID RAG INTEGRATION
# =========================================================================
def test_14_pydantic_ai_hybrid_rag_integration(db_session):
    """Test 14: ContractIntelligenceAgent retrieves clauses and grounds extracted findings."""
    inv = Investigation(title="Contract Hybrid Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(investigation_id=inv.id, filename="master_agreement.pdf", file_type="PDF", file_size=100, storage_path="/tmp/msa.pdf")
    db_session.add(doc)
    db_session.commit()

    c = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        content="Clause 4.1 Daily Rate: Rental Rate shall be $2,250.00 per day. Clause 5.2: Off-rent cutoff by email notification.",
        page_number=1
    )
    db_session.add(c)
    db_session.commit()

    agent = ContractIntelligenceAgent()
    resp = agent.extract_findings(db_session, inv.id)
    assert resp.status == "COMPLETED"
    assert len(resp.findings) >= 1
    
    rates = [f for f in resp.findings if f.rule_type == "DAILY_RATE"]
    assert len(rates) == 1
    val_clean = float(str(rates[0].rule_value).replace("$", "").replace(",", "").strip())
    assert val_clean == 2250.0


# =========================================================================
# 15. NEGATIVE DOCUMENT (NO FINANCIAL DATA)
# =========================================================================
def test_15_negative_document_with_no_financial_data(db_session):
    """Test 15: Document with zero financial charges routes to HUMAN_REVIEW with $0 disputed."""
    inv = Investigation(title="Blueprint Ingestion", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(investigation_id=inv.id, filename="structural_drawings.pdf", file_type="PDF", file_size=100, storage_path="/tmp/struct.pdf")
    db_session.add(doc)
    db_session.commit()

    c = DocumentChunk(document_id=doc.id, chunk_index=0, content="STRUCTURAL SPECIFICATIONS\nFoundation grade B-24 rebar spacing.", page_number=1)
    db_session.add(c)
    db_session.commit()

    res = AIInvestigationOrchestrator.run_full_investigation(db_session, inv.id)
    assert res["success"] is True
    assert res["financial_items"] == 0
    assert res["deterministic_result"]["original_amount"] == 0.0
    assert res["deterministic_result"]["disputed_amount"] == 0.0
    assert res["deterministic_result"]["recommendation"] == "HUMAN_REVIEW"


# =========================================================================
# 16. COMPLETELY NOVEL VENDOR/INVOICE/AMOUNT ADVERSARIAL TEST
# =========================================================================
def test_16_completely_novel_claim_package(tmp_path, db_session):
    """
    Test 16 & Section 12: Completely novel values:
    Vendor: NORTHSTAR INDUSTRIAL LOGISTICS
    Invoice: NSL-INV-88431
    Equipment: CRANE-XR-742
    Unit Rate: $1,873.42
    Quantity: 7
    Total: $13,113.94
    """
    inv = Investigation(title="Novel Logistics Claim", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    inv_pdf = tmp_path / "northstar_invoice.pdf"
    c = canvas.Canvas(str(inv_pdf))
    c.drawString(100, 750, "INVOICE #NSL-INV-88431")
    c.drawString(100, 730, "Vendor: NORTHSTAR INDUSTRIAL LOGISTICS")
    c.drawString(100, 710, "Equipment: CRANE-XR-742")
    c.drawString(100, 690, "Daily Rate: $1,873.42 / day")
    c.drawString(100, 670, "Days Billed: 7 days")
    c.drawString(100, 650, "Total Amount Due: $13,113.94")
    c.save()

    import asyncio
    files = [DummyUploadFile(inv_pdf, "northstar_invoice.pdf", "application/pdf")]
    asyncio.run(DocumentIngestionService.process_uploads(db_session, inv.id, files))

    AIInvestigationOrchestrator.run_full_investigation(db_session, inv.id)

    # 1. Database Claim Audit
    claim = db_session.query(Claim).filter(Claim.investigation_id == inv.id).first()
    assert claim.vendor_name == "NORTHSTAR INDUSTRIAL LOGISTICS"
    assert claim.invoice_number == "NSL-INV-88431"
    assert claim.original_amount == 13113.94

    # 2. Database Charge Audit
    charge = db_session.query(Charge).filter(Charge.investigation_id == inv.id).first()
    assert charge.billed_amount == 13113.94
    assert charge.unit_rate == 1873.42
    assert charge.units_billed == 7.0
    assert "INV-DEFAULT" not in charge.description


# =========================================================================
# 17. NO API KEY MODE & 18. API FAILURE FALLBACK & 19. HALLUCINATION REJECTION
# =========================================================================
def test_17_no_api_key_and_18_api_failure_and_19_hallucination_rejection(db_session):
    """Test 17, 18, 19: Offline mode works deterministically; Hallucinations are rejected."""
    inv = Investigation(title="Offline and Hallucination Rejection", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(investigation_id=inv.id, filename="inv_offline.pdf", file_type="PDF", file_size=100, storage_path="/tmp/offline.pdf")
    db_session.add(doc)
    db_session.commit()

    c = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        content="INVOICE #INV-OFF-101\nVendor: RELIABLE LOGISTICS\nTotal Amount: $3,200.00",
        page_number=1
    )
    db_session.add(c)
    db_session.commit()

    # 17. No API key mode / Offline fallback
    with patch("backend.app.core.config.settings.GEMINI_API_KEY", ""), patch.dict(os.environ, {"GEMINI_API_KEY": "", "OPENAI_API_KEY": ""}):
        fin_agent = FinancialInvestigator()
        res = fin_agent.extract_line_items(db_session, inv.id)
        assert res.status == "COMPLETED"
        assert res.line_items[0].billed_amount == 3200.0

    # 19. Hallucination rejection
    hallucinated_item = FinancialLineItem(
        vendor_name="RELIABLE LOGISTICS",
        invoice_number="INV-OFF-101",
        billed_amount=999999.0,  # Fabricated!
        unit_rate=999999.0,
        units_billed=1.0,
        description="Fake Charge",
        source_document="inv_offline.pdf",
        source_document_id=doc.id,
        page=1,
        matched_text="Total Amount: $3,200.00",
        confidence=0.99
    )
    retriever = HybridDocumentRetriever(db_session)
    valid_items, rejections = GroundingValidator.validate_financial_items([hallucinated_item], retriever.get_chunks_for_investigation(inv.id))
    assert len(valid_items) == 0
    assert len(rejections) == 1
    assert "VALUE_NOT_FOUND_IN_SOURCE" in rejections[0]


# =========================================================================
# 20. EXISTING CASE A / B / C REGRESSION TESTS
# =========================================================================
def test_20_demo_case_a_b_c_regression(tmp_path):
    """Test 20: Case A (Dispute), Case B (Review), Case C (Do Not Dispute) all produce expected decisions."""
    db = TestingSessionLocal()
    import asyncio

    # Case A
    c_pdf, i_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_a(tmp_path / "a")
    inv_a = Investigation(title="Case A Regression", vertical="EQUIPMENT_RENTAL")
    db.add(inv_a)
    db.commit()
    files_a = [
        DummyUploadFile(c_pdf, "contract_case_a.pdf", "application/pdf"),
        DummyUploadFile(i_pdf, "invoice_case_a.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_a.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_a.csv", "text/csv")
    ]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv_a.id, files_a))
    res_a = DeterministicInvestigationPipeline.run_investigation(db, inv_a.id)
    assert res_a["recommendation"] == "DISPUTE"
    assert res_a["disputed_amount"] == 3000.0

    # Case B
    c_pdf, i_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_b(tmp_path / "b")
    inv_b = Investigation(title="Case B Regression", vertical="EQUIPMENT_RENTAL")
    db.add(inv_b)
    db.commit()
    files_b = [
        DummyUploadFile(c_pdf, "contract_case_b.pdf", "application/pdf"),
        DummyUploadFile(i_pdf, "invoice_case_b.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_b.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_b.csv", "text/csv")
    ]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv_b.id, files_b))
    res_b = DeterministicInvestigationPipeline.run_investigation(db, inv_b.id)
    assert res_b["recommendation"] == "HUMAN_REVIEW"

    # Case C
    c_pdf, a_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_c(tmp_path / "c")
    inv_c = Investigation(title="Case C Regression", vertical="EQUIPMENT_RENTAL")
    db.add(inv_c)
    db.commit()
    files_c = [
        DummyUploadFile(c_pdf, "contract_case_c.pdf", "application/pdf"),
        DummyUploadFile(a_pdf, "amendment_clause_case_c.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_c.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_c.csv", "text/csv")
    ]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv_c.id, files_c))
    res_c = DeterministicInvestigationPipeline.run_investigation(db, inv_c.id)
    assert res_c["recommendation"] == "DO_NOT_DISPUTE"
    assert res_c["score"] <= 30.0

    db.close()
