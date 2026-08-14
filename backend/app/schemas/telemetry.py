from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class TelemetryRow(BaseModel):
    source_row: int
    timestamp: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rpm: Optional[float] = None
    hydraulic_pressure: Optional[float] = None
    engine_hours: Optional[float] = None
    fuel_rate: Optional[float] = None
    equipment_id: Optional[str] = None
    raw_data: Dict[str, Any] = {}

class TelemetryReport(BaseModel):
    available_fields: List[str]
    missing_fields: List[str]
    normalized_fields: Dict[str, str]
    row_count: int
    time_range: Dict[str, Optional[str]]
    equipment_ids: List[str]

class TelemetryStateWindow(BaseModel):
    state: str  # OFF, IDLE, ACTIVE, MOVING, UNKNOWN
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    start_row: int
    end_row: int
    sample_count: int

class GPSBoundaryEvent(BaseModel):
    event_type: str  # SITE_ARRIVAL, SITE_DEPARTURE, GEOFENCE_ENTER, GEOFENCE_EXIT
    timestamp: datetime
    latitude: float
    longitude: float
    distance_from_center_m: float
    source_row: int
    details: Dict[str, Any] = {}
