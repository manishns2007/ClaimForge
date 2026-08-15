from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.db.models import DocumentChunk, Document

class DocumentChunkDTO:
    """Standardized DTO for retrieved document chunks across different retriever backends."""
    def __init__(
        self,
        id: str,
        document_id: str,
        investigation_id: str,
        chunk_index: int,
        content: str,
        page_number: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        source_document_filename: Optional[str] = None,
        file_type: Optional[str] = None
    ):
        self.id = id
        self.document_id = document_id
        self.investigation_id = investigation_id
        self.chunk_index = chunk_index
        self.content = content
        self.page_number = page_number
        self.metadata = metadata or {}
        self.source_document_filename = source_document_filename
        self.file_type = file_type

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "document_id": self.document_id,
            "investigation_id": self.investigation_id,
            "chunk_index": self.chunk_index,
            "content": self.content,
            "page_number": self.page_number,
            "metadata": self.metadata,
            "source_document_filename": self.source_document_filename,
            "file_type": self.file_type
        }


class BaseDocumentRetriever(ABC):
    """
    Abstract Base Class for Document Retrieval.
    Decouples agent execution from storage/indexing layer.
    Allows drop-in integration of future vector RAG (e.g. pgvector, Qdrant, FAISS)
    without modifying domain agents.
    """
    @abstractmethod
    def get_chunks_for_investigation(
        self,
        investigation_id: str,
        file_types: Optional[List[str]] = None
    ) -> List[DocumentChunkDTO]:
        """Retrieve all relevant chunks for an investigation, optionally filtered by file type."""
        pass

    @abstractmethod
    def search_chunks(
        self,
        investigation_id: str,
        keywords: List[str],
        file_types: Optional[List[str]] = None
    ) -> List[DocumentChunkDTO]:
        """Search chunks containing specified keywords within an investigation."""
        pass

    @abstractmethod
    def get_chunk_by_id(self, chunk_id: str) -> Optional[DocumentChunkDTO]:
        """Retrieve a specific document chunk by its unique ID."""
        pass


class SqliteDocumentRetriever(BaseDocumentRetriever):
    """
    SQLite & SQLAlchemy-backed Document Retriever implementation.
    Acts as the primary retrieval backend prior to vector index deployment.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_chunks_for_investigation(
        self,
        investigation_id: str,
        file_types: Optional[List[str]] = None
    ) -> List[DocumentChunkDTO]:
        query = (
            self.db.query(DocumentChunk, Document.filename, Document.file_type, Document.investigation_id)
            .join(Document, DocumentChunk.document_id == Document.id)
            .filter(Document.investigation_id == investigation_id)
        )
        if file_types:
            normalized_types = [ft.upper() for ft in file_types]
            query = query.filter(Document.file_type.in_(normalized_types))

        results = query.order_by(DocumentChunk.document_id, DocumentChunk.chunk_index).all()
        return [
            DocumentChunkDTO(
                id=chunk.id,
                document_id=chunk.document_id,
                investigation_id=inv_id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                page_number=chunk.page_number,
                metadata=chunk.metadata_json,
                source_document_filename=filename,
                file_type=file_type
            )
            for chunk, filename, file_type, inv_id in results
        ]

    def search_chunks(
        self,
        investigation_id: str,
        keywords: List[str],
        file_types: Optional[List[str]] = None
    ) -> List[DocumentChunkDTO]:
        all_chunks = self.get_chunks_for_investigation(investigation_id, file_types=file_types)
        if not keywords:
            return all_chunks

        lower_keywords = [k.lower() for k in keywords if k]
        matched_chunks = []
        for chunk in all_chunks:
            content_lower = chunk.content.lower()
            if any(kw in content_lower for kw in lower_keywords):
                matched_chunks.append(chunk)

        return matched_chunks

    def get_chunk_by_id(self, chunk_id: str) -> Optional[DocumentChunkDTO]:
        result = (
            self.db.query(DocumentChunk, Document.filename, Document.file_type, Document.investigation_id)
            .join(Document, DocumentChunk.document_id == Document.id)
            .filter(DocumentChunk.id == chunk_id)
            .first()
        )
        if not result:
            return None

        chunk, filename, file_type, inv_id = result
        return DocumentChunkDTO(
            id=chunk.id,
            document_id=chunk.document_id,
            investigation_id=inv_id,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            page_number=chunk.page_number,
            metadata=chunk.metadata_json,
            source_document_filename=filename,
            file_type=file_type
        )
