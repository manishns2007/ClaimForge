import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.db.database import Base, get_db
from backend.app.db.models import Investigation, Document, DocumentChunk, Evidence, InvestigationEvent
from backend.app.parsers.pdf_parser import parse_pdf
from backend.app.parsers.csv_parser import parse_csv
from backend.app.parsers.email_parser import parse_eml
from reportlab.pdfgen import canvas

# Test DB Setup
os.makedirs("./storage", exist_ok=True)
TEST_DB_URL = "sqlite:///./storage/test_claimforge.db"
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
    if os.path.exists("./storage/test_claimforge.db"):
        try:
            os.remove("./storage/test_claimforge.db")
        except Exception:
            pass

client = TestClient(app)

# Helper to generate a dummy PDF for testing
def create_dummy_pdf(path: Path):
    c = canvas.Canvas(str(path))
    c.drawString(100, 750, "ClaimForge Construction Equipment Rental Contract")
    c.drawString(100, 730, "Equipment: CAT 320 Excavator")
    c.drawString(100, 710, "Billing Rate: $1500 per day. Off-rent billing stops upon email notification.")
    c.save()

# Helper to generate a dummy CSV for testing
def create_dummy_csv(path: Path):
    content = "timestamp,latitude,longitude,rpm,hydraulic_pressure,engine_hours\n"
    content += "2026-06-11T14:00:00,37.7749,-122.4194,1800,2500,124.5\n"
    content += "2026-06-11T14:47:00,37.7749,-122.4194,0,0,125.0\n"
    path.write_text(content, encoding="utf-8")

# Helper to generate a dummy EML for testing
def create_dummy_eml(path: Path):
    content = (
        "From: site_manager@buildcorp.com\n"
        "To: dispatch@rentalcorp.com\n"
        "Subject: Off-rent Request - CAT 320 Excavator\n"
        "Date: Thu, 11 Jun 2026 14:41:00 -0400\n"
        "\n"
        "Please off-rent the CAT 320 Excavator effective immediately as of 14:41 today.\n"
    )
    path.write_text(content, encoding="utf-8")


def test_1_database_initialization():
    """Verify DB models can be queried without error."""
    db = TestingSessionLocal()
    count = db.query(Investigation).count()
    assert count == 0
    db.close()

def test_2_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app_name" in data

def _create_test_investigation(title="CAT 320 Excavator Rental Audit") -> str:
    response = client.post("/api/investigations", json={
        "title": title,
        "vertical": "EQUIPMENT_RENTAL"
    })
    assert response.status_code == 201
    data = response.json()
    return data["id"]

def test_3_create_investigation():
    response = client.post("/api/investigations", json={
        "title": "CAT 320 Excavator Rental Audit",
        "vertical": "EQUIPMENT_RENTAL"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "CAT 320 Excavator Rental Audit"
    assert data["status"] == "PENDING"
    assert "id" in data

def test_4_invalid_file_rejection(tmp_path):
    inv_id = _create_test_investigation()
    bad_file = tmp_path / "executable.exe"
    bad_file.write_bytes(b"MZ executable header")
    
    with open(bad_file, "rb") as f:
        response = client.post(
            f"/api/investigations/{inv_id}/documents",
            files={"files": ("executable.exe", f, "application/octet-stream")}
        )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]

def test_5_upload_and_parse_pdf(tmp_path):
    inv_id = _create_test_investigation()
    pdf_path = tmp_path / "contract.pdf"
    create_dummy_pdf(pdf_path)

    # Test parser function directly first
    parsed = parse_pdf(pdf_path)
    assert parsed["success"] is True
    assert parsed["metadata"]["page_count"] == 1
    assert "CAT 320 Excavator" in parsed["chunks"][0]["content"]

    # Test via API upload endpoint
    with open(pdf_path, "rb") as f:
        response = client.post(
            f"/api/investigations/{inv_id}/documents",
            files={"files": ("contract.pdf", f, "application/pdf")}
        )
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 1
    assert docs[0]["filename"] == "contract.pdf"
    assert docs[0]["status"] == "PARSED"

def test_6_upload_and_parse_csv(tmp_path):
    inv_id = _create_test_investigation()
    csv_path = tmp_path / "telemetry.csv"
    create_dummy_csv(csv_path)

    parsed = parse_csv(csv_path)
    assert parsed["success"] is True
    assert parsed["metadata"]["row_count"] == 2
    assert "rpm" in parsed["metadata"]["columns"]

    with open(csv_path, "rb") as f:
        response = client.post(
            f"/api/investigations/{inv_id}/documents",
            files={"files": ("telemetry.csv", f, "text/csv")}
        )
    assert response.status_code == 200
    docs = response.json()
    assert docs[0]["status"] == "PARSED"

def test_7_upload_and_parse_eml(tmp_path):
    inv_id = _create_test_investigation()
    eml_path = tmp_path / "off_rent_notice.eml"
    create_dummy_eml(eml_path)

    parsed = parse_eml(eml_path)
    assert parsed["success"] is True
    assert "site_manager@buildcorp.com" in parsed["metadata"]["from"]
    assert "Off-rent Request" in parsed["metadata"]["subject"]

    with open(eml_path, "rb") as f:
        response = client.post(
            f"/api/investigations/{inv_id}/documents",
            files={"files": ("off_rent_notice.eml", f, "message/rfc822")}
        )
    assert response.status_code == 200
    docs = response.json()
    assert docs[0]["status"] == "PARSED"

def test_8_investigation_events_persistence(tmp_path):
    inv_id = _create_test_investigation()
    pdf_path = tmp_path / "test_event_contract.pdf"
    create_dummy_pdf(pdf_path)

    with open(pdf_path, "rb") as f:
        client.post(
            f"/api/investigations/{inv_id}/documents",
            files={"files": ("test_event_contract.pdf", f, "application/pdf")}
        )

    response = client.get(f"/api/investigations/{inv_id}/events")
    assert response.status_code == 200
    events = response.json()
    assert len(events) >= 4
    event_types = [e["event_type"] for e in events]
    assert "INVESTIGATION_CREATED" in event_types
    assert "DOCUMENT_UPLOAD_STARTED" in event_types
    assert "DOCUMENT_PARSE_COMPLETED" in event_types

def test_9_investigation_retrieval_and_persistence(tmp_path):
    inv_id = _create_test_investigation()
    response = client.get(f"/api/investigations/{inv_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == inv_id
    assert data["status"] in ["PENDING", "READY"]

def test_10_dashboard_stats_endpoint():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_investigations" in data
    assert "total_documents" in data
    assert "total_evidence_facts" in data
    assert data["total_investigations"] >= 1
