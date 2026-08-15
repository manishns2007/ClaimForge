export interface DashboardStats {
  total_investigations: number;
  total_documents: number;
  total_evidence_facts: number;
  total_claims: number;
  total_analyzed_amount: number;
  total_disputed_amount: number;
  total_expected_recovery: number;
  high_confidence_claims: number;
  claims_rejected: number;
}

export interface Document {
  id: string;
  investigation_id: string;
  filename: string;
  file_type: 'PDF' | 'CSV' | 'EML' | 'TXT' | string;
  file_size: number;
  status: 'UPLOADED' | 'PARSING' | 'PARSED' | 'FAILED' | string;
  doc_metadata?: Record<string, any>;
  created_at?: string;
}

export interface Investigation {
  id: string;
  title: string;
  vertical: string;
  status: 'PENDING' | 'INGESTING' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  total_analyzed_amount: number;
  total_disputed_amount: number;
  total_expected_recovery: number;
  created_at: string;
  updated_at: string;
  documents?: Document[];
}

export interface Claim {
  id: string;
  investigation_id: string;
  vendor_name: string;
  invoice_number: string;
  charge_id?: string;
  original_amount: number;
  disputed_amount: number;
  reason: string;
  recoverability_score: number;
  expected_recovery_value: number;
  recommendation: 'DISPUTE' | 'HUMAN_REVIEW' | 'DO_NOT_DISPUTE' | string;
  status: string;
}

export interface AgentFinding {
  id: string;
  agent_name: string;
  category: 'CONTRACT' | 'FINANCIAL' | 'COMMUNICATION' | 'REASONING' | string;
  finding_summary: string;
  finding_data_json: Record<string, any>;
  confidence: number;
  created_at?: string;
}

export interface Contradiction {
  id: string;
  contradiction_type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  source_citations?: Record<string, any>;
  evidence_ids?: string[];
  created_at?: string;
}

export interface EvidenceFact {
  id: string;
  source_document_id?: string;
  source_type: string;
  extracted_fact: string;
  timestamp?: string;
  location_reference?: string;
  extraction_method: string;
  confidence: number;
  source_citation?: Record<string, any>;
}

export interface TimelineEvent {
  id: string;
  source_document_id?: string;
  event_type: string;
  description: string;
  timestamp?: string;
  confidence: number;
  source_citation?: Record<string, any>;
}

export interface ContractRuleItem {
  id: string;
  source_document_id?: string;
  rule_type: string;
  rule_value_json: Record<string, any>;
  section_reference?: string;
  source_citation?: Record<string, any>;
}

export interface ChargeItem {
  id: string;
  source_document_id?: string;
  charge_type: string;
  description: string;
  billed_amount: number;
  expected_amount?: number;
  unit_rate?: number;
  units_billed?: number;
  units_actual?: number;
  source_citation?: Record<string, any>;
}

export interface InvestigationDetails {
  investigation: Investigation;
  claim?: Claim | null;
  agent_findings: AgentFinding[];
  contradictions: Contradiction[];
  evidence: EvidenceFact[];
  timeline: TimelineEvent[];
  contract_rules: ContractRuleItem[];
  charges: ChargeItem[];
}

export interface DocumentChunk {
  id?: string;
  chunk_index: number;
  page_number?: number;
  content: string;
  metadata_json?: Record<string, any>;
}

export interface DocumentContent {
  id: string;
  investigation_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  doc_metadata?: Record<string, any>;
  content: string;
  chunks: DocumentChunk[];
  created_at?: string;
}

export interface InvestigationEventLog {
  id: string;
  investigation_id: string;
  event_type: string;
  message: string;
  details_json?: Record<string, any>;
  timestamp: string;
}
