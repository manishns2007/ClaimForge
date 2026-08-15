import re
from typing import List, Dict, Any, Tuple, Optional
from backend.app.core.logging import logger
from backend.app.services.document_retriever import DocumentChunkDTO

class GroundingValidationError:
    VALUE_NOT_FOUND_IN_SOURCE = "VALUE_NOT_FOUND_IN_SOURCE"
    MISSING_PROVENANCE = "MISSING_PROVENANCE"
    INVALID_PROVENANCE_TEXT = "INVALID_PROVENANCE_TEXT"
    CHUNK_NOT_FOUND = "CHUNK_NOT_FOUND"


class GroundingValidator:
    """
    Grounding Validation Firewall.
    Every PydanticAI semantic extraction output MUST pass through this validator
    before it can enter the deterministic pipeline or database.
    
    The document is the sole source of truth. LLM outputs are untrusted.
    If an extracted value (e.g. amount, vendor, invoice, date, rate) does not
    verbatim exist in the source document chunk, the item is REJECTED.
    """

    @staticmethod
    def _normalize_text(text: str) -> str:
        if not text:
            return ""
        return re.sub(r"\s+", " ", text).strip().lower()

    @staticmethod
    def _number_in_text(val: float, text: str) -> bool:
        """Checks if a numerical value appears in text in various currency/number formats."""
        if val is None:
            return True
        # Try various formatting representations
        val_int = int(val) if val == int(val) else None
        formatted_2dec = f"{val:,.2f}"
        unformatted_2dec = f"{val:.2f}"
        formatted_0dec = f"{int(val):,}" if val_int is not None else ""
        raw_str = str(val)
        raw_int_str = str(val_int) if val_int is not None else ""

        candidates = [formatted_2dec, unformatted_2dec, raw_str]
        if formatted_0dec:
            candidates.append(formatted_0dec)
        if raw_int_str:
            candidates.append(raw_int_str)

        text_clean = text.replace(",", "")
        for cand in candidates:
            cand_clean = cand.replace(",", "")
            if cand in text or cand_clean in text_clean:
                return True
        return False

    @classmethod
    def validate_financial_items(
        cls,
        items: List[Any],
        source_chunks: List[DocumentChunkDTO]
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Validates financial line items against source document chunks.
        Returns: (validated_items, rejection_reasons)
        """
        validated: List[Dict[str, Any]] = []
        rejections: List[str] = []

        # Build lookup of chunk contents
        chunk_by_id = {c.id: c for c in source_chunks}
        chunk_by_doc_id = {}
        for c in source_chunks:
            chunk_by_doc_id.setdefault(c.document_id, []).append(c)

        for idx, item in enumerate(items):
            # Support both Pydantic models and dictionaries
            data = item.model_dump() if hasattr(item, "model_dump") else (item.dict() if hasattr(item, "dict") else dict(item))
            
            # 1. Check mandatory provenance
            source_doc = data.get("source_document")
            source_doc_id = data.get("source_document_id")
            matched_text = data.get("matched_text")
            page = data.get("page")

            if not source_doc or not matched_text or not page:
                rej = f"{GroundingValidationError.MISSING_PROVENANCE}: Item #{idx} missing source_document, matched_text, or page."
                logger.warning(f"[GroundingValidator] {rej}")
                rejections.append(rej)
                continue

            # Find matching chunk text
            matched_chunks = []
            if source_doc_id and source_doc_id in chunk_by_doc_id:
                matched_chunks = chunk_by_doc_id[source_doc_id]
            else:
                matched_chunks = [c for c in source_chunks if c.source_document_filename == source_doc or source_doc in (c.source_document_filename or "")]

            if not matched_chunks:
                matched_chunks = source_chunks  # Fallback to entire chunk set if filename mapping differs

            combined_source_text = " \n ".join(c.content for c in matched_chunks)

            # 2. Check matched_text exists in source
            if cls._normalize_text(matched_text) not in cls._normalize_text(combined_source_text):
                rej = f"{GroundingValidationError.INVALID_PROVENANCE_TEXT}: Item #{idx} matched_text not found in source document chunks."
                logger.warning(f"[GroundingValidator] {rej}")
                rejections.append(rej)
                continue

            # 3. Check billed_amount exists in source
            billed_amount = data.get("billed_amount")
            if billed_amount is not None and not cls._number_in_text(float(billed_amount), combined_source_text):
                rej = f"{GroundingValidationError.VALUE_NOT_FOUND_IN_SOURCE}: Billed amount '{billed_amount}' not found in document text."
                logger.warning(f"[GroundingValidator] {rej}")
                rejections.append(rej)
                continue

            # 4. Check unit_rate if provided
            unit_rate = data.get("unit_rate")
            if unit_rate is not None and not cls._number_in_text(float(unit_rate), combined_source_text):
                rej = f"{GroundingValidationError.VALUE_NOT_FOUND_IN_SOURCE}: Unit rate '{unit_rate}' not found in document text."
                logger.warning(f"[GroundingValidator] {rej}")
                rejections.append(rej)
                continue

            # 5. Check invoice_number if provided
            inv_num = data.get("invoice_number")
            if inv_num and inv_num not in ["UNKNOWN", ""]:
                if cls._normalize_text(inv_num) not in cls._normalize_text(combined_source_text):
                    rej = f"{GroundingValidationError.VALUE_NOT_FOUND_IN_SOURCE}: Invoice number '{inv_num}' not found in document text."
                    logger.warning(f"[GroundingValidator] {rej}")
                    rejections.append(rej)
                    continue

            # 6. Check vendor_name if provided
            vendor = data.get("vendor_name")
            if vendor and vendor not in ["UNKNOWN", ""]:
                if cls._normalize_text(vendor) not in cls._normalize_text(combined_source_text):
                    rej = f"{GroundingValidationError.VALUE_NOT_FOUND_IN_SOURCE}: Vendor name '{vendor}' not found in document text."
                    logger.warning(f"[GroundingValidator] {rej}")
                    rejections.append(rej)
                    continue

            # All checks passed for this item
            validated.append(data)

        return validated, rejections

    @classmethod
    def validate_contract_findings(
        cls,
        findings: List[Any],
        source_chunks: List[DocumentChunkDTO]
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Validates contract findings and rates against source chunks."""
        validated: List[Dict[str, Any]] = []
        rejections: List[str] = []

        combined_source_text = " \n ".join(c.content for c in source_chunks)
        norm_combined = cls._normalize_text(combined_source_text)

        for idx, finding in enumerate(findings):
            data = finding.model_dump() if hasattr(finding, "model_dump") else (finding.dict() if hasattr(finding, "dict") else dict(finding))
            
            matched_text = data.get("matched_text")
            source_doc = data.get("source_document")

            if not source_doc or not matched_text:
                rej = f"{GroundingValidationError.MISSING_PROVENANCE}: Contract finding #{idx} missing source_document or matched_text."
                rejections.append(rej)
                continue

            if cls._normalize_text(matched_text) not in norm_combined:
                rej = f"{GroundingValidationError.INVALID_PROVENANCE_TEXT}: Contract finding #{idx} matched_text not found in source contract."
                rejections.append(rej)
                continue

            # Check rate value if specified
            rate_val = data.get("daily_rate") or data.get("standby_rate") or data.get("rate")
            if rate_val is not None:
                if not cls._number_in_text(float(rate_val), combined_source_text):
                    rej = f"{GroundingValidationError.VALUE_NOT_FOUND_IN_SOURCE}: Contract rate '{rate_val}' not found in contract text."
                    rejections.append(rej)
                    continue

            validated.append(data)

        return validated, rejections

    @classmethod
    def validate_communication_events(
        cls,
        events: List[Any],
        source_chunks: List[DocumentChunkDTO]
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Validates communication notices/timestamps against source chunks."""
        validated: List[Dict[str, Any]] = []
        rejections: List[str] = []

        combined_source_text = " \n ".join(c.content for c in source_chunks)
        norm_combined = cls._normalize_text(combined_source_text)

        for idx, event in enumerate(events):
            data = event.model_dump() if hasattr(event, "model_dump") else (event.dict() if hasattr(event, "dict") else dict(event))

            matched_text = data.get("matched_text")
            source_doc = data.get("source_document")

            if not source_doc or not matched_text:
                rej = f"{GroundingValidationError.MISSING_PROVENANCE}: Communication event #{idx} missing source_document or matched_text."
                rejections.append(rej)
                continue

            if cls._normalize_text(matched_text) not in norm_combined:
                rej = f"{GroundingValidationError.INVALID_PROVENANCE_TEXT}: Communication event #{idx} matched_text not in emails."
                rejections.append(rej)
                continue

            validated.append(data)

        return validated, rejections
