import os
import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.database import Base, get_db
from backend.app.db.models import Investigation, Claim, AgentFindingRecord, ContradictionRecord, AgentRun
from backend.app.agents.contract_agent import ContractIntelligenceAgent
from backend.app.agents.financial_agent import FinancialInvestigator
from backend.app.agents.communication_agent import CommunicationInvestigator
from backend.app.agents.event_reasoning_agent import EventReasoningAgent
from backend.app.agents.contradiction_agent import ContradictionHunter
from backend.app.agents.orchestrator import AIInvestigationOrchestrator
from backend.app.services.demo_generator import DemoDatasetGenerator
from backend.app.services.document_ingestion import DocumentIngestionService

TEST_DB_URL = "sqlite:///./storage/test_ai_agents.db"
os.makedirs("./storage", exist_ok=True)
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Keep schema intact during test runs

class DummyUploadFile:
    def __init__(self, path, filename, content_type):
        self.path = path
        self.filename = filename
        self.content_type = content_type
    async def read(self):
        return self.path.read_bytes()

# 1. Test AI Unavailable & Fallback Execution
def test_ai_unavailable_fallback():
    db = TestingSessionLocal()
    inv = Investigation(title="AI Fallback Test", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    agent = ContractIntelligenceAgent()
    res = agent.extract_findings(db, inv.id)
    assert res.status in ["COMPLETED", "NO_CONTRACT_RULES_FOUND"]
    assert isinstance(res.findings, list)

    # Check AgentRun was persisted
    runs = db.query(AgentRun).filter(AgentRun.investigation_id == inv.id).all()
    assert len(runs) >= 1
    assert runs[0].status == "COMPLETED"
    db.close()

# 2. Test Invalid Evidence ID Rejection
def test_invalid_evidence_id_rejection():
    db = TestingSessionLocal()
    inv = Investigation(title="Evidence Validation Test")
    db.add(inv)
    db.commit()

    hunter = ContradictionHunter()
    validated = hunter.validate_evidence_ids(db, inv.id, ["fake-id-1", "fake-id-2"])
    assert len(validated) == 0
    db.close()

# 3. Test Full AI Pipeline on Case A (Recoverable)
def test_ai_orchestrator_case_a(tmp_path):
    db = TestingSessionLocal()
    c_pdf, i_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_a(tmp_path / "case_a")

    inv = Investigation(title="AI Case A Test", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    files = [
        DummyUploadFile(c_pdf, "contract_case_a.pdf", "application/pdf"),
        DummyUploadFile(i_pdf, "invoice_case_a.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_a.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_a.csv", "text/csv")
    ]
    import asyncio
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = AIInvestigationOrchestrator.run_full_investigation(db, inv.id)
    assert res["success"] is True
    assert res["contradictions_found"] == 0
    assert res["deterministic_result"]["recommendation"] == "DISPUTE"
    db.close()

# 4. Test Full AI Pipeline on Case C (Contradicted by Amendment)
def test_ai_orchestrator_case_c(tmp_path):
    db = TestingSessionLocal()
    c_pdf, a_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_c(tmp_path / "case_c")

    inv = Investigation(title="AI Case C Test", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()

    files = [
        DummyUploadFile(c_pdf, "contract_case_c.pdf", "application/pdf"),
        DummyUploadFile(a_pdf, "amendment_clause_case_c.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_c.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_c.csv", "text/csv")
    ]
    import asyncio
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = AIInvestigationOrchestrator.run_full_investigation(db, inv.id)
    assert res["success"] is True
    assert res["contradictions_found"] >= 1
    assert res["deterministic_result"]["recommendation"] == "DO_NOT_DISPUTE"

    # Verify ContradictionRecord was persisted in DB
    contra_records = db.query(ContradictionRecord).filter(ContradictionRecord.investigation_id == inv.id).all()
    assert len(contra_records) >= 1
    assert contra_records[0].severity == "CRITICAL"
    db.close()
