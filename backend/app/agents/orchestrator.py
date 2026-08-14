from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.core.logging import logger
from backend.app.db.models import AgentFindingRecord, ContradictionRecord
from backend.app.services.event_service import EventService
from backend.app.agents.contract_agent import ContractIntelligenceAgent
from backend.app.agents.financial_agent import FinancialInvestigator
from backend.app.agents.communication_agent import CommunicationInvestigator
from backend.app.agents.event_reasoning_agent import EventReasoningAgent
from backend.app.agents.contradiction_agent import ContradictionHunter
from backend.app.services.investigation_service import DeterministicInvestigationPipeline

class AIInvestigationOrchestrator:
    @staticmethod
    def run_full_investigation(db: Session, investigation_id: str) -> Dict[str, Any]:
        """
        Orchestrates the complete multi-agent AI pipeline + deterministic verification loop:
        1. Contract Agent
        2. Financial Agent
        3. Communication Agent
        4. Event Reasoning Agent
        5. Contradiction Hunter (Adversarial)
        6. Deterministic Pipeline Verification & Scoring
        """
        EventService.create_event(
            db, investigation_id, "AI_PIPELINE_LAUNCHED",
            "Launched AI Multi-Agent Investigation & Adversarial Contradiction Search"
        )

        # 1. Contract Agent
        contract_agent = ContractIntelligenceAgent()
        contract_resp = contract_agent.extract_findings(db, investigation_id)
        
        db_finding = AgentFindingRecord(
            investigation_id=investigation_id,
            agent_name=contract_agent.agent_name,
            category="CONTRACT",
            finding_summary=f"Extracted {len(contract_resp.findings)} contractual rule finding(s)",
            finding_data_json=contract_resp.model_dump(),
            confidence=1.0
        )
        db.add(db_finding)
        db.commit()

        # 2. Financial Agent
        fin_agent = FinancialInvestigator()
        fin_resp = fin_agent.extract_line_items(db, investigation_id)

        db_finding_fin = AgentFindingRecord(
            investigation_id=investigation_id,
            agent_name=fin_agent.agent_name,
            category="FINANCIAL",
            finding_summary=f"Extracted {len(fin_resp.line_items)} invoice line item(s)",
            finding_data_json=fin_resp.model_dump(),
            confidence=1.0
        )
        db.add(db_finding_fin)
        db.commit()

        # 3. Communication Agent
        comm_agent = CommunicationInvestigator()
        comm_resp = comm_agent.extract_communication_events(db, investigation_id)

        db_finding_comm = AgentFindingRecord(
            investigation_id=investigation_id,
            agent_name=comm_agent.agent_name,
            category="COMMUNICATION",
            finding_summary=f"Extracted {len(comm_resp.events)} email communication event(s)",
            finding_data_json=comm_resp.model_dump(),
            confidence=1.0
        )
        db.add(db_finding_comm)
        db.commit()

        # 4. Event Reasoning Agent
        reasoning_agent = EventReasoningAgent()
        reasoning_resp = reasoning_agent.reason_over_evidence(
            db=db,
            investigation_id=investigation_id,
            contract_findings=[f.model_dump() for f in contract_resp.findings],
            financial_findings=[f.model_dump() for f in fin_resp.line_items],
            communication_events=[e.model_dump() for e in comm_resp.events]
        )

        db_finding_reason = AgentFindingRecord(
            investigation_id=investigation_id,
            agent_name=reasoning_agent.agent_name,
            category="REASONING",
            finding_summary=f"Synthesized {len(reasoning_resp.chronological_timeline)} timeline event(s)",
            finding_data_json=reasoning_resp.model_dump(),
            confidence=1.0
        )
        db.add(db_finding_reason)
        db.commit()

        # 5. Adversarial Contradiction Hunter
        EventService.create_event(
            db, investigation_id, "CONTRADICTION_SEARCH_STARTED",
            "Adversarial Contradiction Hunter scanning evidence for counter-arguments"
        )

        contradiction_hunter = ContradictionHunter()
        hypothesis_dict = reasoning_resp.proposed_claim.model_dump() if reasoning_resp.proposed_claim else {}
        contradiction_resp = contradiction_hunter.search_for_contradictions(
            db=db,
            investigation_id=investigation_id,
            claim_hypothesis=hypothesis_dict,
            supporting_evidence_ids=[]
        )

        for c_item in contradiction_resp.findings:
            c_rec = ContradictionRecord(
                investigation_id=investigation_id,
                contradiction_type=c_item.contradiction_type,
                description=c_item.description,
                severity=c_item.severity,
                source_citations_json=c_item.source_citations,
                evidence_ids_json=c_item.evidence_ids
            )
            db.add(c_rec)
            EventService.create_event(
                db, investigation_id, "CONTRADICTION_FOUND",
                f"Contradiction Hunter discovered [{c_item.severity}] {c_item.contradiction_type}: {c_item.description}",
                c_item.model_dump()
            )
        db.commit()

        EventService.create_event(
            db, investigation_id, "CONTRADICTION_SEARCH_COMPLETED",
            f"Contradiction search complete. Contradictions found: {len(contradiction_resp.findings)}"
        )

        # 6. Execute Deterministic Pipeline & Reconcile Verification
        deterministic_res = DeterministicInvestigationPipeline.run_investigation(db, investigation_id)

        return {
            "success": True,
            "investigation_id": investigation_id,
            "contract_findings": len(contract_resp.findings),
            "financial_items": len(fin_resp.line_items),
            "communication_events": len(comm_resp.events),
            "timeline_events": len(reasoning_resp.chronological_timeline),
            "contradictions_found": len(contradiction_resp.findings),
            "deterministic_result": deterministic_res
        }
