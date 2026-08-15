import os
import re
import math
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Tuple
import numpy as np
from sqlalchemy.orm import Session
from backend.app.db.models import DocumentChunk, Document
from backend.app.core.config import settings
from backend.app.core.logging import logger

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None


class DocumentChunkDTO:
    """Standardized First-Class DTO for retrieved document chunks across retriever backends."""
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
        file_type: Optional[str] = None,
        section: Optional[str] = None,
        char_start: Optional[int] = None,
        char_end: Optional[int] = None,
        extraction_method: Optional[str] = None,
        score: Optional[float] = None
    ):
        self.id = id
        self.chunk_id = id  # Alias
        self.document_id = document_id
        self.investigation_id = investigation_id
        self.chunk_index = chunk_index
        self.content = content
        self.text = content  # Alias
        self.page_number = page_number
        self.page = page_number  # Alias
        self.metadata = metadata or {}
        self.source_document_filename = source_document_filename
        self.filename = source_document_filename  # Alias
        self.file_type = file_type
        self.section = section or self.metadata.get("section")
        self.char_start = char_start if char_start is not None else self.metadata.get("char_start", 0)
        self.char_end = char_end if char_end is not None else self.metadata.get("char_end", len(content))
        self.extraction_method = extraction_method or self.metadata.get("extraction_method", "DOCUMENT_PARSER")
        self.score = score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.id,
            "document_id": self.document_id,
            "investigation_id": self.investigation_id,
            "chunk_index": self.chunk_index,
            "content": self.content,
            "page": self.page_number,
            "filename": self.source_document_filename,
            "file_type": self.file_type,
            "section": self.section,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "extraction_method": self.extraction_method,
            "score": self.score,
            "metadata": self.metadata
        }


class BaseDocumentRetriever(ABC):
    """
    Abstract Base Class for Document Retrieval.
    Decouples agent execution from storage/indexing layer.
    """
    @abstractmethod
    def get_chunks_for_investigation(
        self,
        investigation_id: str,
        file_types: Optional[List[str]] = None
    ) -> List[DocumentChunkDTO]:
        """Retrieve all chunks for an investigation, optionally filtered by file type."""
        pass

    @abstractmethod
    def search_chunks(
        self,
        investigation_id: str,
        keywords: List[str],
        file_types: Optional[List[str]] = None,
        top_k: int = 10
    ) -> List[DocumentChunkDTO]:
        """Search chunks containing specified keywords / semantic intent."""
        pass

    @abstractmethod
    def get_chunk_by_id(self, chunk_id: str) -> Optional[DocumentChunkDTO]:
        """Retrieve a specific document chunk by its unique ID."""
        pass


class SqliteDocumentRetriever(BaseDocumentRetriever):
    """
    Direct SQLite & SQLAlchemy-backed Document Retriever.
    Baseline retrieval used for sequential or unranked lookups.
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
        file_types: Optional[List[str]] = None,
        top_k: int = 10
    ) -> List[DocumentChunkDTO]:
        all_chunks = self.get_chunks_for_investigation(investigation_id, file_types=file_types)
        if not keywords:
            return all_chunks[:top_k]

        lower_keywords = [k.lower() for k in keywords if k]
        matched_chunks = []
        for chunk in all_chunks:
            content_lower = chunk.content.lower()
            if any(kw in content_lower for kw in lower_keywords):
                matched_chunks.append(chunk)

        return matched_chunks[:top_k]

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


class HybridDocumentRetriever(BaseDocumentRetriever):
    """
    True Hybrid RAG Retriever combining:
    1. BM25 Lexical Ranking (via rank_bm25 / Okapi BM25)
    2. Dense Semantic Vector Embeddings (via Google GenAI gemini-embedding-001 or dense semantic vectors)
    3. Reciprocal Rank Fusion (RRF) with k=60
    
    Provides auditable logging: query, chunk IDs, BM25 ranks, Dense ranks, RRF score.
    """
    def __init__(self, db: Session, rrf_k: int = 60):
        self.db = db
        self.rrf_k = rrf_k
        self.sqlite_retriever = SqliteDocumentRetriever(db)
        self._embedding_cache: Dict[str, np.ndarray] = {}

    def get_chunks_for_investigation(
        self,
        investigation_id: str,
        file_types: Optional[List[str]] = None
    ) -> List[DocumentChunkDTO]:
        return self.sqlite_retriever.get_chunks_for_investigation(investigation_id, file_types=file_types)

    def get_chunk_by_id(self, chunk_id: str) -> Optional[DocumentChunkDTO]:
        return self.sqlite_retriever.get_chunk_by_id(chunk_id)

    def _tokenize(self, text: str) -> List[str]:
        """Clean alphanumeric tokenization for lexical search."""
        return [w.lower() for w in re.findall(r"\b[A-Za-z0-9_\-\$]+\b", text) if len(w) > 1]

    def _get_embedding(self, text: str) -> Optional[np.ndarray]:
        """Compute real dense embedding using Google GenAI or local vector model."""
        if not text.strip():
            return None

        if text in self._embedding_cache:
            return self._embedding_cache[text]

        gemini_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                client = genai.Client()
                res = client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=text[:8000]
                )
                vec = np.array(res.embeddings[0].values, dtype=np.float32)
                # Normalize vector
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                self._embedding_cache[text] = vec
                return vec
            except Exception as e:
                logger.debug(f"[HybridDocumentRetriever] GenAI embed failed: {e}. Falling back to dense semantic vector.")

        # Deterministic dense semantic vector fallback (character and word n-gram hashing)
        vec = self._dense_semantic_vector(text)
        self._embedding_cache[text] = vec
        return vec

    def _dense_semantic_vector(self, text: str, dim: int = 256) -> np.ndarray:
        """Deterministic dense hash embedding vector for offline semantic ranking."""
        vec = np.zeros(dim, dtype=np.float32)
        words = self._tokenize(text)
        if not words:
            return vec

        for word in words:
            # Word hashing
            h = hash(word) % dim
            vec[h] += 1.0
            # 3-gram character subwords
            for i in range(len(word) - 2):
                tri = word[i:i+3]
                h_tri = hash(tri) % dim
                vec[h_tri] += 0.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def _prefetch_embeddings(self, texts: List[str]):
        """Batch prefetch embeddings for uncached texts."""
        uncached = [t for t in texts if t.strip() and t not in self._embedding_cache]
        if not uncached:
            return

        gemini_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                client = genai.Client()
                # Batch in groups of 50
                batch_size = 50
                for i in range(0, len(uncached), batch_size):
                    batch = uncached[i:i+batch_size]
                    res = client.models.embed_content(
                        model="gemini-embedding-001",
                        contents=[t[:8000] for t in batch]
                    )
                    for text_item, emb in zip(batch, res.embeddings):
                        vec = np.array(emb.values, dtype=np.float32)
                        norm = np.linalg.norm(vec)
                        if norm > 0:
                            vec = vec / norm
                        self._embedding_cache[text_item] = vec
                return
            except Exception as e:
                logger.debug(f"[HybridDocumentRetriever] Batch GenAI embed failed: {e}. Using deterministic dense vectors.")

        for text_item in uncached:
            self._embedding_cache[text_item] = self._dense_semantic_vector(text_item)

    def search_chunks(
        self,
        investigation_id: str,
        keywords: List[str],
        file_types: Optional[List[str]] = None,
        top_k: int = 10
    ) -> List[DocumentChunkDTO]:
        """
        Execute Hybrid RAG search:
        BM25 Ranking + Dense Vector Ranking -> Reciprocal Rank Fusion (RRF).
        """
        all_chunks = self.get_chunks_for_investigation(investigation_id, file_types=file_types)
        if not all_chunks:
            return []

        query_str = " ".join(keywords).strip()
        if not query_str:
            return all_chunks[:top_k]

        query_tokens = self._tokenize(query_str)
        if not query_tokens:
            return all_chunks[:top_k]

        # 1. Lexical BM25 Ranking
        chunk_corpus = [self._tokenize(c.content) for c in all_chunks]
        
        bm25_scores = np.zeros(len(all_chunks), dtype=np.float32)
        if BM25Okapi is not None and any(len(c) > 0 for c in chunk_corpus):
            try:
                bm25_model = BM25Okapi(chunk_corpus)
                bm25_scores = np.array(bm25_model.get_scores(query_tokens), dtype=np.float32)
            except Exception as be:
                logger.debug(f"[HybridDocumentRetriever] BM25 failed: {be}")
        else:
            # Simple TF-IDF / term overlap lexical fallback
            for idx, c_tokens in enumerate(chunk_corpus):
                score = sum(1.0 for qt in query_tokens if qt in c_tokens)
                bm25_scores[idx] = score

        # Rank order for BM25 (1-indexed, lower rank = better)
        bm25_order = np.argsort(-bm25_scores)
        bm25_ranks = {all_chunks[idx].id: rank + 1 for rank, idx in enumerate(bm25_order)}

        # 2. Dense Semantic Vector Ranking with Batch Prefetch
        texts_to_embed = [query_str] + [c.content for c in all_chunks]
        self._prefetch_embeddings(texts_to_embed)

        query_vec = self._get_embedding(query_str)
        dense_scores = np.zeros(len(all_chunks), dtype=np.float32)

        if query_vec is not None:
            for idx, chunk in enumerate(all_chunks):
                c_vec = self._get_embedding(chunk.content)
                if c_vec is not None:
                    sim = float(np.dot(query_vec, c_vec))
                    dense_scores[idx] = max(0.0, sim)

        dense_order = np.argsort(-dense_scores)
        dense_ranks = {all_chunks[idx].id: rank + 1 for rank, idx in enumerate(dense_order)}

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF(d) = 1 / (k + rank_bm25) + 1 / (k + rank_dense)
        rrf_results: List[Tuple[DocumentChunkDTO, float, int, int, float, float]] = []

        for idx, chunk in enumerate(all_chunks):
            cid = chunk.id
            r_bm25 = bm25_ranks[cid]
            r_dense = dense_ranks[cid]
            s_bm25 = float(bm25_scores[idx])
            s_dense = float(dense_scores[idx])

            # RRF formula
            rrf_score = (1.0 / (self.rrf_k + r_bm25)) + (1.0 / (self.rrf_k + r_dense))

            # Store score in chunk DTO
            chunk.score = round(rrf_score, 6)
            rrf_results.append((chunk, rrf_score, r_bm25, r_dense, s_bm25, s_dense))

        # Sort by RRF score descending
        rrf_results.sort(key=lambda x: x[1], reverse=True)

        # 4. Auditable Retrieval Logging
        top_results = rrf_results[:top_k]
        logger.info(
            f"[HybridDocumentRetriever] Query: '{query_str}' -> Retrieved {len(top_results)}/{len(all_chunks)} chunks. "
            f"Top chunk: id={top_results[0][0].id} (RRF: {top_results[0][1]:.5f}, BM25_Rank: {top_results[0][2]}, Dense_Rank: {top_results[0][3]})"
        )

        return [item[0] for item in top_results]

    def search_clauses(
        self,
        investigation_id: str,
        query: str,
        file_types: Optional[List[str]] = None,
        top_k: int = 5
    ) -> List[DocumentChunkDTO]:
        """
        Specialized clause search across contracts and MSAs.
        E.g. "standby weather credit", "off-rent notice deadline", "billing continues until pickup".
        """
        keywords = [q.strip() for q in query.split() if q.strip()]
        return self.search_chunks(
            investigation_id=investigation_id,
            keywords=keywords,
            file_types=file_types or ["PDF"],
            top_k=top_k
        )
