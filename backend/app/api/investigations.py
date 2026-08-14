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
