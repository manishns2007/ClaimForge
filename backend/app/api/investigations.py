import json
import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import Investigation
from backend.app.schemas.investigation import InvestigationCreate, InvestigationResponse
from backend.app.schemas.document import DocumentResponse
from backend.app.schemas.events import InvestigationEventResponse
from backend.app.services.event_service import EventService
from backend.app.services.document_ingestion import DocumentIngestionService
from backend.app.core.logging import logger

router = APIRouter(prefix="/api/investigations", tags=["investigations"])

@router.post("", response_model=InvestigationResponse, status_code=201)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db)
):
    investigation = Investigation(
        title=payload.title,
        vertical=payload.vertical or "EQUIPMENT_RENTAL",
        status="PENDING"
    )
    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    EventService.create_event(
        db,
        investigation.id,
        "INVESTIGATION_CREATED",
        f"Investigation '{investigation.title}' created",
        {"vertical": investigation.vertical}
    )

    return investigation

@router.get("", response_model=List[InvestigationResponse])
def list_investigations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return db.query(Investigation).order_by(Investigation.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{id}", response_model=InvestigationResponse)
def get_investigation(
    id: str,
    db: Session = Depends(get_db)
):
    investigation = db.query(Investigation).filter(Investigation.id == id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail=f"Investigation '{id}' not found")
    return investigation

@router.get("/{id}/details")
def get_investigation_details(
    id: str,
    db: Session = Depends(get_db)
):
    from backend.app.db.models import Claim, AgentFindingRecord, ContradictionRecord, Evidence, Event, ContractRule, Charge
    investigation = db.query(Investigation).filter(Investigation.id == id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail=f"Investigation '{id}' not found")

    claim = db.query(Claim).filter(Claim.investigation_id == id).first()
    findings = db.query(AgentFindingRecord).filter(AgentFindingRecord.investigation_id == id).all()
    contradictions = db.query(ContradictionRecord).filter(ContradictionRecord.investigation_id == id).all()
    evidence_items = db.query(Evidence).filter(Evidence.investigation_id == id).all()
    timeline_events = db.query(Event).filter(Event.investigation_id == id).order_by(Event.timestamp.asc()).all()
    contract_rules = db.query(ContractRule).filter(ContractRule.investigation_id == id).all()
    charges = db.query(Charge).filter(Charge.investigation_id == id).all()

    return {
        "investigation": {
            "id": investigation.id,
            "title": investigation.title,
            "vertical": investigation.vertical,
            "status": investigation.status,
            "total_analyzed_amount": investigation.total_analyzed_amount,
            "total_disputed_amount": investigation.total_disputed_amount,
            "total_expected_recovery": investigation.total_expected_recovery,
            "created_at": investigation.created_at.isoformat() if investigation.created_at else None,
            "updated_at": investigation.updated_at.isoformat() if investigation.updated_at else None,
            "documents": [
                {
                    "id": d.id,
                    "investigation_id": d.investigation_id,
                    "filename": d.filename,
                    "file_type": d.file_type,
                    "file_size": d.file_size,
                    "status": d.status,
                    "doc_metadata": d.doc_metadata,
                    "created_at": d.created_at.isoformat() if d.created_at else None
                }
                for d in investigation.documents
            ]
        },
        "claim": {
            "id": claim.id,
            "vendor_name": claim.vendor_name,
            "invoice_number": claim.invoice_number,
            "original_amount": claim.original_amount,
            "disputed_amount": claim.disputed_amount,
            "reason": claim.reason,
            "recoverability_score": claim.recoverability_score,
            "expected_recovery_value": claim.expected_recovery_value,
            "recommendation": claim.recommendation,
            "status": claim.status,
        } if claim else None,
        "agent_findings": [
            {
                "id": f.id,
                "agent_name": f.agent_name,
                "category": f.category,
                "finding_summary": f.finding_summary,
                "finding_data_json": f.finding_data_json,
                "confidence": f.confidence,
                "created_at": f.created_at.isoformat() if f.created_at else None
            }
            for f in findings
        ],
        "contradictions": [
            {
                "id": c.id,
                "contradiction_type": c.contradiction_type,
                "description": c.description,
                "severity": c.severity,
                "source_citations": c.source_citations_json,
                "evidence_ids": c.evidence_ids_json,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in contradictions
        ],
        "evidence": [
            {
                "id": e.id,
                "source_document_id": e.source_document_id,
                "source_type": e.source_type,
                "extracted_fact": e.extracted_fact,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "location_reference": e.location_reference,
                "extraction_method": e.extraction_method,
                "confidence": e.confidence,
                "source_citation": e.source_citation
            }
            for e in evidence_items
        ],
        "timeline": [
            {
                "id": ev.id,
                "source_document_id": ev.source_document_id,
                "event_type": ev.event_type,
                "description": ev.description,
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
                "confidence": ev.confidence,
                "source_citation": ev.source_citation
            }
            for ev in timeline_events
        ],
        "contract_rules": [
            {
                "id": r.id,
                "source_document_id": r.source_document_id,
                "rule_type": r.rule_type,
                "rule_value_json": r.rule_value_json,
                "section_reference": r.section_reference,
                "source_citation": r.source_citation
            }
            for r in contract_rules
        ],
        "charges": [
            {
                "id": ch.id,
                "source_document_id": ch.source_document_id,
                "charge_type": ch.charge_type,
                "description": ch.description,
                "billed_amount": ch.billed_amount,
                "expected_amount": ch.expected_amount,
                "unit_rate": ch.unit_rate,
                "units_billed": ch.units_billed,
                "units_actual": ch.units_actual,
                "source_citation": ch.source_citation
            }
            for ch in charges
        ]
    }

@router.get("/{investigation_id}/documents/{document_id}/content")
def get_document_content(
    investigation_id: str,
    document_id: str,
    raw: bool = False,
    db: Session = Depends(get_db)
):
    from pathlib import Path
    from fastapi.responses import FileResponse
    from backend.app.db.models import Document
    from backend.app.core.config import settings

    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.investigation_id == investigation_id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{document_id}' not found for investigation '{investigation_id}'"
        )

    file_path = Path(doc.storage_path).resolve()
    storage_dir_resolved = settings.STORAGE_DIR.resolve()

    try:
        file_path.relative_to(storage_dir_resolved)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied: Invalid document path")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found on disk: {doc.filename}")

    if raw or doc.file_type == "PDF":
        mime_type = "application/pdf" if doc.file_type == "PDF" else "text/plain"
        if doc.file_type == "CSV":
            mime_type = "text/csv"
        return FileResponse(path=file_path, filename=doc.filename, media_type=mime_type)

    chunks_data = [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "page_number": c.page_number,
            "content": c.content,
            "metadata_json": c.metadata_json
        }
        for c in doc.chunks
    ]

    try:
        text_content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        text_content = "\n\n".join([c.content for c in doc.chunks])

    return {
        "id": doc.id,
        "investigation_id": doc.investigation_id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "status": doc.status,
        "doc_metadata": doc.doc_metadata,
        "content": text_content,
        "chunks": chunks_data,
        "created_at": doc.created_at.isoformat() if doc.created_at else None
    }

@router.post("/{id}/documents", response_model=List[DocumentResponse])
async def upload_documents(
    id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    return await DocumentIngestionService.process_uploads(db, id, files)

@router.post("/{id}/run")
def run_investigation(
    id: str,
    db: Session = Depends(get_db)
):
    from backend.app.agents.orchestrator import AIInvestigationOrchestrator
    try:
        res = AIInvestigationOrchestrator.run_full_investigation(db, id)
        return res
    except Exception as e:
        logger.error(f"Error running investigation {id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}/events", response_model=List[InvestigationEventResponse])
def get_investigation_events(
    id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    investigation = db.query(Investigation).filter(Investigation.id == id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail=f"Investigation '{id}' not found")
    return EventService.get_events(db, id, limit)

@router.get("/{id}/stream")
async def stream_investigation_events(
    id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    investigation = db.query(Investigation).filter(Investigation.id == id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail=f"Investigation '{id}' not found")

    queue = EventService.subscribe(id)

    async def event_generator():
        try:
            # First send all existing persisted events
            existing_events = EventService.get_events(db, id, limit=500)
            for evt in existing_events:
                evt_dict = {
                    "id": evt.id,
                    "investigation_id": evt.investigation_id,
                    "event_type": evt.event_type,
                    "message": evt.message,
                    "details_json": evt.details_json,
                    "timestamp": evt.timestamp.isoformat()
                }
                yield f"data: {json.dumps(evt_dict)}\n\n"

            # Stream new events live
            while True:
                if await request.is_disconnected():
                    logger.info(f"Client disconnected from SSE stream for investigation {id}")
                    break
                try:
                    event_dict = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield f"data: {json.dumps(event_dict)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat comment to keep SSE connection alive
                    yield ": heartbeat\n\n"
        finally:
            EventService.unsubscribe(id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
