import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
from backend.app.core.logging import logger
from backend.app.schemas.telemetry import (
    TelemetryRow, TelemetryReport, TelemetryStateWindow, GPSBoundaryEvent
)

# Standard alias mappings for OEM / Telemetry column names
COLUMN_ALIASES: Dict[str, List[str]] = {
    "timestamp": ["timestamp", "datetime", "event_time", "event_timestamp", "date", "time", "time_stamp", "ts"],
    "rpm": ["rpm", "engine_rpm", "engine_rpm_value", "engine rpm", "rotations_per_minute"],
    "hydraulic_pressure": ["hydraulic_pressure", "hyd_pressure", "hydraulic_psi", "hydraulic pressure", "hyd_psi", "pressure_psi"],
    "latitude": ["latitude", "lat", "lat_coord", "y"],
    "longitude": ["longitude", "lng", "lon", "long", "x"],
    "engine_hours": ["engine_hours", "eng_hours", "hours", "total_hours", "cumulative_hours"],
    "fuel_rate": ["fuel_rate", "fuel_consumption", "fuel_lph", "fuel_gph"],
    "equipment_id": ["equipment_id", "asset_id", "machine_id", "unit_number", "vin", "serial_number"]
}

class ConfigurableThresholds:
    def __init__(
        self,
        active_rpm_min: float = 700.0,
        active_hydraulic_psi_min: float = 500.0,
        idle_rpm_max: float = 700.0,
        moving_speed_kmh_min: float = 3.0,
        geofence_radius_meters: float = 200.0
    ):
        self.active_rpm_min = active_rpm_min
        self.active_hydraulic_psi_min = active_hydraulic_psi_min
        self.idle_rpm_max = idle_rpm_max
        self.moving_speed_kmh_min = moving_speed_kmh_min
        self.geofence_radius_meters = geofence_radius_meters

    def to_dict(self) -> Dict[str, Any]:
        return {
            "active_rpm_min": self.active_rpm_min,
            "active_hydraulic_psi_min": self.active_hydraulic_psi_min,
            "idle_rpm_max": self.idle_rpm_max,
            "moving_speed_kmh_min": self.moving_speed_kmh_min,
            "geofence_radius_meters": self.geofence_radius_meters
        }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class TelemetryEngine:
    def __init__(self, thresholds: Optional[ConfigurableThresholds] = None):
        self.thresholds = thresholds or ConfigurableThresholds()

    def normalize_columns(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, TelemetryReport]:
        """
        Maps arbitrary CSV column names to canonical schema fields.
        Returns normalized DataFrame and field availability report.
        """
        col_mapping: Dict[str, str] = {}
        found_canonical: List[str] = []
        
        # Build lower-case lookup map of CSV columns
        csv_cols_lower = {str(col).strip().lower(): col for col in df.columns}

        for canonical_field, aliases in COLUMN_ALIASES.items():
            matched_col = None
            for alias in aliases:
                if alias.lower() in csv_cols_lower:
                    matched_col = csv_cols_lower[alias.lower()]
                    break
            if matched_col:
                col_mapping[matched_col] = canonical_field
                found_canonical.append(canonical_field)

        # Rename columns in DataFrame
        norm_df = df.rename(columns=col_mapping)
        
        missing_fields = [f for f in COLUMN_ALIASES.keys() if f not in found_canonical]

        # Parse timestamp column if present
        if "timestamp" in norm_df.columns:
            norm_df["timestamp"] = pd.to_datetime(norm_df["timestamp"], errors="coerce", utc=True)
            norm_df = norm_df.sort_values("timestamp").reset_index(drop=True)

        time_range = {"start": None, "end": None}
        if "timestamp" in norm_df.columns and not norm_df["timestamp"].dropna().empty:
            valid_ts = norm_df["timestamp"].dropna()
            time_range["start"] = valid_ts.min().isoformat()
            time_range["end"] = valid_ts.max().isoformat()

        equipment_ids = []
        if "equipment_id" in norm_df.columns:
            equipment_ids = [str(x) for x in norm_df["equipment_id"].dropna().unique()]

        report = TelemetryReport(
            available_fields=found_canonical,
            missing_fields=missing_fields,
            normalized_fields={k: v for k, v in col_mapping.items()},
            row_count=len(norm_df),
            time_range=time_range,
            equipment_ids=equipment_ids
        )
        return norm_df, report

    def classify_row_state(self, row: pd.Series, prev_row: Optional[pd.Series] = None) -> str:
        """
        Determines machine operational state for a single row:
        OFF, IDLE, ACTIVE, MOVING, or UNKNOWN.
        """
        rpm = row.get("rpm") if pd.notna(row.get("rpm")) else None
        pressure = row.get("hydraulic_pressure") if pd.notna(row.get("hydraulic_pressure")) else None
        lat = row.get("latitude") if pd.notna(row.get("latitude")) else None
        lon = row.get("longitude") if pd.notna(row.get("longitude")) else None

        # Check movement via GPS delta if previous point exists
        is_moving = False
        if prev_row is not None and lat is not None and lon is not None:
            prev_lat = prev_row.get("latitude") if pd.notna(prev_row.get("latitude")) else None
            prev_lon = prev_row.get("longitude") if pd.notna(prev_row.get("longitude")) else None
            ts = row.get("timestamp")
            prev_ts = prev_row.get("timestamp")

            if prev_lat is not None and prev_lon is not None and ts is not None and prev_ts is not None:
                dist_m = haversine_distance(prev_lat, prev_lon, lat, lon)
                time_delta_sec = (ts - prev_ts).total_seconds()
                if time_delta_sec > 0:
                    speed_kmh = (dist_m / 1000.0) / (time_delta_sec / 3600.0)
                    if speed_kmh >= self.thresholds.moving_speed_kmh_min:
                        is_moving = True

        if is_moving:
            return "MOVING"

        if rpm is not None:
            if rpm <= 0:
                return "OFF"
            elif rpm > self.thresholds.active_rpm_min and (pressure is None or pressure >= self.thresholds.active_hydraulic_psi_min):
                return "ACTIVE"
            elif rpm > 0:
                return "IDLE"

        return "UNKNOWN"

    def calculate_state_windows(self, norm_df: pd.DataFrame) -> List[TelemetryStateWindow]:
        """
        Groups continuous telemetry rows into time duration windows.
        Handles irregular sampling intervals correctly.
        """
        if norm_df.empty or "timestamp" not in norm_df.columns:
            return []

        windows: List[TelemetryStateWindow] = []
        current_state: Optional[str] = None
        start_ts: Optional[datetime] = None
        end_ts: Optional[datetime] = None
        start_row: int = 0
        sample_count: int = 0

        prev_row = None
        for idx, row in norm_df.iterrows():
            ts = row.get("timestamp")
            if pd.isna(ts):
                continue
            
            ts_dt = ts.to_pydatetime()
            state = self.classify_row_state(row, prev_row)
            prev_row = row

            if current_state is None:
                current_state = state
                start_ts = ts_dt
                end_ts = ts_dt
                start_row = idx
                sample_count = 1
            elif state == current_state:
                end_ts = ts_dt
                sample_count += 1
            else:
                duration_sec = (end_ts - start_ts).total_seconds() if (end_ts and start_ts) else 0.0
                windows.append(TelemetryStateWindow(
                    state=current_state,
                    start_time=start_ts,
                    end_time=end_ts,
                    duration_seconds=duration_sec,
                    start_row=start_row,
                    end_row=idx - 1,
                    sample_count=sample_count
                ))
                current_state = state
                start_ts = ts_dt
                end_ts = ts_dt
                start_row = idx
                sample_count = 1

        if current_state and start_ts and end_ts:
            duration_sec = (end_ts - start_ts).total_seconds()
            windows.append(TelemetryStateWindow(
                state=current_state,
                start_time=start_ts,
                end_time=end_ts,
                duration_seconds=duration_sec,
                start_row=start_row,
                end_row=len(norm_df) - 1,
                sample_count=sample_count
            ))

        return windows

    def detect_geofence_events(
        self,
        norm_df: pd.DataFrame,
        site_lat: float,
        site_lon: float
    ) -> List[GPSBoundaryEvent]:
        """
        Detects site arrival and departure events relative to a site geofence coordinate.
        Returns events with exact source row citations.
        """
        events: List[GPSBoundaryEvent] = []
        if norm_df.empty or "latitude" not in norm_df.columns or "longitude" not in norm_df.columns:
            return events

        inside = None
        for idx, row in norm_df.iterrows():
            lat = row.get("latitude")
            lon = row.get("longitude")
            ts = row.get("timestamp")
            if pd.isna(lat) or pd.isna(lon) or pd.isna(ts):
                continue

            dist = haversine_distance(site_lat, site_lon, float(lat), float(lon))
            currently_inside = dist <= self.thresholds.geofence_radius_meters

            if inside is None:
                inside = currently_inside
            elif not inside and currently_inside:
                # Site Arrival
                inside = True
                events.append(GPSBoundaryEvent(
                    event_type="SITE_ARRIVAL",
                    timestamp=ts.to_pydatetime(),
                    latitude=float(lat),
                    longitude=float(lon),
                    distance_from_center_m=dist,
                    source_row=int(idx),
                    details={"geofence_radius_m": self.thresholds.geofence_radius_meters}
                ))
            elif inside and not currently_inside:
                # Site Departure
                inside = False
                events.append(GPSBoundaryEvent(
                    event_type="SITE_DEPARTURE",
                    timestamp=ts.to_pydatetime(),
                    latitude=float(lat),
                    longitude=float(lon),
                    distance_from_center_m=dist,
                    source_row=int(idx),
                    details={"geofence_radius_m": self.thresholds.geofence_radius_meters}
                ))

        return events
