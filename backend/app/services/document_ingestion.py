import os
from pathlib import Path
from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.models import Investigation, Document, DocumentChunk
from backend.app.services.event_service import EventService
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.vision_ocr import VisionOCRService
from backend.app.parsers.pdf_parser import parse_pdf
from backend.app.parsers.csv_parser import parse_csv
from backend.app.parsers.email_parser import parse_eml

ALLOWED_EXTENSIONS = {
    ".pdf", ".csv", ".eml", ".txt",
    ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".webp"
}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".webp"}

class DocumentIngestionService:
    @staticmethod
    async def process_uploads(
        db: Session,
        investigation_id: str,
        files: List[UploadFile]
    ) -> List[Document]:
        investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if not investigation:
            raise HTTPException(status_code=404, detail=f"Investigation {investigation_id} not found")

        investigation.status = "INGESTING"
        db.commit()

        EventService.create_event(
            db,
            investigation_id,
            "DOCUMENT_UPLOAD_STARTED",
            f"Started uploading {len(files)} document(s)",
            {"count": len(files)}
        )

        saved_docs: List[Document] = []
        inv_storage_dir = settings.STORAGE_DIR / investigation_id
        os.makedirs(inv_storage_dir, exist_ok=True)

        for file in files:
            filename = file.filename or "unnamed_file"
            file_ext = Path(filename).suffix.lower()

            if file_ext not in ALLOWED_EXTENSIONS:
                EventService.create_event(
                    db,
                    investigation_id,
                    "DOCUMENT_REJECTED",
                    f"File '{filename}' rejected: Unsupported file extension '{file_ext}'",
                    {"filename": filename, "extension": file_ext}
                )
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file extension '{file_ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
                )

            storage_path = inv_storage_dir / filename
            content = await file.read()
            file_size = len(content)

            with open(storage_path, "wb") as f:
                f.write(content)

            file_type_label = "IMAGE" if file_ext in IMAGE_EXTENSIONS else file_ext.lstrip(".").upper()

            doc = Document(
                investigation_id=investigation_id,
                filename=filename,
                file_type=file_type_label,
                file_size=file_size,
                storage_path=str(storage_path),
                status="UPLOADED"
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            saved_docs.append(doc)

            EventService.create_event(
                db,
                investigation_id,
                "DOCUMENT_UPLOADED",
                f"Uploaded '{filename}' ({file_size} bytes)",
                {"document_id": doc.id, "filename": filename, "size": file_size}
            )

            # Instantly parse document content
            DocumentIngestionService.parse_document(db, doc)

        # Check investigation parsing completion status
        all_docs = db.query(Document).filter(Document.investigation_id == investigation_id).all()
        if all(d.status in ["PARSED", "FAILED"] for d in all_docs):
            investigation.status = "READY"
            db.commit()
            EventService.create_event(
                db,
                investigation_id,
                "INGESTION_COMPLETED",
                "All uploaded documents ingested and parsed successfully",
                {"total_documents": len(all_docs)}
            )

        return saved_docs

    @staticmethod
    def parse_document(db: Session, doc: Document):
        doc.status = "PARSING"
        db.commit()

        EventService.create_event(
            db,
            doc.investigation_id,
            "DOCUMENT_PARSE_STARTED",
            f"Parsing document '{doc.filename}' ({doc.file_type})",
            {"document_id": doc.id, "filename": doc.filename}
        )

        file_path = Path(doc.storage_path)
        file_ext = file_path.suffix.lower()

        if file_ext == ".pdf":
            result = parse_pdf(file_path)
        elif file_ext == ".csv":
            result = parse_csv(file_path)
        elif file_ext in [".eml", ".txt"]:
            result = parse_eml(file_path)
        elif file_ext in IMAGE_EXTENSIONS:
            # Standalone image ingestion using VisionOCRService
            ocr_res = VisionOCRService.transcribe_image_file(file_path)
            if ocr_res.get("success") and ocr_res.get("text"):
                result = {
                    "success": True,
                    "metadata": {
                        "format": file_ext.lstrip(".").upper(),
                        "extraction_method": ocr_res.get("method", "GEMINI_FLASH_VISION"),
                        "ocr_applied": True
                    },
                    "chunks": [
                        {
                            "chunk_index": 0,
                            "page_number": 1,
                            "content": ocr_res["text"],
                            "metadata_json": {
                                "filename": doc.filename,
                                "page_number": 1,
                                "char_start": 0,
                                "char_end": len(ocr_res["text"]),
                                "ocr_applied": True,
                                "extraction_method": ocr_res.get("method", "GEMINI_FLASH_VISION")
                            }
                        }
                    ],
                    "error": None
                }
            else:
                result = {
                    "success": True,
                    "metadata": {
                        "format": file_ext.lstrip(".").upper(),
                        "extraction_method": "IMAGE_UNPROCESSED_OFFLINE",
                        "ocr_applied": False
                    },
                    "chunks": [
                        {
                            "chunk_index": 0,
                            "page_number": 1,
                            "content": f"[IMAGE_DOCUMENT: {doc.filename} - OCR pending / offline]",
                            "metadata_json": {
                                "filename": doc.filename,
                                "page_number": 1,
                                "char_start": 0,
                                "char_end": 0,
                                "ocr_applied": False,
                                "extraction_method": "OFFLINE_PLACEHOLDER"
                            }
                        }
                    ],
                    "error": None
                }
        else:
            result = {"success": False, "error": f"No parser for {file_ext}", "chunks": [], "metadata": {}}

        if result.get("success"):
            doc.status = "PARSED"
            doc.doc_metadata = result.get("metadata", {})
            db.commit()

            # Store document chunks in database
            for chunk_data in result.get("chunks", []):
                chunk = DocumentChunk(
                    document_id=doc.id,
                    chunk_index=chunk_data["chunk_index"],
                    page_number=chunk_data.get("page_number"),
                    content=chunk_data["content"],
                    metadata_json=chunk_data.get("metadata_json")
                )
                db.add(chunk)
            db.commit()

            # Create initial evidence item for ingested document metadata
            EvidenceService.create_evidence(
                db=db,
                investigation_id=doc.investigation_id,
                source_document_id=doc.id,
                source_type=doc.file_type,
                extracted_fact=f"Ingested {doc.file_type} document '{doc.filename}' with metadata: {doc.doc_metadata}",
                source_citation={"filename": doc.filename, "file_type": doc.file_type},
                extraction_method=result.get("metadata", {}).get("extraction_method", "DOCUMENT_INGESTION_PARSER")
            )

            EventService.create_event(
                db,
                doc.investigation_id,
                "DOCUMENT_PARSE_COMPLETED",
                f"Successfully parsed '{doc.filename}' into {len(result.get('chunks', []))} chunk(s)",
                {"document_id": doc.id, "filename": doc.filename, "chunk_count": len(result.get("chunks", []))}
            )
        else:
            doc.status = "FAILED"
            db.commit()

            EventService.create_event(
                db,
                doc.investigation_id,
                "DOCUMENT_PARSE_FAILED",
                f"Failed parsing '{doc.filename}': {result.get('error')}",
                {"document_id": doc.id, "filename": doc.filename, "error": result.get("error")}
            )
