import os
import io
from pathlib import Path
from typing import Optional, Dict, Any
from backend.app.core.config import settings
from backend.app.core.logging import logger

class VisionOCRService:
    """
    Multimodal Vision OCR Service for scanned documents, receipts, and image files.
    Utilizes Gemini Flash Vision (gemini-2.5-flash) via google.genai when API keys are present.
    Provides deterministic fallback when offline without fabricating data.
    """
    @staticmethod
    def is_available() -> bool:
        gemini_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
        return bool(gemini_key)

    @classmethod
    def transcribe_image_bytes(
        cls,
        image_bytes: bytes,
        mime_type: str = "image/png",
        context_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribes image bytes into structured Markdown text with preserved tables and headers.
        """
        if not image_bytes:
            return {"success": False, "text": "", "error": "Empty image bytes", "method": "NONE"}

        gemini_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            logger.info("[VisionOCRService] No GEMINI_API_KEY configured. Vision OCR skipped.")
            return {
                "success": False,
                "text": "",
                "error": "VISION_API_KEY_UNAVAILABLE",
                "method": "UNAVAILABLE"
            }

        try:
            from google import genai
            from google.genai import types

            os.environ["GEMINI_API_KEY"] = gemini_key
            client = genai.Client()

            prompt = (
                context_prompt or
                "Transcribe all text, numbers, line items, and tables from this document page verbatim into clean Markdown.\n"
                "Preserve all invoice numbers, vendor names, dates, rate grids, and dollar amounts exactly as written.\n"
                "Render any tables as Markdown tables (| Header 1 | Header 2 |).\n"
                "Do NOT summarize, invent, or omit any text."
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ]
            )

            text_output = response.text or ""
            return {
                "success": True,
                "text": text_output.strip(),
                "error": None,
                "method": "GEMINI_FLASH_VISION"
            }
        except Exception as e:
            logger.warning(f"[VisionOCRService] Vision transcription failed: {e}")
            return {
                "success": False,
                "text": "",
                "error": str(e),
                "method": "FAILED"
            }

    @classmethod
    def transcribe_image_file(cls, file_path: Path) -> Dict[str, Any]:
        """Transcribe a standalone image file (PNG, JPG, JPEG, TIFF)."""
        suffix = file_path.suffix.lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
            ".webp": "image/webp"
        }
        mime_type = mime_map.get(suffix, "image/png")

        try:
            img_bytes = file_path.read_bytes()
            return cls.transcribe_image_bytes(img_bytes, mime_type=mime_type)
        except Exception as e:
            logger.error(f"[VisionOCRService] Failed reading image file {file_path}: {e}")
            return {"success": False, "text": "", "error": str(e), "method": "FAILED"}
