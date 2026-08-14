from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import Claim
from backend.app.schemas.claim import ClaimResponse

router = APIRouter(prefix="/api/claims", tags=["claims"])

@router.get("", response_model=List[ClaimResponse])
def list_claims(
    investigation_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Claim)
    if investigation_id:
        query = query.filter(Claim.investigation_id == investigation_id)
    return query.order_by(Claim.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{id}", response_model=ClaimResponse)
def get_claim(
    id: str,
    db: Session = Depends(get_db)
):
    claim = db.query(Claim).filter(Claim.id == id).first()
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim '{id}' not found")
    return claim
