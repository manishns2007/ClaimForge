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

export async function fetchHealth(): Promise<{ status: string; app_name: string; environment: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/api/dashboard/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  return res.json();
}

export async function fetchInvestigations(): Promise<Investigation[]> {
  const res = await fetch(`${API_BASE}/api/investigations`);
  if (!res.ok) throw new Error(`Failed to fetch investigations: ${res.statusText}`);
  return res.json();
}

export async function fetchInvestigation(id: string): Promise<Investigation> {
  const res = await fetch(`${API_BASE}/api/investigations/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch investigation ${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchInvestigationDetails(id: string): Promise<InvestigationDetails> {
  const res = await fetch(`${API_BASE}/api/investigations/${id}/details`);
  if (!res.ok) throw new Error(`Failed to fetch investigation details ${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchDocumentContent(investigationId: string, documentId: string): Promise<DocumentContent> {
  const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/documents/${documentId}/content`);
  if (!res.ok) throw new Error(`Failed to fetch document content: ${res.statusText}`);
  return res.json();
}

export function getDocumentRawUrl(investigationId: string, documentId: string): string {
  return `${API_BASE}/api/investigations/${investigationId}/documents/${documentId}/content?raw=true`;
}

export async function createInvestigation(title: string, vertical: string = 'EQUIPMENT_RENTAL'): Promise<Investigation> {
  const res = await fetch(`${API_BASE}/api/investigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, vertical })
  });
  if (!res.ok) throw new Error(`Failed to create investigation: ${res.statusText}`);
  return res.json();
}

export async function uploadDocuments(investigationId: string, files: File[]): Promise<Document[]> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

  const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/documents`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(`Failed to upload documents: ${res.statusText}`);
  return res.json();
}

export async function runInvestigation(investigationId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/run`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to run investigation: ${res.statusText}`);
  return res.json();
}

export async function fetchEvents(investigationId: string): Promise<InvestigationEventLog[]> {
  const res = await fetch(`${API_BASE}/api/investigations/${investigationId}/events`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  return res.json();
}

export async function fetchClaims(investigationId?: string): Promise<Claim[]> {
  const url = investigationId ? `${API_BASE}/api/claims?investigation_id=${investigationId}` : `${API_BASE}/api/claims`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch claims: ${res.statusText}`);
  return res.json();
}
