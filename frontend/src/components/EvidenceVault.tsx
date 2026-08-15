import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Mail,
  FileCode,
  Eye,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Document, EvidenceFact } from '../types/api';

interface EvidenceVaultProps {
  documents: Document[];
  evidenceFacts: EvidenceFact[];
  onInspectDocument: (doc: Document) => void;
}

export const EvidenceVault: React.FC<EvidenceVaultProps> = ({
  documents,
  evidenceFacts,
  onInspectDocument
}) => {
  return (
    <div className="card-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #1E293B', paddingBottom: '10px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lock size={14} color="#38BDF8" />
          SECTION 2 — EVIDENCE VAULT
        </h3>
        <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '600' }}>
          {documents.length} File(s)
        </span>
      </div>

      {/* Documents List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {documents.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
            No evidence documents uploaded.
          </div>
        ) : (
          documents.map((doc) => {
            const factCount = evidenceFacts.filter(e => e.source_document_id === doc.id).length;
            return (
              <div
                key={doc.id}
                onClick={() => onInspectDocument(doc)}
                style={{
                  background: '#0B1120',
                  border: '1px solid #1E293B',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#38BDF8';
                  (e.currentTarget as HTMLElement).style.background = '#1E293B';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#1E293B';
                  (e.currentTarget as HTMLElement).style.background = '#0B1120';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <DocumentTypeIcon type={doc.file_type} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                      {doc.filename}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    color: '#34D399',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    {doc.status}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#64748B' }}>
                  <span>{(doc.file_size / 1024).toFixed(1)} KB • {doc.file_type}</span>
                  <span style={{ color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Eye size={12} /> Inspect
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Canonical Evidence Facts Counter */}
      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #1E293B', fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Canonical Facts Extracted:</span>
        <strong style={{ color: '#34D399' }}>{evidenceFacts.length} Facts</strong>
      </div>
    </div>
  );
};

function DocumentTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'PDF':
      return <FileText size={16} color="#EF4444" />;
    case 'CSV':
      return <FileSpreadsheet size={16} color="#10B981" />;
    case 'EML':
      return <Mail size={16} color="#F59E0B" />;
    default:
      return <FileCode size={16} color="#38BDF8" />;
  }
}
