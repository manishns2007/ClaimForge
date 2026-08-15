import pytest
import uuid
import os
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from reportlab.pdfgen import canvas
from pathlib import Path

from backend.app.db.models import Base, Investigation, Document, DocumentChunk, Claim, Charge
from backend.app.services.document_retriever import SqliteDocumentRetriever, DocumentChunkDTO
from backend.app.services.grounding_validator import GroundingValidator, GroundingValidationError
from backend.app.agents.base import BaseAgent, ExecutionMode
from backend.app.agents.financial_agent import FinancialInvestigator, FinancialLineItem, FinancialAgentResponse
from backend.app.agents.contract_agent import ContractIntelligenceAgent, ContractFindingItem, ContractAgentResponse
from backend.app.agents.communication_agent import CommunicationInvestigator, CommunicationEventItem, CommunicationAgentResponse
from backend.app.agents.orchestrator import AIInvestigationOrchestrator
from backend.app.services.document_ingestion import DocumentIngestionService
from backend.app.services.investigation_service import DeterministicInvestigationPipeline

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_grounding_validator_rejects_hallucinated_amount():
    """Test A: LLM hallucinates $99,999 when document only has $1,234.56 -> REJECT."""
    chunk = DocumentChunkDTO(
        id="chunk-1",
        document_id="doc-1",
        investigation_id="inv-1",
        chunk_index=0,
        content="INVOICE #INV-123\nVendor: ACME EQUIPMENT\nDaily Rate: $1,234.56\nTotal: $1,234.56",
        source_document_filename="invoice.pdf",
        page_number=1
    )

    # Hallucinated LLM output
    hallucinated_item = FinancialLineItem(
        vendor_name="ACME EQUIPMENT",
        invoice_number="INV-123",
        billed_amount=99999.0,  # Hallucinated
        unit_rate=99999.0,
        units_billed=1.0,
        description="Rental",
        source_document="invoice.pdf",
        source_document_id="doc-1",
        page=1,
        matched_text="Total: $1,234.56",
        confidence=0.95
    )

    validated, rejections = GroundingValidator.validate_financial_items([hallucinated_item], [chunk])
    assert len(validated) == 0, "Hallucinated amount must be rejected"
    assert len(rejections) == 1
    assert GroundingValidationError.VALUE_NOT_FOUND_IN_SOURCE in rejections[0]
    assert "99999" in rejections[0]


def test_grounding_validator_rejects_hallucinated_invoice_number():
    """Test B: LLM hallucinates INV-FAKE-999 when document has INV-REAL-123 -> REJECT."""
    chunk = DocumentChunkDTO(
        id="chunk-1",
        document_id="doc-1",
        investigation_id="inv-1",
        chunk_index=0,
        content="INVOICE #INV-REAL-123\nVendor: REAL-VENDOR\nTotal: $500.00",
        source_document_filename="invoice.pdf",
        page_number=1
    )

    hallucinated_item = FinancialLineItem(
        vendor_name="REAL-VENDOR",
        invoice_number="INV-FAKE-999",  # Hallucinated
        billed_amount=500.0,
        unit_rate=500.0,
        units_billed=1.0,
        description="Rental",
        source_document="invoice.pdf",
        source_document_id="doc-1",
        page=1,
        matched_text="Total: $500.00",
        confidence=0.95
    )

    validated, rejections = GroundingValidator.validate_financial_items([hallucinated_item], [chunk])
    assert len(validated) == 0
    assert len(rejections) == 1
    assert GroundingValidationError.VALUE_NOT_FOUND_IN_SOURCE in rejections[0]
    assert "INV-FAKE-999" in rejections[0]


def test_grounding_validator_rejects_hallucinated_vendor():
    """Test C: LLM hallucinates FAKE-VENDOR when document has REAL-VENDOR -> REJECT."""
    chunk = DocumentChunkDTO(
        id="chunk-1",
        document_id="doc-1",
        investigation_id="inv-1",
        chunk_index=0,
        content="INVOICE #INV-REAL-123\nVendor: REAL-VENDOR\nTotal: $500.00",
        source_document_filename="invoice.pdf",
        page_number=1
    )

    hallucinated_item = FinancialLineItem(
        vendor_name="FAKE-VENDOR-HALLUCINATION",  # Hallucinated
        invoice_number="INV-REAL-123",
        billed_amount=500.0,
        unit_rate=500.0,
        units_billed=1.0,
        description="Rental",
        source_document="invoice.pdf",
        source_document_id="doc-1",
        page=1,
        matched_text="Total: $500.00",
        confidence=0.95
    )

    validated, rejections = GroundingValidator.validate_financial_items([hallucinated_item], [chunk])
    assert len(validated) == 0
    assert len(rejections) == 1
    assert GroundingValidationError.VALUE_NOT_FOUND_IN_SOURCE in rejections[0]
    assert "FAKE-VENDOR-HALLUCINATION" in rejections[0]


def test_grounding_validator_rejects_missing_provenance():
    """Test D: Finding missing source_document or matched_text -> REJECT."""
    chunk = DocumentChunkDTO(
        id="chunk-1",
        document_id="doc-1",
        investigation_id="inv-1",
        chunk_index=0,
        content="INVOICE #INV-123\nTotal: $500.00",
        source_document_filename="invoice.pdf",
        page_number=1
    )

    unprovenanced_item = FinancialLineItem(
        vendor_name="ACME",
        invoice_number="INV-123",
        billed_amount=500.0,
        unit_rate=500.0,
        units_billed=1.0,
        description="Rental",
        source_document=None,  # Missing
        source_document_id=None,
        page=None,
        matched_text=None,  # Missing
        confidence=0.95
    )

    validated, rejections = GroundingValidator.validate_financial_items([unprovenanced_item], [chunk])
    assert len(validated) == 0
    assert len(rejections) == 1
    assert GroundingValidationError.MISSING_PROVENANCE in rejections[0]


def test_document_retriever_abstraction(db_session):
    """Test H: DocumentRetriever abstraction correctly retrieves chunks by id, investigation, and keywords."""
    inv = Investigation(title="Retriever Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc1 = Document(
        investigation_id=inv.id,
        filename="contract.pdf",
        file_type="PDF",
        file_size=100,
        storage_path="/tmp/contract.pdf"
    )
    doc2 = Document(
        investigation_id=inv.id,
        filename="telemetry.csv",
        file_type="CSV",
        file_size=200,
        storage_path="/tmp/telemetry.csv"
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    c1 = DocumentChunk(
        document_id=doc1.id,
        chunk_index=0,
        content="Off-rent notice shall be sent via email with Clause 4.2 pickup condition.",
        page_number=1
    )
    c2 = DocumentChunk(
        document_id=doc2.id,
        chunk_index=0,
        content="timestamp,latitude,longitude,engine_state\n2026-06-11,35.1,-119.2,OFF",
        page_number=1
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    retriever = SqliteDocumentRetriever(db_session)
    all_chunks = retriever.get_chunks_for_investigation(inv.id)
    assert len(all_chunks) == 2

    pdf_chunks = retriever.get_chunks_for_investigation(inv.id, file_types=["PDF"])
    assert len(pdf_chunks) == 1
    assert pdf_chunks[0].source_document_filename == "contract.pdf"

    search_res = retriever.search_chunks(inv.id, keywords=["pickup", "Clause 4.2"])
    assert len(search_res) == 1
    assert "Clause 4.2" in search_res[0].content

    chunk_by_id = retriever.get_chunk_by_id(c1.id)
    assert chunk_by_id is not None
    assert chunk_by_id.id == c1.id


def test_agent_execution_mode_no_api_key(db_session):
    """Test F: When no API key is configured, agent operates in DETERMINISTIC_GROUNDING mode."""
    inv = Investigation(title="Mode Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(
        investigation_id=inv.id,
        filename="inv_test.pdf",
        file_type="PDF",
        file_size=100,
        storage_path="/tmp/inv_test.pdf"
    )
    db_session.add(doc)
    db_session.commit()

    c = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        content="INVOICE #INV-444\nVendor: NOVEL VENDOR\nDaily Rate: $1,234.56\nTotal Amount: $4,938.24",
        page_number=1
    )
    db_session.add(c)
    db_session.commit()

    # Ensure no API keys in environment
    with patch.dict(os.environ, {"GEMINI_API_KEY": "", "OPENAI_API_KEY": ""}, clear=False):
        fin_agent = FinancialInvestigator()
        res = fin_agent.extract_line_items(db_session, inv.id)
        assert res.status == "COMPLETED"
        assert len(res.line_items) == 1
        assert res.line_items[0].billed_amount == 4938.24
        assert res.line_items[0].vendor_name == "NOVEL VENDOR"
        assert res.line_items[0].invoice_number == "INV-444"


def test_llm_hallucination_triggers_grounding_fallback(db_session):
    """Test A/E: When LLM hallucinates an invalid value, Grounding Validator rejects and falls back to DynamicExtractor."""
    inv = Investigation(title="Hallucination Fallback Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(
        investigation_id=inv.id,
        filename="invoice_grounded.pdf",
        file_type="PDF",
        file_size=100,
        storage_path="/tmp/invoice_grounded.pdf"
    )
    db_session.add(doc)
    db_session.commit()

    c = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        content="INVOICE #INV-GROUNDED-100\nVendor: GROUNDED-CORP\nDaily Rate: $1,234.56\nTotal Amount: $1,234.56",
        page_number=1
    )
    db_session.add(c)
    db_session.commit()

    # Mock PydanticAI agent to return a hallucinated $99,999.00 amount
    mock_pai_result = MagicMock()
    mock_pai_result.data = FinancialAgentResponse(
        status="COMPLETED",
        line_items=[
            FinancialLineItem(
                vendor_name="GROUNDED-CORP",
                invoice_number="INV-GROUNDED-100",
                billed_amount=99999.0,  # Hallucinated!
                unit_rate=99999.0,
                units_billed=1.0,
                description="Hallucinated Rental",
                source_document="invoice_grounded.pdf",
                source_document_id=doc.id,
                page=1,
                matched_text="Total Amount: $1,234.56",
                confidence=0.99
            )
        ]
    )

    mock_agent_instance = MagicMock()
    mock_agent_instance.run_sync.return_value = mock_pai_result

    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake_test_key"}):
        with patch.object(FinancialInvestigator, "_get_pydantic_ai_agent", return_value=mock_agent_instance):
            fin_agent = FinancialInvestigator()
            res = fin_agent.extract_line_items(db_session, inv.id)
            
            # Must have fallen back to DynamicExtractor which extracted the true $1,234.56
            assert res.status == "COMPLETED"
            assert len(res.line_items) == 1
            assert res.line_items[0].billed_amount == 1234.56, "Hallucinated $99,999 must be rejected; true $1,234.56 grounded"
            assert res.line_items[0].vendor_name == "GROUNDED-CORP"


def test_negative_non_financial_document_e2e(db_session):
    """Test I: Non-financial document produces 0 charges, $0 disputed, HUMAN_REVIEW, and NO INV-DEFAULT."""
    inv = Investigation(title="Negative Doc Test", vertical="EQUIPMENT_RENTAL")
    db_session.add(inv)
    db_session.commit()

    doc = Document(
        investigation_id=inv.id,
        filename="project_blueprint.pdf",
        file_type="PDF",
        file_size=100,
        storage_path="/tmp/project_blueprint.pdf"
    )
    db_session.add(doc)
    db_session.commit()

    c = DocumentChunk(
        document_id=doc.id,
        chunk_index=0,
        content="ENGINEERING SPECIFICATION\nSection 1: Excavation depths and soil stabilization procedures.",
        page_number=1
    )
    db_session.add(c)
    db_session.commit()

    # Run AI Investigation Orchestrator
    result = AIInvestigationOrchestrator.run_full_investigation(db_session, inv.id)
    assert result["success"] is True
    assert result["financial_items"] == 0

    det_res = result["deterministic_result"]
    assert det_res["original_amount"] == 0.0
    assert det_res["disputed_amount"] == 0.0
    assert det_res["expected_recovery_value"] == 0.0
    assert det_res["recommendation"] == "HUMAN_REVIEW"

    # Verify SQLite database has no INV-DEFAULT
    db_claim = db_session.query(Claim).filter(Claim.investigation_id == inv.id).first()
    assert db_claim is not None
    assert db_claim.original_amount == 0.0
    assert "INV-DEFAULT" not in db_claim.invoice_number
    assert "Heavy Machinery" not in db_claim.vendor_name

    db_charges = db_session.query(Charge).filter(Charge.investigation_id == inv.id).all()
    assert len(db_charges) == 0
