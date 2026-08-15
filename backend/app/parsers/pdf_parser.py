from pathlib import Path
from typing import List, Dict, Any
import pymupdf as fitz
from backend.app.core.logging import logger
from backend.app.services.vision_ocr import VisionOCRService

def parse_pdf(file_path: Path) -> Dict[str, Any]:
    """
    Extracts pages, structured tables, and text chunks from a PDF file using PyMuPDF Layout Engine.
    Preserves multi-column tables as Markdown and routes scanned/image pages to Gemini Flash Vision OCR.
    """
    try:
        doc = fitz.open(str(file_path))
        num_pages = len(doc)
        chunks: List[Dict[str, Any]] = []
        
        running_char_offset = 0
        total_tables = 0

        for page_idx in range(num_pages):
            page = doc.load_page(page_idx)
            page_number = page_idx + 1
            
            raw_text = page.get_text("text") or ""
            raw_text_clean = raw_text.strip()
            
            # 1. Table Detection & Layout Extraction via PyMuPDF Layout Engine
            table_markdowns = []
            has_tables = False
            try:
                table_finder = page.find_tables()
                if table_finder and table_finder.tables:
                    for tab in table_finder.tables:
                        try:
                            md_str = tab.to_markdown()
                            if md_str and md_str.strip():
                                table_markdowns.append(md_str.strip())
                                has_tables = True
                                total_tables += 1
                        except Exception as te:
                            logger.debug(f"Table markdown conversion failed: {te}")
            except Exception as e:
                logger.debug(f"Table detection skipped for page {page_number}: {e}")

            # 2. Scanned / Image Page Detection
            ocr_applied = False
            extraction_method = "PDF_TEXT"

            if len(raw_text_clean) < 50:
                # Page is predominantly an image or scanned bitmap
                logger.info(f"Page {page_number} in '{file_path.name}' has low text ({len(raw_text_clean)} chars). Invoking Vision OCR...")
                try:
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    ocr_res = VisionOCRService.transcribe_image_bytes(img_bytes, mime_type="image/png")
                    if ocr_res.get("success") and ocr_res.get("text"):
                        page_content = ocr_res["text"]
                        ocr_applied = True
                        extraction_method = "GEMINI_FLASH_VISION"
                    else:
                        page_content = raw_text_clean or "[SCANNED_IMAGE_PAGE - TEXT_UNRESOLVED]"
                        extraction_method = "PDF_IMAGE_FALLBACK"
                except Exception as oe:
                    logger.warning(f"Vision OCR failed on page {page_number}: {oe}")
                    page_content = raw_text_clean or "[SCANNED_IMAGE_PAGE - ERROR]"
                    extraction_method = "PDF_ERROR"
            else:
                # Combine standard text with structured markdown tables if extracted
                if table_markdowns:
                    page_content = f"{raw_text_clean}\n\n### Extracted Structured Tables:\n" + "\n\n".join(table_markdowns)
                    extraction_method = "PDF_LAYOUT_TABLES"
                else:
                    page_content = raw_text_clean
                    extraction_method = "PDF_TEXT"

            char_length = len(page_content)
            char_start = running_char_offset
            char_end = running_char_offset + char_length
            running_char_offset = char_end + 1

            chunks.append({
                "chunk_index": page_idx,
                "page_number": page_number,
                "content": page_content,
                "metadata_json": {
                    "filename": file_path.name,
                    "page_number": page_number,
                    "character_count": char_length,
                    "char_start": char_start,
                    "char_end": char_end,
                    "has_tables": has_tables,
                    "table_count": len(table_markdowns),
                    "ocr_applied": ocr_applied,
                    "extraction_method": extraction_method
                }
            })
            
        metadata = {
            "page_count": num_pages,
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "format": doc.metadata.get("format", ""),
            "total_tables_extracted": total_tables
        }
        
        doc.close()
        return {
            "success": True,
            "metadata": metadata,
            "chunks": chunks,
            "error": None
        }
    except Exception as e:
        logger.error(f"Error parsing PDF {file_path}: {e}")
        return {
            "success": False,
            "metadata": {},
            "chunks": [],
            "error": str(e)
        }
