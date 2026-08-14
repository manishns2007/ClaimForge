import os
import pytest
from pathlib import Path
import pandas as pd
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.database import Base, get_db
from backend.app.db.models import Investigation, Claim, Event, Document, Evidence
from backend.app.engines.telemetry_engine import (
    TelemetryEngine, haversine_distance, ConfigurableThresholds
)
from backend.app.services.contract_rule_normalizer import ContractRuleNormalizer, NormalizedContractRule
from backend.app.services.charge_normalizer import ChargeNormalizer
from backend.app.engines.reconciliation_engine import ReconciliationEngine
from backend.app.engines.claim_engine import ClaimEngine
from backend.app.engines.scoring_engine import ScoringEngine
from backend.app.services.demo_generator import DemoDatasetGenerator
from backend.app.services.document_ingestion import DocumentIngestionService
from backend.app.services.investigation_service import DeterministicInvestigationPipeline

TEST_DB_URL = "sqlite:///./storage/test_deterministic.db"
os.makedirs("./storage", exist_ok=True)
engine = create_all_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./storage/test_deterministic.db"):
        try:
            os.remove("./storage/test_deterministic.db")
        except Exception:
            pass

# 1. Telemetry Column Normalization
def test_telemetry_column_normalization():
    data = {
        "event_timestamp": ["2026-06-11T14:00:00Z", "2026-06-11T14:05:00Z"],
        "Engine RPM": [1800, 0],
        "Hydraulic Pressure": [2500, 0],
        "lat": [37.7749, 37.7749],
        "lon": [-122.4194, -122.4194]
    }
    df = pd.DataFrame(data)
    engine_t = TelemetryEngine()
    norm_df, report = engine_t.normalize_columns(df)

    assert "timestamp" in norm_df.columns
    assert "rpm" in norm_df.columns
    assert "hydraulic_pressure" in norm_df.columns
    assert "latitude" in norm_df.columns
    assert "longitude" in norm_df.columns
    assert "rpm" in report.available_fields
    assert report.row_count == 2

# 2. Missing Telemetry Fields
def test_missing_telemetry_fields():
    data = {"timestamp": ["2026-06-11T14:00:00Z"], "rpm": [1500]}
    df = pd.DataFrame(data)
    engine_t = TelemetryEngine()
    _, report = engine_t.normalize_columns(df)

    assert "hydraulic_pressure" in report.missing_fields
    assert "latitude" in report.missing_fields

# 3. State Classification & Irregular Sampling
def test_state_classification_and_sampling():
    engine_t = TelemetryEngine()
    r_off = pd.Series({"rpm": 0, "hydraulic_pressure": 0})
    r_idle = pd.Series({"rpm": 600, "hydraulic_pressure": 100})
    r_active = pd.Series({"rpm": 1800, "hydraulic_pressure": 2500})

    assert engine_t.classify_row_state(r_off) == "OFF"
    assert engine_t.classify_row_state(r_idle) == "IDLE"
    assert engine_t.classify_row_state(r_active) == "ACTIVE"

# 4. Haversine Distance & Geofence Site Departure
def test_haversine_and_geofence():
    # Distance between 37.7749, -122.4194 and 37.7800, -122.4100 is ~1002m
    dist = haversine_distance(37.7749, -122.4194, 37.7800, -122.4100)
    assert dist > 800 and dist < 1100

    data = {
        "timestamp": ["2026-06-11T14:00:00Z", "2026-06-11T15:00:00Z"],
        "latitude": [37.7749, 37.7800],
        "longitude": [-122.4194, -122.4100]
    }
    df = pd.DataFrame(data)
    engine_t = TelemetryEngine()
    norm_df, _ = engine_t.normalize_columns(df)
    events = engine_t.detect_geofence_events(norm_df, 37.7749, -122.4194)

    assert len(events) == 1
    assert events[0].event_type == "SITE_DEPARTURE"
    assert events[0].source_row == 1

# 5. Contract Rule Normalization & Missing Rule Validation
def test_contract_rule_normalization_and_validation():
    rule1 = ContractRuleNormalizer.normalize_rule("DAILY_RATE", 1500.0, {"filename": "c.pdf"})
    rule2 = ContractRuleNormalizer.normalize_rule("OFF_RENT_TRIGGER", "EMAIL_NOTIFICATION", {"filename": "c.pdf"})

    val_pass = ContractRuleNormalizer.validate_rules([rule1, rule2])
    assert val_pass.is_valid is True
    assert val_pass.status == "VALID"

    # Missing off-rent trigger rule
    val_fail = ContractRuleNormalizer.validate_rules([rule1])
    assert val_fail.is_valid is False
    assert "OFF_RENT_TRIGGER" in val_fail.missing_rules
    assert val_fail.status == "REVIEW_REQUIRED"

# 6. Charge Normalization & Reconciliation Math
def test_reconciliation_math():
    charge = ChargeNormalizer.normalize_charge(
        invoice_number="INV-100",
        vendor_name="Heavy Corp",
        charge_type="RENTAL",
        units_billed=5.0,
        unit_rate=1500.0,
        billed_amount=7500.0,
        billing_start=datetime(2026, 6, 8, tzinfo=timezone.utc),
        billing_end=datetime(2026, 6, 13, tzinfo=timezone.utc),
        source_citation={"filename": "inv.pdf"}
    )
    rules = [
        ContractRuleNormalizer.normalize_rule("DAILY_RATE", 1500.0, {"filename": "c.pdf"}),
        ContractRuleNormalizer.normalize_rule("OFF_RENT_TRIGGER", "EMAIL_ACKNOWLEDGEMENT", {"filename": "c.pdf"})
    ]
    cutoff = datetime(2026, 6, 11, 14, 45, tzinfo=timezone.utc)

    rec = ReconciliationEngine.reconcile_off_rent_charge(
        charge=charge,
        contract_rules=rules,
        off_rent_notice_ts=cutoff,
        vendor_ack_ts=cutoff,
        engine_shutdown_ts=cutoff,
        physical_pickup_ts=None
    )

    assert rec.has_discrepancy is True
    assert rec.disputed_amount == 3000.0  # 2 days excess @ 1500
    assert rec.audit_record.result == 3000.0
    assert "2 excess days" in rec.audit_record.formula

# 7. Recoverability Score & Contradiction Override
def test_scoring_and_contradiction_override():
    # High support without contradiction
    score_high = ScoringEngine.calculate_recoverability_score(
        disputed_amount=3000.0,
        has_contract_support=True,
        has_financial_discrepancy=True,
        has_vendor_acknowledgement=True,
        has_telemetry_corroboration=True,
        has_gps_corroboration=True,
        has_contradiction=False
    )
    assert score_high.score_total >= 75.0
    assert score_high.recommendation == "DISPUTE"
    assert score_high.expected_recovery_value == round(3000.0 * (score_high.score_total / 100.0), 2)

    # Contradiction Hard Override -> DO_NOT_DISPUTE
    score_contra = ScoringEngine.calculate_recoverability_score(
        disputed_amount=6000.0,
        has_contract_support=True,
        has_financial_discrepancy=True,
        has_vendor_acknowledgement=True,
        has_telemetry_corroboration=True,
        has_gps_corroboration=True,
        has_contradiction=True,
        contradiction_details="Contract Amendment Clause 4.2 stipulates billing continues until physical pickup."
    )
    assert score_contra.recommendation == "DO_NOT_DISPUTE"
    assert "CRITICAL CONTRADICTION OVERRIDE" in score_contra.override_reason

# 8. Complete Pipeline Execution: CASE A, CASE B, CASE C
def test_e2e_case_a_recoverable(tmp_path):
    db = TestingSessionLocal()
    case_dir = tmp_path / "case_a"
    c_pdf, i_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_a(case_dir)

    inv = Investigation(title="Case A Test Run", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()
    db.refresh(inv)

    # Ingest documents using DocumentIngestionService synchronously
    class DummyUploadFile:
        def __init__(self, path, filename, content_type):
            self.path = path
            self.filename = filename
            self.content_type = content_type
        async def read(self):
            return self.path.read_bytes()

    files = [
        DummyUploadFile(c_pdf, "contract_case_a.pdf", "application/pdf"),
        DummyUploadFile(i_pdf, "invoice_case_a.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_a.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_a.csv", "text/csv")
    ]

    import asyncio
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = DeterministicInvestigationPipeline.run_investigation(db, inv.id)
    assert res["success"] is True
    assert res["recommendation"] == "DISPUTE"
    assert res["disputed_amount"] == 3000.0
    assert res["score"] >= 75.0
    db.close()

def test_e2e_case_b_ambiguous(tmp_path):
    db = TestingSessionLocal()
    case_dir = tmp_path / "case_b"
    c_pdf, i_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_b(case_dir)

    inv = Investigation(title="Case B Test Run", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()
    db.refresh(inv)

    class DummyUploadFile:
        def __init__(self, path, filename, content_type):
            self.path = path
            self.filename = filename
            self.content_type = content_type
        async def read(self):
            return self.path.read_bytes()

    files = [
        DummyUploadFile(c_pdf, "contract_case_b.pdf", "application/pdf"),
        DummyUploadFile(i_pdf, "invoice_case_b.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_b.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_b.csv", "text/csv")
    ]

    import asyncio
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = DeterministicInvestigationPipeline.run_investigation(db, inv.id)
    assert res["success"] is True
    assert res["recommendation"] == "HUMAN_REVIEW"
    db.close()

def test_e2e_case_c_contradicted(tmp_path):
    db = TestingSessionLocal()
    case_dir = tmp_path / "case_c"
    c_pdf, a_pdf, e_eml, t_csv = DemoDatasetGenerator.generate_case_c(case_dir)

    inv = Investigation(title="Case C Test Run", vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()
    db.refresh(inv)

    class DummyUploadFile:
        def __init__(self, path, filename, content_type):
            self.path = path
            self.filename = filename
            self.content_type = content_type
        async def read(self):
            return self.path.read_bytes()

    files = [
        DummyUploadFile(c_pdf, "contract_case_c.pdf", "application/pdf"),
        DummyUploadFile(a_pdf, "amendment_clause_case_c.pdf", "application/pdf"),
        DummyUploadFile(e_eml, "email_case_c.eml", "message/rfc822"),
        DummyUploadFile(t_csv, "telemetry_case_c.csv", "text/csv")
    ]

    import asyncio
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, files))

    res = DeterministicInvestigationPipeline.run_investigation(db, inv.id)
    assert res["success"] is True
    assert res["recommendation"] == "DO_NOT_DISPUTE"
    db.close()
