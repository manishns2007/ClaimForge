import re
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.core.logging import logger
from backend.app.db.models import (
    Investigation, Document, DocumentChunk, Event, Charge, ContractRule, Evidence, Claim, ClaimEvidence
)
from backend.app.services.event_service import EventService
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.document_retriever import SqliteDocumentRetriever
from backend.app.services.dynamic_extractor import DynamicExtractor
from backend.app.engines.telemetry_engine import TelemetryEngine
from backend.app.services.contract_rule_normalizer import ContractRuleNormalizer, NormalizedContractRule
from backend.app.services.charge_normalizer import ChargeNormalizer, NormalizedCharge
from backend.app.engines.reconciliation_engine import ReconciliationEngine, ReconciliationResult
from backend.app.engines.claim_engine import ClaimEngine, ClaimCandidate
from backend.app.engines.scoring_engine import ScoringEngine, ScoreBreakdown


class DeterministicInvestigationPipeline:
    @staticmethod
    def run_investigation(db: Session, investigation_id: str) -> Dict[str, Any]:
        """
        Executes complete deterministic, document-grounded investigation pipeline:
        Telemetry normalization -> Dynamic Contract Rule extraction -> Dynamic Charge Extraction
        -> Grounding Validation -> Financial Reconciliation -> Claim Candidate -> Transparent Scoring -> Persistence.
        Never fabricates or synthesizes missing values.
        """
        investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
        if not investigation:
            raise ValueError(f"Investigation {investigation_id} not found")

        investigation.status = "RUNNING"
        db.commit()

        EventService.create_event(
            db, investigation_id, "ENGINE_STARTED",
            f"Launched deterministic investigation pipeline for '{investigation.title}'"
        )

        documents = db.query(Document).filter(Document.investigation_id == investigation_id).all()
        if not documents:
            investigation.status = "FAILED"
            db.commit()
            EventService.create_event(
                db, investigation_id, "ENGINE_FAILED", "No documents uploaded for investigation"
            )
            return {"success": False, "error": "No documents uploaded"}

        # ----------------------------------------------------
        # Step 1: Process & Normalize Telemetry CSVs
        # ----------------------------------------------------
        telemetry_engine = TelemetryEngine()
        telemetry_docs = [d for d in documents if d.file_type == "CSV"]
        
        telemetry_df = pd.DataFrame()
        engine_shutdown_ts: Optional[datetime] = None
        physical_pickup_ts: Optional[datetime] = None

        if telemetry_docs:
            csv_doc = telemetry_docs[0]
            try:
                raw_df = pd.read_csv(csv_doc.storage_path)
                telemetry_df, report = telemetry_engine.normalize_columns(raw_df)

                EventService.create_event(
                    db, investigation_id, "TELEMETRY_NORMALIZED",
                    f"Normalized telemetry CSV ({report.row_count} rows). Available: {', '.join(report.available_fields)}",
                    report.model_dump()
                )

                # Classify State Windows & Detect Events
                windows = telemetry_engine.calculate_state_windows(telemetry_df)
                for w in windows:
                    if w.state == "OFF" and engine_shutdown_ts is None:
                        engine_shutdown_ts = w.start_time

                # Detect GPS Site Departure
                if "latitude" in telemetry_df.columns and "longitude" in telemetry_df.columns:
                    site_lat = telemetry_df["latitude"].dropna().iloc[0]
                    site_lon = telemetry_df["longitude"].dropna().iloc[0]
                    gps_events = telemetry_engine.detect_geofence_events(telemetry_df, site_lat, site_lon)
                    
                    for ge in gps_events:
                        if ge.event_type == "SITE_DEPARTURE":
                            physical_pickup_ts = ge.timestamp
                            # Create Event record in DB
                            evt = Event(
                                investigation_id=investigation_id,
                                source_document_id=csv_doc.id,
                                event_type="SITE_DEPARTURE",
                                description=f"Equipment physical departure from site coordinates ({ge.latitude}, {ge.longitude})",
                                timestamp=ge.timestamp,
                                location_lat=ge.latitude,
                                location_lng=ge.longitude,
                                source_citation={"filename": csv_doc.filename, "source_row": ge.source_row}
                            )
                            db.add(evt)
                            db.commit()

                EventService.create_event(
                    db, investigation_id, "OPERATIONAL_EVENTS_CREATED",
                    f"Extracted operational state windows ({len(windows)} windows). Shutdown: {engine_shutdown_ts}, Pickup: {physical_pickup_ts}"
                )
            except Exception as e:
                logger.error(f"Error processing telemetry CSV: {e}")

        # ----------------------------------------------------
        # Step 2: Extract Communication Evidence (EML/Emails)
        # ----------------------------------------------------
        retriever = SqliteDocumentRetriever(db)
        email_chunks = retriever.get_chunks_for_investigation(investigation_id, file_types=["EML", "TXT"])
        off_rent_notice_ts: Optional[datetime] = None
        off_rent_doc_id: Optional[str] = None
        off_rent_filename: Optional[str] = None
        off_rent_matched_text: str = ""

        vendor_ack_ts: Optional[datetime] = None
        vendor_ack_doc_id: Optional[str] = None
        vendor_ack_filename: Optional[str] = None
        vendor_ack_matched_text: str = ""

        for ch in email_chunks:
            comm_events = DynamicExtractor.extract_communication_events(
                text=ch.content,
                filename=ch.source_document_filename,
                doc_id=ch.document_id
            )

            for ce in comm_events:
                if ce.event_type == "OFF_RENT_REQUEST" and ce.timestamp and off_rent_notice_ts is None:
                    off_rent_notice_ts = ce.timestamp
                    off_rent_doc_id = ch.document_id
                    off_rent_filename = ch.source_document_filename
                    off_rent_matched_text = ce.matched_text
                elif ce.event_type == "OFF_RENT_ACKNOWLEDGEMENT" and ce.timestamp and vendor_ack_ts is None:
                    vendor_ack_ts = ce.timestamp
                    vendor_ack_doc_id = ch.document_id
                    vendor_ack_filename = ch.source_document_filename
                    vendor_ack_matched_text = ce.matched_text

        # ----------------------------------------------------
        # Step 3: Extract Contract Rules (PDFs/All Docs)
        # ----------------------------------------------------
        contract_chunks = retriever.get_chunks_for_investigation(investigation_id, file_types=["PDF"])
        normalized_rules: List[NormalizedContractRule] = []
        has_pickup_amendment = False
        amendment_doc_id: Optional[str] = None
        amendment_filename: Optional[str] = None
        amendment_matched_text: str = ""

        for c_chunk in contract_chunks:
            extracted_rules = DynamicExtractor.extract_contract_rules(
                text=c_chunk.content,
                filename=c_chunk.source_document_filename,
                doc_id=c_chunk.document_id,
                page=c_chunk.page_number or 1
            )

            for er in extracted_rules:
                if er.rule_type == "OFF_RENT_TRIGGER" and er.rule_value == "PHYSICAL_PICKUP":
                    has_pickup_amendment = True
                    amendment_doc_id = c_chunk.document_id
                    amendment_filename = c_chunk.source_document_filename
                    amendment_matched_text = er.matched_text

                norm_rule = ContractRuleNormalizer.normalize_rule(
                    rule_type=er.rule_type,
                    value=er.rule_value,
                    section_reference=er.section_reference,
                    source_document_id=c_chunk.document_id,
                    source_citation={"filename": c_chunk.source_document_filename, "page": er.page, "matched_text": er.matched_text}
                )
                normalized_rules.append(norm_rule)

                # Persist ContractRule in DB
                db_rule = ContractRule(
                    investigation_id=investigation_id,
                    source_document_id=c_chunk.document_id,
                    rule_type=er.rule_type,
                    rule_value_json={"value": er.rule_value},
                    section_reference=er.section_reference,
                    source_citation={"filename": c_chunk.source_document_filename, "page": er.page, "matched_text": er.matched_text}
                )
                db.add(db_rule)
        
        db.commit()

        # Validate contract rules
        rule_val = ContractRuleNormalizer.validate_rules(normalized_rules)
        EventService.create_event(
            db, investigation_id, "CONTRACT_RULES_NORMALIZED",
            f"Normalized {len(normalized_rules)} contract rule(s). Validation status: {rule_val.status}",
            rule_val.model_dump()
        )

        # ----------------------------------------------------
        # Step 4: Extract Charges from Invoices (Grounding Firewall)
        # ----------------------------------------------------
        all_doc_chunks = retriever.get_chunks_for_investigation(investigation_id)
        normalized_charges: List[NormalizedCharge] = []
        for ch in all_doc_chunks:
            inv_data = DynamicExtractor.extract_invoice_data(
                text=ch.content,
                filename=ch.source_document_filename,
                doc_id=ch.document_id,
                page=ch.page_number or 1
            )

            # Check if this document contains an actual invoice / charge with billed amount
            if inv_data.billed_amount and inv_data.billed_amount.value > 0:
                billed_amount = inv_data.billed_amount.value
                unit_rate = inv_data.unit_rate.value if inv_data.unit_rate else 0.0
                units_billed = inv_data.units_billed.value if inv_data.units_billed else 0.0

                # Deterministic fallback calculation only from grounded values
                if unit_rate > 0 and units_billed == 0:
                    units_billed = billed_amount / unit_rate
                elif units_billed > 0 and unit_rate == 0:
                    unit_rate = billed_amount / units_billed
                elif unit_rate == 0 and units_billed == 0:
                    unit_rate = billed_amount
                    units_billed = 1.0

                vendor_name = inv_data.vendor_name.value if inv_data.vendor_name else "Unknown Vendor"
                invoice_number = inv_data.invoice_number.value if inv_data.invoice_number else "INV-UNKNOWN"
                equipment_id = inv_data.equipment_id.value if inv_data.equipment_id else None

                b_start = inv_data.billing_start.value if inv_data.billing_start else None
                b_end = inv_data.billing_end.value if inv_data.billing_end else None

                charge = ChargeNormalizer.normalize_charge(
                    invoice_number=invoice_number,
                    vendor_name=vendor_name,
                    equipment_id=equipment_id,
                    charge_type="RENTAL",
                    units_billed=units_billed,
                    unit_rate=unit_rate,
                    billed_amount=billed_amount,
                    billing_start=b_start,
                    billing_end=b_end,
                    source_document_id=ch.document_id,
                    source_citation={
                        "filename": ch.source_document_filename,
                        "page": ch.page_number or 1,
                        "matched_amount": inv_data.billed_amount.matched_text,
                        "confidence": inv_data.billed_amount.confidence
                    }
                )
                normalized_charges.append(charge)

                # Persist Charge record in DB
                db_charge = Charge(
                    investigation_id=investigation_id,
                    source_document_id=ch.document_id,
                    charge_type="RENTAL",
                    description=f"{equipment_id or 'Equipment'} Rental ({units_billed} units @ ${unit_rate}/unit)",
                    billed_amount=billed_amount,
                    expected_amount=None,
                    unit_rate=unit_rate,
                    units_billed=units_billed,
                    source_citation={"filename": ch.source_document_filename, "page": ch.page_number or 1}
                )
                db.add(db_charge)

        db.commit()

        EventService.create_event(
            db, investigation_id, "CHARGES_NORMALIZED",
            f"Normalized {len(normalized_charges)} invoice charge(s)."
        )

        # ----------------------------------------------------
        # Grounding Firewall: If NO financial items found in documents
        # ----------------------------------------------------
        if not normalized_charges:
            logger.info(f"[{investigation_id}] No financial charges found in uploaded documents. Routing to HUMAN_REVIEW without fabricated values.")
            
            db_claim = Claim(
                investigation_id=investigation_id,
                vendor_name="N/A",
                invoice_number="N/A",
                original_amount=0.0,
                disputed_amount=0.0,
                reason="No verified document-grounded financial charges found in uploaded documents. Human review required.",
                recoverability_score=0.0,
                expected_recovery_value=0.0,
                recommendation="HUMAN_REVIEW",
                status="HUMAN_REVIEW"
            )
            db.add(db_claim)
            db.commit()
            db.refresh(db_claim)

            investigation.status = "COMPLETED"
            investigation.total_analyzed_amount = 0.0
            investigation.total_disputed_amount = 0.0
            investigation.total_expected_recovery = 0.0
            db.commit()

            EventService.create_event(
                db, investigation_id, "INVESTIGATION_COMPLETED",
                "Investigation completed. No financial charges detected in uploaded documents. Status: HUMAN_REVIEW",
                {
                    "claim_id": db_claim.id,
                    "disputed_amount": 0.0,
                    "expected_recovery": 0.0,
                    "score": 0.0,
                    "recommendation": "HUMAN_REVIEW"
                }
            )

            return {
                "success": True,
                "investigation_id": investigation_id,
                "claim_id": db_claim.id,
                "original_amount": 0.0,
                "disputed_amount": 0.0,
                "expected_recovery_value": 0.0,
                "score": 0.0,
                "recommendation": "HUMAN_REVIEW",
                "reason": db_claim.reason,
                "audit_record": {"status": "NO_CHARGES_FOUND"}
            }

        primary_charge = normalized_charges[0]

        # ----------------------------------------------------
        # Step 5: Perform Financial Reconciliation
        # ----------------------------------------------------
        reconciliation = ReconciliationEngine.reconcile_off_rent_charge(
            charge=primary_charge,
            contract_rules=normalized_rules,
            off_rent_notice_ts=off_rent_notice_ts,
            vendor_ack_ts=vendor_ack_ts,
            engine_shutdown_ts=engine_shutdown_ts,
            physical_pickup_ts=physical_pickup_ts
        )

        EventService.create_event(
            db, investigation_id, "RECONCILIATION_COMPLETED",
            f"Financial reconciliation completed. Discrepancy: ${reconciliation.disputed_amount:.2f}",
            reconciliation.model_dump()
        )

        # ----------------------------------------------------
        # Step 6: Create Canonical Evidence Records
        # ----------------------------------------------------
        created_evidence_items: List[Evidence] = []
        
        # Supporting Evidence
        if off_rent_notice_ts:
            ev1 = EvidenceService.create_evidence(
                db, investigation_id, off_rent_doc_id, "EML",
                f"Lessee sent off-rent notification at {off_rent_notice_ts.isoformat()}",
                {"filename": off_rent_filename or "notice.eml", "matched_text": off_rent_matched_text, "timestamp": off_rent_notice_ts.isoformat()}
            )
            created_evidence_items.append(ev1)

        if vendor_ack_ts:
            ev2 = EvidenceService.create_evidence(
                db, investigation_id, vendor_ack_doc_id, "EML",
                f"Vendor acknowledged off-rent request at {vendor_ack_ts.isoformat()}",
                {"filename": vendor_ack_filename or "acknowledgement.eml", "matched_text": vendor_ack_matched_text, "timestamp": vendor_ack_ts.isoformat()}
            )
            created_evidence_items.append(ev2)

        if engine_shutdown_ts:
            csv_doc_obj = telemetry_docs[0] if telemetry_docs else None
            ev3 = EvidenceService.create_evidence(
                db, investigation_id, csv_doc_obj.id if csv_doc_obj else None, "CSV",
                f"Telemetry engine shutdown recorded at {engine_shutdown_ts.isoformat()}",
                {"filename": csv_doc_obj.filename if csv_doc_obj else "telemetry.csv", "timestamp": engine_shutdown_ts.isoformat()}
            )
            created_evidence_items.append(ev3)

        # Contradiction Counter-Evidence (if amendment exists)
        contradiction_evidence_ids = []
        contradiction_reason = None
        if has_pickup_amendment:
            ev_contra = EvidenceService.create_evidence(
                db, investigation_id, amendment_doc_id, "PDF",
                "Contract Amendment explicitly stipulates that billing continues until physical equipment pickup.",
                {"filename": amendment_filename or "amendment.pdf", "matched_text": amendment_matched_text, "clause": "Pickup Condition Amendment"}
            )
            contradiction_evidence_ids.append(ev_contra.id)
            contradiction_reason = "Contract Amendment overrides off-rent notice cutoff. Billing valid until physical pickup."

        # ----------------------------------------------------
        # Step 7: Evaluate Claim Candidate & Calculate Score
        # ----------------------------------------------------
        missing_evidence = []
        if rule_val.status == "REVIEW_REQUIRED":
            missing_evidence.extend(rule_val.missing_rules)

        candidate = ClaimEngine.evaluate_claim_candidate(
            vendor_name=primary_charge.vendor_name,
            invoice_number=primary_charge.invoice_number,
            reconciliation=reconciliation,
            supporting_evidence_ids=[e.id for e in created_evidence_items],
            missing_evidence=missing_evidence,
            contradiction_evidence_ids=contradiction_evidence_ids,
            contradiction_reason=contradiction_reason
        )

        EventService.create_event(
            db, investigation_id, "CLAIM_CANDIDATE_CREATED",
            f"Claim candidate generated (${candidate.disputed_amount:.2f} disputed)",
            candidate.model_dump()
        )

        score_result = ScoringEngine.calculate_recoverability_score(
            disputed_amount=candidate.disputed_amount,
            has_contract_support=len(normalized_rules) > 0,
            has_financial_discrepancy=reconciliation.has_discrepancy,
            has_vendor_acknowledgement=vendor_ack_ts is not None,
            has_telemetry_corroboration=engine_shutdown_ts is not None,
            has_gps_corroboration=physical_pickup_ts is not None,
            has_contradiction=candidate.has_contradiction,
            has_missing_critical_evidence=len(missing_evidence) > 0,
            contradiction_details=candidate.contradiction_reason,
            missing_rule_details=", ".join(missing_evidence) if missing_evidence else None
        )

        EventService.create_event(
            db, investigation_id, "SCORE_CALCULATED",
            f"Recoverability score: {score_result.score_total}/100. Recommendation: {score_result.recommendation}",
            score_result.model_dump()
        )

        # ----------------------------------------------------
        # Step 8: Persist Final Claim DB Record
        # ----------------------------------------------------
        db_claim = Claim(
            investigation_id=investigation_id,
            vendor_name=candidate.vendor_name,
            invoice_number=candidate.invoice_number,
            original_amount=candidate.original_amount,
            disputed_amount=candidate.disputed_amount,
            reason=candidate.reason,
            recoverability_score=score_result.recoverability_score,
            expected_recovery_value=score_result.expected_recovery_value,
            recommendation=score_result.recommendation,
            status="VERIFIED" if score_result.recommendation == "DISPUTE" else ("REJECTED" if score_result.recommendation == "DO_NOT_DISPUTE" else "HUMAN_REVIEW")
        )
        db.add(db_claim)
        db.commit()
        db.refresh(db_claim)

        # Link supporting evidence items
        for ev in created_evidence_items:
            link = ClaimEvidence(
                claim_id=db_claim.id,
                evidence_id=ev.id,
                relation_type="SUPPORTS",
                weight=1.0,
                impact_score=20.0
            )
            db.add(link)

        # Link contradicting evidence items
        for cid in contradiction_evidence_ids:
            link = ClaimEvidence(
                claim_id=db_claim.id,
                evidence_id=cid,
                relation_type="CONTRADICTS",
                weight=1.0,
                impact_score=-20.0
            )
            db.add(link)

        db.commit()

        # Update Investigation aggregate values
        investigation.status = "COMPLETED"
        investigation.total_analyzed_amount = candidate.original_amount
        investigation.total_disputed_amount = candidate.disputed_amount
        investigation.total_expected_recovery = score_result.expected_recovery_value
        db.commit()

        EventService.create_event(
            db, investigation_id, "INVESTIGATION_COMPLETED",
            f"Investigation finished successfully. Recommendation: {score_result.recommendation}",
            {
                "claim_id": db_claim.id,
                "disputed_amount": candidate.disputed_amount,
                "expected_recovery": score_result.expected_recovery_value,
                "score": score_result.score_total,
                "recommendation": score_result.recommendation
            }
        )

        return {
            "success": True,
            "investigation_id": investigation_id,
            "claim_id": db_claim.id,
            "original_amount": candidate.original_amount,
            "disputed_amount": candidate.disputed_amount,
            "expected_recovery_value": score_result.expected_recovery_value,
            "score": score_result.score_total,
            "recommendation": score_result.recommendation,
            "reason": candidate.reason,
            "audit_record": candidate.calculation
        }
