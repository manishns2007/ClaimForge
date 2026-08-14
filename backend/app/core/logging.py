import logging
import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

class JSONFormatter(logging.Formatter):
    """Structured JSON log formatter for ClaimForge."""
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.module,
            "message": record.getMessage(),
        }
        
        # Attach investigation_id or extra fields if present
        if hasattr(record, "investigation_id"):
            log_data["investigation_id"] = getattr(record, "investigation_id")
        if hasattr(record, "action"):
            log_data["action"] = getattr(record, "action")
            
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_data)

def setup_logger(name: str = "claimforge") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        
    return logger

logger = setup_logger()
