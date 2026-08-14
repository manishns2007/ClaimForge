from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import Investigation, Claim, Document, Evidence
from backend.app.core.config import settings

router = APIRouter(tags=["dashboard"])

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV
    }

@router.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Computes real executive dashboard KPIs dynamically from the database.
    No hardcoded metrics.
    """
    total_investigations = db.query(func.count(Investigation.id)).scalar() or 0
    total_documents = db.query(func.count(Document.id)).scalar() or 0
    total_evidence = db.query(func.count(Evidence.id)).scalar() or 0

    total_claims = db.query(func.count(Claim.id)).scalar() or 0
    
    # Financial metrics computed from Claims
    total_analyzed = db.query(func.sum(Claim.original_amount)).scalar() or 0.0
    total_disputed = db.query(func.sum(Claim.disputed_amount)).scalar() or 0.0
    total_expected_recovery = db.query(func.sum(Claim.expected_recovery_value)).scalar() or 0.0

    high_confidence_claims = db.query(func.count(Claim.id)).filter(Claim.recoverability_score >= 0.70).scalar() or 0
    claims_rejected = db.query(func.count(Claim.id)).filter(Claim.recommendation == "DO_NOT_DISPUTE").scalar() or 0

    return {
        "total_investigations": total_investigations,
        "total_documents": total_documents,
        "total_evidence_facts": total_evidence,
        "total_claims": total_claims,
        "total_analyzed_amount": round(float(total_analyzed), 2),
        "total_disputed_amount": round(float(total_disputed), 2),
        "total_expected_recovery": round(float(total_expected_recovery), 2),
        "high_confidence_claims": high_confidence_claims,
        "claims_rejected": claims_rejected
    }
