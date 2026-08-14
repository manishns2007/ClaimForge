import os
import sys
import asyncio
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy.orm import Session
from backend.app.db.database import SessionLocal, init_db
from backend.app.db.models import Investigation, Claim, Evidence, ContractRule, Event, AgentFindingRecord, ContradictionRecord
from backend.app.services.demo_generator import DemoDatasetGenerator
from backend.app.services.document_ingestion import DocumentIngestionService
from backend.app.agents.orchestrator import AIInvestigationOrchestrator

class DummyUploadFile:
    def __init__(self, path: Path, content_type: str):
        self.path = path
        self.filename = path.name
        self.content_type = content_type
    async def read(self):
        return self.path.read_bytes()

def run_case(db: Session, title: str, files_info: list) -> dict:
    inv = Investigation(title=title, vertical="EQUIPMENT_RENTAL")
    db.add(inv)
    db.commit()
    db.refresh(inv)

    upload_files = [DummyUploadFile(path, ctype) for path, ctype in files_info]
    asyncio.run(DocumentIngestionService.process_uploads(db, inv.id, upload_files))

    res = AIInvestigationOrchestrator.run_full_investigation(db, inv.id)

    # Fetch values directly from SQLite DB to prove DB origin
    db_inv = db.query(Investigation).filter(Investigation.id == inv.id).first()
    db_claim = db.query(Claim).filter(Claim.investigation_id == inv.id).first()
    db_findings = db.query(AgentFindingRecord).filter(AgentFindingRecord.investigation_id == inv.id).all()
    db_contradictions = db.query(ContradictionRecord).filter(ContradictionRecord.investigation_id == inv.id).all()
    db_evidence = db.query(Evidence).filter(Evidence.investigation_id == inv.id).all()

    ai_findings_str = ", ".join([f"{f.category}:{f.finding_summary}" for f in db_findings]) or "AI Extraction Complete"
    supp_ev_str = f"{len(db_evidence)} canonical fact(s)"
    contra_str = ", ".join([f"[{c.severity}] {c.description}" for c in db_contradictions]) if db_contradictions else "None"

    return {
        "case": title,
        "ai_findings": ai_findings_str,
        "supporting_evidence": supp_ev_str,
        "contradictions": contra_str,
        "disputed_amount": f"${db_inv.total_disputed_amount:,.2f}",
        "score": f"{db_claim.recoverability_score * 100:.1f}/100" if db_claim else "N/A",
        "expected_recovery": f"${db_inv.total_expected_recovery:,.2f}",
        "recommendation": db_claim.recommendation if db_claim else "N/A"
    }

def print_audit_report():
    init_db()
    db = SessionLocal()
    demo_dir = Path("./storage/demo_audit_cases")
    os.makedirs(demo_dir, exist_ok=True)

    print("\n==========================================================================================")
    print("                 CLAIMFORGE DETERMINISTIC INVESTIGATION ENGINE AUDIT REPORT")
    print("==========================================================================================\n")

    # Case A
    cA_files = DemoDatasetGenerator.generate_case_a(demo_dir / "case_a")
    res_A = run_case(db, "CASE A (Recoverable Claim)", [
        (cA_files[0], "application/pdf"),
        (cA_files[1], "application/pdf"),
        (cA_files[2], "message/rfc822"),
        (cA_files[3], "text/csv")
    ])

    # Case B
    cB_files = DemoDatasetGenerator.generate_case_b(demo_dir / "case_b")
    res_B = run_case(db, "CASE B (Ambiguous Claim)", [
        (cB_files[0], "application/pdf"),
        (cB_files[1], "application/pdf"),
        (cB_files[2], "message/rfc822"),
        (cB_files[3], "text/csv")
    ])

    # Case C
    cC_files = DemoDatasetGenerator.generate_case_c(demo_dir / "case_c")
    res_C = run_case(db, "CASE C (Contradicted Claim)", [
        (cC_files[0], "application/pdf"),
        (cC_files[1], "application/pdf"),
        (cC_files[2], "message/rfc822"),
        (cC_files[3], "text/csv")
    ])

    results = [res_A, res_B, res_C]

    format_row = "{:<27} | {:<15} | {:<10} | {:<17} | {:<14}"
    print(format_row.format("CASE", "DISPUTED AMT", "SCORE", "EXPECTED RECOVERY", "RECOMMENDATION"))
    print("-" * 95)

    for r in results:
        print(format_row.format(
            r["case"],
            r["disputed_amount"],
            r["score"],
            r["expected_recovery"],
            r["recommendation"]
        ))
        print(f"  |- AI Findings:  {r['ai_findings']}")
        print(f"  |- Evidence:     {r['supporting_evidence']}")
        print(f"  \\- Contradiction:{r['contradictions']}\n")

    print("==========================================================================================\n")
    db.close()

if __name__ == "__main__":
    print_audit_report()
