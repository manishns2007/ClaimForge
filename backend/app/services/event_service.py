from typing import Optional, Dict, Any, List
import asyncio
from sqlalchemy.orm import Session
from backend.app.db.models import InvestigationEvent
from backend.app.core.logging import logger

# In-memory queue registry for active SSE subscribers per investigation_id
_event_subscribers: Dict[str, List[asyncio.Queue]] = {}

class EventService:
    @staticmethod
    def create_event(
        db: Session,
        investigation_id: str,
        event_type: str,
        message: str,
        details_json: Optional[Dict[str, Any]] = None
    ) -> InvestigationEvent:
        """
        Persists an investigation event to the database and broadcasts to SSE queues.
        """
        event = InvestigationEvent(
            investigation_id=investigation_id,
            event_type=event_type,
            message=message,
            details_json=details_json or {}
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        logger.info(f"Event [{event_type}] for investigation {investigation_id}: {message}")

        # Broadcast to active SSE subscribers
        subscribers = _event_subscribers.get(investigation_id, [])
        event_dict = {
            "id": event.id,
            "investigation_id": event.investigation_id,
            "event_type": event.event_type,
            "message": event.message,
            "details_json": event.details_json,
            "timestamp": event.timestamp.isoformat()
        }
        for queue in list(subscribers):
            try:
                queue.put_nowait(event_dict)
            except Exception as e:
                logger.warning(f"Failed to put event in queue: {e}")

        return event

    @staticmethod
    def get_events(
        db: Session,
        investigation_id: str,
        limit: int = 100
    ) -> List[InvestigationEvent]:
        return (
            db.query(InvestigationEvent)
            .filter(InvestigationEvent.investigation_id == investigation_id)
            .order_by(InvestigationEvent.timestamp.asc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def subscribe(investigation_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        if investigation_id not in _event_subscribers:
            _event_subscribers[investigation_id] = []
        _event_subscribers[investigation_id].append(queue)
        return queue

    @staticmethod
    def unsubscribe(investigation_id: str, queue: asyncio.Queue):
        if investigation_id in _event_subscribers:
            if queue in _event_subscribers[investigation_id]:
                _event_subscribers[investigation_id].remove(queue)
            if not _event_subscribers[investigation_id]:
                del _event_subscribers[investigation_id]
