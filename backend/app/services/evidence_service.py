from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.db.models import Evidence
from backend.app.core.logging import logger

class EvidenceService:
    @staticmethod
    def create_evidence(
        db: Session,
        investigation_id: str,
        source_document_id: Optional[str],
        source_type: str,
        extracted_fact: str,
        source_citation: Dict[str, Any],
        timestamp: Optional[datetime] = None,
        location_reference: Optional[str] = None,
        extraction_method: str = "DETERMINISTIC_PARSER",
        confidence: float = 1.0
    ) -> Evidence:
        """
        Creates and stores a canonical Evidence record with source citations.
        """
        evidence = Evidence(
            investigation_id=investigation_id,
            source_document_id=source_document_id,
            source_type=source_type,
            extracted_fact=extracted_fact,
            timestamp=timestamp,
            location_reference=location_reference,
            extraction_method=extraction_method,
            confidence=confidence,
            source_citation=source_citation
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        logger.info(f"Created Evidence [{evidence.id}] for investigation {investigation_id} from {source_type}")
        return evidence

    @staticmethod
    def get_evidence_by_investigation(
        db: Session,
        investigation_id: str
    ) -> List[Evidence]:
        return db.query(Evidence).filter(Evidence.investigation_id == investigation_id).all()
