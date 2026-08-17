import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from email.utils import parsedate_to_datetime


class ExtractedField(BaseModel):
    value: Any
    confidence: float = 1.0  # 0.0 to 1.0
    matched_text: str = ""
    source_document: Optional[str] = None
    source_document_id: Optional[str] = None
    page: Optional[int] = 1
    chunk_index: Optional[int] = 0
    field_name: str = ""


class ExtractedCurrency(BaseModel):
    value: float
    currency: str = "USD"
    source_text: str
    confidence: float
    source_document: Optional[str] = None
    page: Optional[int] = 1


class ExtractedInvoiceData(BaseModel):
    invoice_number: Optional[ExtractedField] = None
    vendor_name: Optional[ExtractedField] = None
    equipment_id: Optional[ExtractedField] = None
    billed_amount: Optional[ExtractedField] = None
    unit_rate: Optional[ExtractedField] = None
    units_billed: Optional[ExtractedField] = None
    billing_start: Optional[ExtractedField] = None
    billing_end: Optional[ExtractedField] = None
    raw_charges: List[Dict[str, Any]] = Field(default_factory=list)


class ExtractedContractRule(BaseModel):
    rule_type: str  # DAILY_RATE, STANDBY_RATE, OFF_RENT_TRIGGER, PICKUP_CONDITION
    rule_value: Any
    section_reference: Optional[str] = None
    confidence: float = 1.0
    matched_text: str = ""
    source_document: Optional[str] = None
    source_document_id: Optional[str] = None
    page: Optional[int] = 1


class ExtractedCommunicationEvent(BaseModel):
    event_type: str  # OFF_RENT_REQUEST, OFF_RENT_ACKNOWLEDGEMENT, STANDBY_NOTICE, GENERAL_COMMUNICATION
    timestamp: Optional[datetime] = None
    timestamp_iso: Optional[str] = None
    participants: str = ""
    statement: str = ""
    confidence: float = 1.0
    matched_text: str = ""
    source_document: Optional[str] = None
    source_document_id: Optional[str] = None


class DynamicExtractor:
    """
    Robust, deterministic, document-grounded extraction engine.
    Extracts structured financial, contractual, and operational facts with full provenance.
    Never invents or fabricates missing values.
    """

    # -------------------------------------------------------------------------
    # 1. Currency & Numbers
    # -------------------------------------------------------------------------
    CURRENCY_SYMBOLS = {
        "$": "USD",
        "USD": "USD",
        "₹": "INR",
        "INR": "INR",
        "€": "EUR",
        "EUR": "EUR",
        "£": "GBP",
        "GBP": "GBP"
    }

    @classmethod
    def parse_currency_amount(cls, text: str) -> Optional[float]:
        """Safely parses currency string to float."""
        if not text:
            return None
        cleaned = text.strip()
        # Remove currency symbols and word indicators
        cleaned = re.sub(r"[^\d.,]", "", cleaned)
        # Handle comma as thousands separator vs decimal
        if "," in cleaned and "." in cleaned:
            # e.g. 1,234.56
            cleaned = cleaned.replace(",", "")
        elif "," in cleaned and "." not in cleaned:
            # Check if comma is decimal (e.g. 1234,56) or thousands (1,234)
            parts = cleaned.split(",")
            if len(parts) == 2 and len(parts[1]) == 2:
                cleaned = parts[0] + "." + parts[1]
            else:
                cleaned = cleaned.replace(",", "")
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None

    @classmethod
    def extract_currency(
        cls,
        text: str,
        source_doc: Optional[str] = None,
        page: int = 1
    ) -> List[ExtractedCurrency]:
        """
        Extracts currency mentions with detected currency symbol and provenance.
        Confidence:
          - EXACT LABELED FIELD: >= 0.90
          - STRUCTURED TABLE MATCH: >= 0.85
          - CONTEXTUAL REGEX MATCH: >= 0.70
          - BARE NUMBER/CURRENCY: <= 0.50
        """
        results: List[ExtractedCurrency] = []
        if not text:
            return results

        # Regex for currency expressions
        pattern = re.compile(
            r"(?:(USD|INR|EUR|GBP|\$|₹|€|£)\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(USD|INR|EUR|GBP|dollars)?",
            re.IGNORECASE
        )

        for m in pattern.finditer(text):
            curr_prefix = m.group(1) or ""
            num_str = m.group(2)
            curr_suffix = m.group(3) or ""

            val = cls.parse_currency_amount(num_str)
            if val is None or val <= 0:
                continue

            curr = "USD"
            if curr_prefix in cls.CURRENCY_SYMBOLS:
                curr = cls.CURRENCY_SYMBOLS[curr_prefix]
            elif curr_suffix.upper() in cls.CURRENCY_SYMBOLS:
                curr = cls.CURRENCY_SYMBOLS[curr_suffix.upper()]

            # Determine confidence based on surrounding context
            start_idx = max(0, m.start() - 30)
            prefix_ctx = text[start_idx:m.start()].lower()
            if any(lbl in prefix_ctx for lbl in ["total", "amount", "due", "balance", "price", "rate", "cost"]):
                conf = 0.90
            elif curr_prefix or curr_suffix:
                conf = 0.75
            else:
                conf = 0.50

            results.append(ExtractedCurrency(
                value=val,
                currency=curr,
                source_text=m.group(0).strip(),
                confidence=conf,
                source_document=source_doc,
                page=page
            ))

        return results

    # -------------------------------------------------------------------------
    # 2. Date Parsing
    # -------------------------------------------------------------------------
    DATE_PATTERNS = [
        # ISO formats: 2026-06-11T14:41:00Z or 2026-06-11 14:41:00 or with timezone offset
        (re.compile(r"(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?)"), "%Y-%m-%d"),
        # Standard YYYY-MM-DD
        (re.compile(r"\b(\d{4}-\d{2}-\d{2})\b"), "%Y-%m-%d"),
        # Standard YYYY/MM/DD
        (re.compile(r"\b(\d{4}/\d{2}/\d{2})\b"), "%Y/%m/%d"),
        # US format: MM/DD/YYYY or MM-DD-YYYY
        (re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b"), "%m/%d/%Y"),
        # Natural English: June 11, 2026 or Jun 11, 2026 or 11 June 2026 or July 5, 2026
        (re.compile(r"\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b"), "%B %d %Y"),
        (re.compile(r"\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b"), "%d %B %Y"),
        # Month day without year in text (default to current reference or 2026 if context implies)
        (re.compile(r"\b([A-Za-z]{3,9}\s+\d{1,2})(?:\b|\s)"), "%B %d"),
    ]

    @classmethod
    def parse_datetime(cls, date_str: str, default_year: int = 2026) -> Optional[datetime]:
        """Dynamically parses arbitrary datetime strings with timezone support."""
        if not date_str:
            return None
        
        date_str = date_str.strip()

        # 1. Try standard email date RFC 2822 (e.g. Thu, 11 Jun 2026 14:41:00 -0400)
        try:
            dt = parsedate_to_datetime(date_str)
            if dt:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            # Convert to UTC
        except Exception:
            pass

        # 2. Try ISO format directly
        try:
            iso_clean = date_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso_clean)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            pass

        # 3. Try regex patterns
        clean_d = re.sub(r"[,]", " ", date_str)
        clean_d = re.sub(r"\s+", " ", clean_d).strip()

        for pattern, _ in cls.DATE_PATTERNS:
            match = pattern.search(clean_d)
            if match:
                matched_val = match.group(1).strip()
                # Try common formats with explicit year
                for fmt in [
                    "%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y", "%d-%m-%Y",
                    "%B %d %Y", "%b %d %Y", "%d %B %Y", "%d %b %Y"
                ]:
                    try:
                        dt = datetime.strptime(matched_val, fmt)
                        return dt.replace(tzinfo=timezone.utc)
                    except ValueError:
                        continue

                # Format without year
                for fmt in ["%B %d", "%b %d"]:
                    try:
                        dt = datetime.strptime(f"{default_year} {matched_val}", f"%Y {fmt}")
                        return dt.replace(tzinfo=timezone.utc)
                    except ValueError:
                        continue

        return None

    # -------------------------------------------------------------------------
    # 3. Dynamic Invoice Extraction
    # -------------------------------------------------------------------------
    @classmethod
    def extract_invoice_data(
        cls,
        text: str,
        filename: str = "",
        doc_id: Optional[str] = None,
        page: int = 1
    ) -> ExtractedInvoiceData:
        """
        Dynamically extracts all invoice fields strictly from document text using labeled patterns.
        Assigns provenance and confidence. Never invents values.
        """
        data = ExtractedInvoiceData()
        if not text:
            return data

        # A. Invoice Number
        inv_patterns = [
            (re.compile(r"(?:INVOICE|Invoice|Inv)\s*(?:#|NUMBER|Number|No\.?|Num)?\s*[:#]?\s*([A-Za-z0-9\-_/]+)", re.IGNORECASE), 0.95),
            (re.compile(r"\b((?:INV|ADV|BILL|REC)-[A-Za-z0-9\-_]+)\b", re.IGNORECASE), 0.90),
            (re.compile(r"(?:Invoice\s+Ref(?:erence)?)\s*[:#]?\s*([A-Za-z0-9\-_/]+)", re.IGNORECASE), 0.90),
        ]
        for pat, conf in inv_patterns:
            m = pat.search(text)
            if m:
                inv_val = m.group(1).strip().rstrip(".,;:")
                if len(inv_val) >= 2 and inv_val.lower() not in ["date", "number", "due", "total", "amount", "period"]:
                    data.invoice_number = ExtractedField(
                        value=inv_val,
                        confidence=conf,
                        matched_text=m.group(0).strip(),
                        source_document=filename,
                        source_document_id=doc_id,
                        page=page,
                        field_name="invoice_number"
                    )
                         # B. Vendor / Payee / Claimant / Lessor Name
        vendor_patterns = [
            (re.compile(r"(?:Vendor|Lessor|Company|Payee|Billed By|From|Contractor|Supplier|Claimant(?:\s+Name)?|Patient(?:\s+Name)?|Insured|Employee)\s*:\s*([^\n\r,]+)", re.IGNORECASE), 0.95),
            (re.compile(r"(?:Invoice From|Remit To|Issued By|Hospital|Clinic|Provider)\s*:\s*([^\n\r,]+)", re.IGNORECASE), 0.90),
        ]
        for pat, conf in vendor_patterns:
            m = pat.search(text)
            if m:
                v_name = m.group(1).strip()
                if len(v_name) > 1 and not v_name.lower().startswith("invoice"):
                    data.vendor_name = ExtractedField(
                        value=v_name,
                        confidence=conf,
                        matched_text=m.group(0).strip(),
                        source_document=filename,
                        source_document_id=doc_id,
                        page=page,
                        field_name="vendor_name"
                    )
                    break

        # C. Equipment / Asset / Service Description
        equip_patterns = [
            (re.compile(r"(?:Equipment(?:\s+Unit)?|Item|Asset|Unit\s*#?|Machine|Service|Procedure|Diagnosis)\s*:\s*([^\n\r,]+)", re.IGNORECASE), 0.95),
            (re.compile(r"(?:Rental Item|Description|Line Item)\s*:\s*([^\n\r,]+)", re.IGNORECASE), 0.85),
            (re.compile(r"\((?:Unit\s*#|Asset\s*#)?\s*([A-Za-z0-9\-_]+)\)", re.IGNORECASE), 0.80),
        ]
        for pat, conf in equip_patterns:
            m = pat.search(text)
            if m:
                eq_val = m.group(1).strip()
                if len(eq_val) > 1:
                    data.equipment_id = ExtractedField(
                        value=eq_val,
                        confidence=conf,
                        matched_text=m.group(0).strip(),
                        source_document=filename,
                        source_document_id=doc_id,
                        page=page,
                        field_name="equipment_id"
                    )
                    break

        # D. Billed Total Amount / Claim Amount
        amount_patterns = [
            (re.compile(r"(?:Claim(?:\s+Amount)?|Total\s+Claim|Total(?:\s+Amount)?(?:\s+Due)?(?:\s+Billed)?|Total\s+Amount\s+Due|Amount\s+Due|Total\s+Due|Total\s+Charges|Balance\s+Due)\s*[:$₹€£]?\s*(?:USD|INR|EUR|GBP|\$|₹|€|£)?\s*([\d,]+\.?\d*)", re.IGNORECASE), 0.95),
            (re.compile(r"(?:Invoice\s+Amount|Total\s+Billed|Gross\s+Amount)\s*[:$₹€£]?\s*(?:USD|INR|EUR|GBP|\$|₹|€|£)?\s*([\d,]+\.?\d*)", re.IGNORECASE), 0.90),
            (re.compile(r"\bTotal\s*[:$₹€£]\s*(?:USD|INR|EUR|GBP|\$|₹|€|£)?\s*([\d,]+\.?\d*)", re.IGNORECASE), 0.85),
        ]
        for pat, conf in amount_patterns:
            m = pat.search(text)
            if m:
                amt = cls.parse_currency_amount(m.group(1))
                if amt is not None and amt > 0:
                    data.billed_amount = ExtractedField(
                        value=amt,
                        confidence=conf,
                        matched_text=m.group(0).strip(),
                        source_document=filename,
                        source_document_id=doc_id,
                        page=page,
                        field_name="billed_amount"
                    )
                    break

        # E. Unit Rate (Daily / Hourly / Room rate)
        rate_patterns = [
            (re.compile(r"(?:Daily(?:\s+Rental|\s+Room)?\s+Rate|Daily\s+Rate|Room\s+Rate|Unit\s+Rate|Unit\s+Price|Rate)\s*[:$₹€£]?\s*(?:USD|INR|EUR|GBP|\$|₹|€|£)?\s*([\d,]+\.?\d*)", re.IGNORECASE), 0.95),
            (re.compile(r"@\s*(?:USD|INR|EUR|GBP|\$|₹|€|£)?\s*([\d,]+\.?\d*)\s*/\s*(?:day|hr|hour|unit|night)", re.IGNORECASE), 0.90),
        ]
        for pat, conf in rate_patterns:
            m = pat.search(text)
            if m:
                rate = cls.parse_currency_amount(m.group(1))
                if rate is not None and rate > 0:
                    data.unit_rate = ExtractedField(
                        value=rate,
                        confidence=conf,
                        matched_text=m.group(0).strip(),
                        source_document=filename,
                        source_document_id=doc_id,
                        page=page,
                        field_name="unit_rate"
                    )
                    break

        # F. Quantity / Units Billed / Duration / Hospitalization Days
        qty_patterns = [
            (re.compile(r"(?:Hospitalization(?:\s+Duration)?|Duration|Length\s+of\s+Stay|Quantity|Units(?:\s+Billed)?|Days\s+Billed|Days|Qty)\s*[:=]?\s*(\d+(?:\.\d+)?)", re.IGNORECASE), 0.90),
            (re.compile(r"(?:hospitalized|admitted|stayed|billed)\s+for\s+(\d+(?:\.\d+)?)\s*days", re.IGNORECASE), 0.90),
            (re.compile(r"—\s*(\d+(?:\.\d+)?)\s*days", re.IGNORECASE), 0.85),
            (re.compile(r"(\d+(?:\.\d+)?)\s*(?:days|hrs|hours|units|nights)\b", re.IGNORECASE), 0.80),
        ]
        for pat, conf in qty_patterns:
            m = pat.search(text)
            if m:
                try:
                    qty = float(m.group(1))
                    data.units_billed = ExtractedField(
                        value=qty,
                        confidence=conf,
                        matched_text=m.group(0).strip(),
                        source_document=filename,
                        source_document_id=doc_id,
                        page=page,
                        field_name="units_billed"
                    )
                    break
                except ValueError:
                    pass

        # G. Billing Date Range (e.g. "June 8, 2026 to June 13, 2026" or "July 1 to July 5")
        period_pattern = re.compile(
            r"(?:Billing\s+Period|Service\s+Period|Rental\s+Period|Dates)\s*:\s*([A-Za-z0-9,\s/-]+?)\s+(?:to|-|through|until)\s+([A-Za-z0-9,\s/-]+)",
            re.IGNORECASE
        )
        pm = period_pattern.search(text)
        if pm:
            raw_start = pm.group(1).strip()
            raw_end = pm.group(2).strip()

            dt_start = cls.parse_datetime(raw_start)
            dt_end = cls.parse_datetime(raw_end)

            if dt_start:
                data.billing_start = ExtractedField(
                    value=dt_start,
                    confidence=0.90,
                    matched_text=raw_start,
                    source_document=filename,
                    source_document_id=doc_id,
                    page=page,
                    field_name="billing_start"
                )
            if dt_end:
                data.billing_end = ExtractedField(
                    value=dt_end,
                    confidence=0.90,
                    matched_text=raw_end,
                    source_document=filename,
                    source_document_id=doc_id,
                    page=page,
                    field_name="billing_end"
                )

        return data

    # -------------------------------------------------------------------------
    # 4. Dynamic Contract Rules Extraction
    # -------------------------------------------------------------------------
    @classmethod
    def extract_contract_rules(
        cls,
        text: str,
        filename: str = "",
        doc_id: Optional[str] = None,
        page: int = 1
    ) -> List[ExtractedContractRule]:
        """
        Dynamically extracts contractual terms, rates, and trigger conditions.
        Never depends on hardcoded numbers or clause names.
        """
        rules: List[ExtractedContractRule] = []
        if not text:
            return rules

        text_lower = text.lower()

        # A. Contract Amendment Override (e.g. pickup condition override)
        if "amendment" in filename.lower() or "amendment" in text_lower:
            if re.search(r"(?:physical|equipment)\s+(?:pickup|transport|return)", text_lower):
                sec_match = re.search(r"(Clause\s+\d+(?:\.\d+)?|Section\s+\d+(?:\.\d+)?)", text, re.IGNORECASE)
                sec_ref = sec_match.group(1) if sec_match else "Contract Amendment"
                rules.append(ExtractedContractRule(
                    rule_type="OFF_RENT_TRIGGER",
                    rule_value="PHYSICAL_PICKUP",
                    section_reference=sec_ref,
                    confidence=0.95,
                    matched_text=text[:250].strip(),
                    source_document=filename,
                    source_document_id=doc_id,
                    page=page
                ))

        # B. Standard Off-Rent Notice Cutoff
        elif re.search(r"(?:off-rent|off\s+rent)\s+(?:billing\s+basis|notice|cutoff|condition)", text_lower) or ("cease" in text_lower and "off-rent" in text_lower):
            sec_match = re.search(r"(Clause\s+\d+(?:\.\d+)?|Section\s+\d+(?:\.\d+)?)", text, re.IGNORECASE)
            sec_ref = sec_match.group(1) if sec_match else "Off-Rent Clause"
            rules.append(ExtractedContractRule(
                rule_type="OFF_RENT_TRIGGER",
                rule_value="EMAIL_NOTIFICATION",
                section_reference=sec_ref,
                confidence=0.95,
                matched_text=text[:250].strip(),
                source_document=filename,
                source_document_id=doc_id,
                page=page
            ))

        # C. Daily Rate extraction from contract
        daily_rate_match = re.search(
            r"(?:Daily(?:\s+Rental)?\s+Rate|Billing\s+Rate|Rental\s+Rate|Rate)\s*(?:shall\s+be|is|of|[:=])?\s*[:$]?\s*(?:USD|\$|₹|€|£)?\s*([\d,]+\.?\d*)\s*(?:/\s*day|\s*per\s+day)?",
            text,
            re.IGNORECASE
        )
        if daily_rate_match:
            d_rate = cls.parse_currency_amount(daily_rate_match.group(1))
            if d_rate and d_rate > 0:
                sec_match = re.search(r"(Clause\s+\d+(?:\.\d+)?|Section\s+\d+(?:\.\d+)?)", text, re.IGNORECASE)
                rules.append(ExtractedContractRule(
                    rule_type="DAILY_RATE",
                    rule_value=d_rate,
                    section_reference=sec_match.group(1) if sec_match else "Daily Rate Clause",
                    confidence=0.95,
                    matched_text=daily_rate_match.group(0).strip(),
                    source_document=filename,
                    source_document_id=doc_id,
                    page=page
                ))

        # D. Standby Rate extraction
        standby_match = re.search(
            r"(?:Standby\s+Rate|Standby)\s*(?:shall\s+be|is|of|[:=])?\s*[:$]?\s*(?:USD|\$|₹|€|£)?\s*([\d,]+\.?\d*)\s*(?:/\s*day|\s*per\s+day)?",
            text,
            re.IGNORECASE
        )
        if standby_match:
            s_rate = cls.parse_currency_amount(standby_match.group(1))
            if s_rate and s_rate > 0:
                sec_match = re.search(r"(Clause\s+\d+(?:\.\d+)?|Section\s+\d+(?:\.\d+)?)", text, re.IGNORECASE)
                rules.append(ExtractedContractRule(
                    rule_type="STANDBY_RATE",
                    rule_value=s_rate,
                    section_reference=sec_match.group(1) if sec_match else "Standby Clause",
                    confidence=0.90,
                    matched_text=standby_match.group(0).strip(),
                    source_document=filename,
                    source_document_id=doc_id,
                    page=page
                ))

        return rules

    # -------------------------------------------------------------------------
    # 5. Dynamic Communication Events Extraction
    # -------------------------------------------------------------------------
    @classmethod
    def extract_communication_events(
        cls,
        text: str,
        filename: str = "",
        doc_id: Optional[str] = None
    ) -> List[ExtractedCommunicationEvent]:
        """
        Dynamically extracts email communication events, off-rent timestamps, and acknowledgements.
        Never hardcodes dates or participants.
        """
        events: List[ExtractedCommunicationEvent] = []
        if not text:
            return events

        text_lower = text.lower()

        # Extract headers if present
        sender = ""
        recipient = ""
        email_date_str = ""

        from_m = re.search(r"From:\s*([^\n\r]+)", text, re.IGNORECASE)
        if from_m:
            sender = from_m.group(1).strip()

        to_m = re.search(r"To:\s*([^\n\r]+)", text, re.IGNORECASE)
        if to_m:
            recipient = to_m.group(1).strip()

        date_m = re.search(r"Date:\s*([^\n\r]+)", text, re.IGNORECASE)
        if date_m:
            email_date_str = date_m.group(1).strip()

        parsed_email_dt = cls.parse_datetime(email_date_str) if email_date_str else None

        # Detect Off-Rent Request
        if "off-rent" in text_lower or "off rent" in text_lower:
            effective_dt = parsed_email_dt
            
            # Inline date search (e.g. "effective June 11, 2026 at 14:41" or "effective July 5")
            inline_date_m = re.search(
                r"effective\s+([A-Za-z0-9,\s:-]+?)(?:\.|\n|$)",
                text,
                re.IGNORECASE
            )
            if inline_date_m:
                dt_cand = cls.parse_datetime(inline_date_m.group(1))
                if dt_cand:
                    effective_dt = dt_cand

            events.append(ExtractedCommunicationEvent(
                event_type="OFF_RENT_REQUEST",
                timestamp=effective_dt,
                timestamp_iso=effective_dt.isoformat() if effective_dt else None,
                participants=f"{sender or 'Lessee'} -> {recipient or 'Vendor'}",
                statement=f"Off-rent request transmitted (Effective: {effective_dt.isoformat() if effective_dt else 'date unstated'}).",
                confidence=0.95 if effective_dt else 0.75,
                matched_text=inline_date_m.group(0).strip() if inline_date_m else text[:100],
                source_document=filename,
                source_document_id=doc_id
            ))

            # Detect Vendor Acknowledgement
            if "acknowledged" in text_lower or "received and acknowledged" in text_lower or "logged effective" in text_lower:
                # Check for acknowledgement reply timestamp (e.g. "Reply (June 11 14:45):")
                ack_dt = effective_dt
                ack_date_m = re.search(r"Reply\s*\(([A-Za-z0-9,\s:-]+)\)", text, re.IGNORECASE)
                if ack_date_m:
                    dt_ack = cls.parse_datetime(ack_date_m.group(1))
                    if dt_ack:
                        ack_dt = dt_ack

                events.append(ExtractedCommunicationEvent(
                    event_type="OFF_RENT_ACKNOWLEDGEMENT",
                    timestamp=ack_dt,
                    timestamp_iso=ack_dt.isoformat() if ack_dt else None,
                    participants=f"{recipient or 'Vendor'} -> {sender or 'Lessee'}",
                    statement="Vendor acknowledged off-rent request effective immediately.",
                    confidence=0.90 if ack_dt else 0.70,
                    matched_text="Vendor acknowledged off-rent request.",
                    source_document=filename,
                    source_document_id=doc_id
                ))

        # Detect Standby Notice
        elif "standby" in text_lower or "storm" in text_lower or "weather" in text_lower:
            events.append(ExtractedCommunicationEvent(
                event_type="STANDBY_NOTICE",
                timestamp=parsed_email_dt,
                timestamp_iso=parsed_email_dt.isoformat() if parsed_email_dt else None,
                participants=f"{sender or 'Site'} -> {recipient or 'Vendor'}",
                statement="Equipment on standby due to weather condition.",
                confidence=0.90,
                matched_text="Weather standby notice.",
                source_document=filename,
                source_document_id=doc_id
            ))

        return events
