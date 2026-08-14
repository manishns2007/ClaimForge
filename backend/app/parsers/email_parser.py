from pathlib import Path
from typing import Dict, Any, List
import email
from email import policy
from backend.app.core.logging import logger

def parse_eml(file_path: Path) -> Dict[str, Any]:
    """
    Parses .eml or text email files using standard library `email`.
    Extracts headers (From, To, Subject, Date) and body text.
    """
    try:
        content_bytes = file_path.read_bytes()
        msg = email.message_from_bytes(content_bytes, policy=policy.default)
        
        sender = str(msg.get("From", ""))
        recipient = str(msg.get("To", ""))
        subject = str(msg.get("Subject", ""))
        date_str = str(msg.get("Date", ""))
        
        body_parts = []
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try:
                        body_parts.append(part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="replace"))
                    except Exception:
                        body_parts.append(str(part.get_payload()))
        else:
            try:
                body_parts.append(msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8", errors="replace"))
            except Exception:
                body_parts.append(str(msg.get_payload()))
                
        full_body = "\n".join(body_parts).strip()
        
        # If parsing email failed to get text, try raw file text
        if not full_body:
            full_body = file_path.read_text(encoding="utf-8", errors="replace").strip()
            
        chunks = [{
            "chunk_index": 0,
            "page_number": 1,
            "content": full_body,
            "metadata_json": {
                "filename": file_path.name,
                "from": sender,
                "to": recipient,
                "subject": subject,
                "date": date_str
            }
        }]
        
        metadata = {
            "from": sender,
            "to": recipient,
            "subject": subject,
            "date": date_str,
            "char_count": len(full_body)
        }
        
        return {
            "success": True,
            "metadata": metadata,
            "chunks": chunks,
            "error": None
        }
    except Exception as e:
        logger.error(f"Error parsing EML {file_path}: {e}")
        return {
            "success": False,
            "metadata": {},
            "chunks": [],
            "error": str(e)
        }
