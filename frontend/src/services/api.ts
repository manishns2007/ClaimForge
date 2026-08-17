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

const EMPTY_STATS: DashboardStats = {
  total_investigations: 0,
  total_documents: 0,
  total_evidence_facts: 0,
  total_claims: 0,
  total_analyzed_amount: 0,
  total_disputed_amount: 0,
  total_expected_recovery: 0,
  high_confidence_claims: 0,
  claims_rejected: 0
};

export async function fetchHealth(): Promise<{ status: string; app_name: string; environment: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed with HTTP ${res.status}`);
  return await res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/stats`);
    if (!res.ok) throw new Error(`Stats failed with HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err);
    return EMPTY_STATS;
  }
}

export async function fetchInvestigations(): Promise<Investigation[]> {
  const res = await fetch(`${API_BASE}/api/investigations`);
  if (!res.ok) throw new Error(`Failed to fetch investigations: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchInvestigation(id: string): Promise<Investigation> {
  const res = await fetch(`${API_BASE}/api/investigations/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch investigation ${id}: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchInvestigationDetails(id: string): Promise<InvestigationDetails> {
  const res = await fetch(`${API_BASE}/api/investigations/${id}/details`);
  if (!res.ok) throw new Error(`Failed to fetch investigation details for ${id}: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchDocumentContent(investigationId: string, documentId: string): Promise<DocumentContent> {
  const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/documents/${documentId}/content`);
  if (!res.ok) throw new Error(`Failed to fetch document content: HTTP ${res.status}`);
  return await res.json();
}

export function getDocumentRawUrl(investigationId: string, documentId: string): string {
  return `${API_BASE}/api/investigations/${investigationId}/documents/${documentId}/content?raw=true`;
}

export async function createInvestigation(title: string, vertical: string = 'COMMERCIAL_CLAIM'): Promise<Investigation> {
  const res = await fetch(`${API_BASE}/api/investigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, vertical })
  });
  if (!res.ok) throw new Error(`Failed to create investigation: HTTP ${res.status}`);
  return await res.json();
}

export async function uploadDocuments(investigationId: string, files: File[]): Promise<Document[]> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

  const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/documents`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(`Document upload failed: HTTP ${res.status}`);
  return await res.json();
}

export async function runInvestigation(investigationId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/run`, {
    method: 'POST'
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errData.detail || `Pipeline execution failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchEvents(investigationId: string): Promise<InvestigationEventLog[]> {
  const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/events`);
  if (!res.ok) throw new Error(`Failed to fetch events: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchClaims(investigationId?: string): Promise<Claim[]> {
  const url = investigationId ? `${API_BASE}/api/claims?investigation_id=${investigationId}` : `${API_BASE}/api/claims`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch claims: HTTP ${res.status}`);
  return await res.json();
}
