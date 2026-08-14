from pathlib import Path
from typing import List, Dict, Any
import fitz  # PyMuPDF
from backend.app.core.logging import logger

def parse_pdf(file_path: Path) -> Dict[str, Any]:
    """
    Extracts pages and text chunks from a PDF file using PyMuPDF.
    Preserves exact page numbers and source citations.
    """
    try:
        doc = fitz.open(str(file_path))
        num_pages = len(doc)
        chunks: List[Dict[str, Any]] = []
        
        full_text_pages = []
        for page_idx in range(num_pages):
            page = doc.load_page(page_idx)
            page_text = page.get_text("text") or ""
            page_number = page_idx + 1
            
            full_text_pages.append({
                "page_number": page_number,
                "text": page_text.strip()
            })
            
            chunks.append({
                "chunk_index": page_idx,
                "page_number": page_number,
                "content": page_text.strip(),
                "metadata_json": {
                    "filename": file_path.name,
                    "page_number": page_number,
                    "character_count": len(page_text)
                }
            })
            
        metadata = {
            "page_count": num_pages,
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "format": doc.metadata.get("format", "")
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
