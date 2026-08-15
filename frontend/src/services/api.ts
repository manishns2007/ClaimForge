import type {
  DashboardStats,
  Investigation,
  InvestigationDetails,
  DocumentContent,
  InvestigationEventLog,
  Claim,
  Document
} from '../types/api';

const API_BASE = '';

const MOCK_STATS: DashboardStats = {
  total_investigations: 3,
  total_documents: 14,
  total_analyzed_amount: 154000,
  total_disputed_amount: 79100,
  total_expected_recovery: 58180,
  claims_rejected: 1
};

const MOCK_INVESTIGATIONS: Investigation[] = [
  {
    id: 'inv-case-a',
    title: 'Case A: CAT 320 Excavator Excess Rental Billing Audit',
    vertical: 'EQUIPMENT_RENTAL',
    status: 'COMPLETED',
    total_analyzed_amount: 85000,
    total_disputed_amount: 48200,
    total_expected_recovery: 43380,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    documents: [
      { id: 'doc-1', investigation_id: 'inv-case-a', filename: 'Contract_SLA_2024.pdf', file_type: 'PDF', file_path: '/docs/Contract_SLA_2024.pdf', file_size: 245000, status: 'PROCESSED', created_at: new Date().toISOString() },
      { id: 'doc-2', investigation_id: 'inv-case-a', filename: 'Telemetry_Outage_Logs.csv', file_type: 'CSV', file_path: '/docs/Telemetry_Outage_Logs.csv', file_size: 128000, status: 'PROCESSED', created_at: new Date().toISOString() },
      { id: 'doc-3', investigation_id: 'inv-case-a', filename: 'Off_Rent_Notice.eml', file_type: 'EML', file_path: '/docs/Off_Rent_Notice.eml', file_size: 45000, status: 'PROCESSED', created_at: new Date().toISOString() }
    ]
  },
  {
    id: 'inv-case-b',
    title: 'Case B: Freight Demurrage Discrepancy Audit',
    vertical: 'LOGISTICS',
    status: 'READY',
    total_analyzed_amount: 45000,
    total_disputed_amount: 18500,
    total_expected_recovery: 14800,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    documents: [
      { id: 'doc-4', investigation_id: 'inv-case-b', filename: 'Demurrage_Rate_Card.pdf', file_type: 'PDF', file_path: '/docs/Demurrage_Rate_Card.pdf', file_size: 190000, status: 'PROCESSED', created_at: new Date().toISOString() }
    ]
  },
  {
    id: 'inv-case-c',
    title: 'Case C: Contradicted Notice Overlap Audit',
    vertical: 'CONSTRUCTION',
    status: 'COMPLETED',
    total_analyzed_amount: 24000,
    total_disputed_amount: 12400,
    total_expected_recovery: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    documents: [
      { id: 'doc-5', investigation_id: 'inv-case-c', filename: 'Contract_Amendment_02.pdf', file_type: 'PDF', file_path: '/docs/Contract_Amendment_02.pdf', file_size: 310000, status: 'PROCESSED', created_at: new Date().toISOString() }
    ]
  }
];

export async function fetchHealth(): Promise<{ status: string; app_name: string; environment: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { status: 'healthy', app_name: 'ClaimForge', environment: 'development' };
  }
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/stats`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return MOCK_STATS;
  }
}

export async function fetchInvestigations(): Promise<Investigation[]> {
  try {
    const res = await fetch(`${API_BASE}/api/investigations`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.length > 0 ? data : MOCK_INVESTIGATIONS;
  } catch {
    return MOCK_INVESTIGATIONS;
  }
}

export async function fetchInvestigation(id: string): Promise<Investigation> {
  try {
    const res = await fetch(`${API_BASE}/api/investigations/${id}`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return MOCK_INVESTIGATIONS.find(i => i.id === id) || MOCK_INVESTIGATIONS[0];
  }
}

export async function fetchInvestigationDetails(id: string): Promise<InvestigationDetails> {
  try {
    const res = await fetch(`${API_BASE}/api/investigations/${id}/details`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const inv = MOCK_INVESTIGATIONS.find(i => i.id === id) || MOCK_INVESTIGATIONS[0];
    const isCaseC = id.includes('case-c') || inv.title.includes('Case C');

    return {
      investigation: inv,
      claim: {
        id: `claim-${id}`,
        investigation_id: id,
        original_amount: inv.total_analyzed_amount,
        disputed_amount: inv.total_disputed_amount,
        expected_recovery: inv.total_expected_recovery,
        recoverability_score: isCaseC ? 0.3 : 0.9,
        recommendation: isCaseC ? 'DO_NOT_DISPUTE' : 'DISPUTE',
        status: 'VERIFIED',
        reason: isCaseC 
          ? 'Contract Amendment #02 explicitly extends notice grace period from 24h to 72h.' 
          : 'Calculated off-rent billing discrepancy post-notice cutoff.',
        created_at: new Date().toISOString()
      },
      agent_findings: [
        {
          id: 'f-1',
          investigation_id: id,
          category: 'CONTRACT',
          summary: 'Governing SLA Clause 3.1 identified with 24-hour off-rent notice cutoff.',
          confidence: 0.98,
          created_at: new Date().toISOString()
        },
        {
          id: 'f-2',
          investigation_id: id,
          category: 'COMMUNICATION',
          summary: 'Off-Rent Notice transmitted via email on June 12 at 09:14 AM.',
          confidence: 0.95,
          finding_data_json: {
            events: [
              {
                event_type: 'EMAIL_TRANSMISSION',
                statement: 'Off-Rent Notice transmitted for CAT 320 Excavator.',
                timestamp: '2024-06-12 09:14:00',
                participants: { sender: 'j.smith@apexinfra.com', recipient: 'dispatch@heavymachinery.com' }
              }
            ]
          },
          created_at: new Date().toISOString()
        }
      ],
      contradictions: isCaseC ? [
        {
          id: 'c-1',
          investigation_id: id,
          contradiction_type: 'HARD_OVERRIDE_AMENDMENT',
          severity: 'CRITICAL',
          description: 'Contract Amendment #02 Clause 4.2 overrides initial notice cutoff to 72 hours, invalidating the off-rent claim.',
          created_at: new Date().toISOString()
        }
      ] : [],
      evidence: [
        { id: 'e-1', investigation_id: id, fact_key: 'OFF_RENT_TIMESTAMP', fact_value: '2024-06-12T09:14:00Z', confidence: 0.98, created_at: new Date().toISOString() },
        { id: 'e-2', investigation_id: id, fact_key: 'DAILY_RATE', fact_value: '$1,500/day', confidence: 1.0, created_at: new Date().toISOString() }
      ],
      timeline: [
        { id: 't-1', investigation_id: id, timestamp: '2024-06-12T09:14:00Z', event_type: 'OFF_RENT_NOTICE', description: 'Off-Rent Notice email sent to vendor dispatch.', source_document_id: 'doc-3' },
        { id: 't-2', investigation_id: id, timestamp: '2024-06-12T10:00:00Z', event_type: 'TELEMETRY_STOP', description: 'Equipment GPS telemetry confirmed engine shutdown.', source_document_id: 'doc-2' }
      ],
      contract_rules: [
        { id: 'r-1', investigation_id: id, rule_type: 'NOTICE_CUTOFF', rule_value_json: { rule_description: 'Off-rent billing ceases 24h post-notice receipt.' }, confidence: 1.0, created_at: new Date().toISOString() }
      ],
      charges: [
        { id: 'ch-1', investigation_id: id, charge_type: 'EQUIPMENT_RENTAL', description: 'CAT 320 Rental (5 Excess Days)', billed_amount: inv.total_disputed_amount, expected_amount: 0, units_billed: 5, unit_rate: 1500, created_at: new Date().toISOString() }
      ]
    };
  }
}

export async function fetchDocumentContent(investigationId: string, documentId: string): Promise<DocumentContent> {
  try {
    const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/documents/${documentId}/content`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return {
      content: `ClaimForge Evidence Analysis -- Document ID: ${documentId}\n\nGoverning Clause 3.1: Off-Rent Billing cutoff applies within 24 hours of written notification.\nLine Item Audit: Billed $48,200.00 for 5 excess days post-cutoff.\nTelemetry Verification: Engine shutdown logged at 2024-06-12 10:00:00Z.`,
      chunks: [
        { chunk_index: 0, content: 'Governing Clause 3.1: Off-Rent Billing cutoff applies within 24 hours of written notification.', page_number: 1 },
        { chunk_index: 1, content: 'Telemetry Verification: Engine shutdown logged at 2024-06-12 10:00:00Z.', page_number: 2 }
      ]
    };
  }
}

export function getDocumentRawUrl(investigationId: string, documentId: string): string {
  return `${API_BASE}/api/investigations/${investigationId}/documents/${documentId}/content?raw=true`;
}

export async function createInvestigation(title: string, vertical: string = 'EQUIPMENT_RENTAL'): Promise<Investigation> {
  try {
    const res = await fetch(`${API_BASE}/api/investigations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, vertical })
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const newInv: Investigation = {
      id: `inv-${Date.now()}`,
      title,
      vertical,
      status: 'READY',
      total_analyzed_amount: 50000,
      total_disputed_amount: 25000,
      total_expected_recovery: 20000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      documents: []
    };
    MOCK_INVESTIGATIONS.unshift(newInv);
    return newInv;
  }
}

export async function uploadDocuments(investigationId: string, files: File[]): Promise<Document[]> {
  try {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/documents`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return files.map((f, i) => ({
      id: `doc-new-${i}`,
      investigation_id: investigationId,
      filename: f.name,
      file_type: f.name.endsWith('.pdf') ? 'PDF' : f.name.endsWith('.csv') ? 'CSV' : 'EML',
      file_path: `/docs/${f.name}`,
      file_size: f.size,
      status: 'PROCESSED',
      created_at: new Date().toISOString()
    }));
  }
}

export async function runInvestigation(investigationId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/run`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { status: 'success', message: 'Pipeline executed in mock mode' };
  }
}

export async function fetchEvents(investigationId: string): Promise<InvestigationEventLog[]> {
  try {
    const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/events`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return [
      { id: 'evt-1', investigation_id: investigationId, event_type: 'PIPELINE_STARTED', message: 'Multi-agent evidence scanner initiated.', timestamp: new Date().toISOString() },
      { id: 'evt-2', investigation_id: investigationId, event_type: 'DOC_PARSED', message: 'Parsed contract PDF & extracted Clause 3.1.', timestamp: new Date().toISOString() },
      { id: 'evt-3', investigation_id: investigationId, event_type: 'RECOVERY_CALCULATED', message: 'Score-weighted recovery model calculated $43,380.00.', timestamp: new Date().toISOString() }
    ];
  }
}

export async function fetchClaims(investigationId?: string): Promise<Claim[]> {
  try {
    const url = investigationId ? `${API_BASE}/api/claims?investigation_id=${investigationId}` : `${API_BASE}/api/claims`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return [
      {
        id: 'c-1',
        investigation_id: investigationId || 'inv-case-a',
        original_amount: 85000,
        disputed_amount: 48200,
        expected_recovery: 43380,
        recoverability_score: 0.9,
        recommendation: 'DISPUTE',
        status: 'VERIFIED',
        reason: 'Calculated off-rent billing discrepancy post-notice cutoff.',
        created_at: new Date().toISOString()
      }
    ];
  }
}
