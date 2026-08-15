import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Search,
  AlertCircle,
  FileSpreadsheet,
  Mail,
  FileCode
} from 'lucide-react';
import type { Document, DocumentContent } from '../types/api';
import { fetchDocumentContent, getDocumentRawUrl } from '../services/api';

interface EvidenceViewerModalProps {
  investigationId: string;
  document: Document | null;
  highlightChunkIndex?: number;
  highlightPageNumber?: number;
  onClose: () => void;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  investigationId,
  document,
  highlightChunkIndex,
  highlightPageNumber,
  onClose
}) => {
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'chunks' | 'raw_text'>('preview');

  useEffect(() => {
    if (!document) return;

    setLoading(true);
    setError(null);

    fetchDocumentContent(investigationId, document.id)
      .then((data) => {
        setDocContent(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching document content:', err);
        setError(err.message || 'Failed to load document content');
        setLoading(false);
      });
  }, [investigationId, document]);

  if (!document) return null;

  const rawUrl = getDocumentRawUrl(investigationId, document.id);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(6px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: '#0F172A',
        border: '1px solid #334155',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '1200px',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0B1120'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileIcon fileType={document.file_type} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#F8FAFC' }}>
                {document.filename}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Type: <strong style={{ color: '#F8FAFC' }}>{document.file_type}</strong></span>
                <span>•</span>
                <span>Size: {(document.file_size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>Status: <span style={{ color: '#34D399' }}>{document.status}</span></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Mode Tabs */}
            <div style={{ display: 'flex', background: '#1E293B', borderRadius: '4px', padding: '2px' }}>
              <button
                onClick={() => setActiveTab('preview')}
                style={{
                  background: activeTab === 'preview' ? '#38BDF8' : 'transparent',
                  color: activeTab === 'preview' ? '#0F172A' : '#94A3B8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Document Viewer
              </button>
              <button
                onClick={() => setActiveTab('chunks')}
                style={{
                  background: activeTab === 'chunks' ? '#38BDF8' : 'transparent',
                  color: activeTab === 'chunks' ? '#0F172A' : '#94A3B8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Parsed Chunks ({docContent?.chunks.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('raw_text')}
                style={{
                  background: activeTab === 'raw_text' ? '#38BDF8' : 'transparent',
                  color: activeTab === 'raw_text' ? '#0F172A' : '#94A3B8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Raw Text
              </button>
            </div>

            {/* Direct File Link */}
            <a
              href={rawUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '4px 10px', textDecoration: 'none' }}
            >
              <Download size={13} /> Open Raw File
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#090D16' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Loading document evidence content...</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Verifying document path & security boundary</div>
            </div>
          ) : error ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#EF4444' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '700' }}>Unable to load document content</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{error}</div>
            </div>
          ) : (
            <>
              {/* Filter / Search Bar */}
              <div style={{ padding: '10px 20px', background: '#0F172A', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Search size={14} color="#64748B" />
                <input
                  type="text"
                  placeholder="Filter or search inside document text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#0B1120',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                {highlightPageNumber && (
                  <span className="badge badge-medium">
                    Citation Highlight: Page {highlightPageNumber}
                  </span>
                )}
              </div>

              {/* View Container */}
              <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                {activeTab === 'preview' && (
                  document.file_type === 'PDF' ? (
                    <iframe
                      src={rawUrl}
                      title={document.filename}
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px', background: '#FFFFFF' }}
                    />
                  ) : (
                    <pre style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12px',
                      color: '#E2E8F0',
                      background: '#0B1120',
                      padding: '20px',
                      borderRadius: '6px',
                      border: '1px solid #1E293B',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.6
                    }}>
                      {docContent?.content}
                    </pre>
                  )
                )}

                {activeTab === 'chunks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {docContent?.chunks.map((chunk) => {
                      const isHighlighted = highlightChunkIndex === chunk.chunk_index || (highlightPageNumber && chunk.page_number === highlightPageNumber);
                      return (
                        <div
                          key={chunk.chunk_index}
                          style={{
                            background: isHighlighted ? 'rgba(56, 189, 248, 0.12)' : '#0F172A',
                            border: isHighlighted ? '1px solid #38BDF8' : '1px solid #1E293B',
                            borderRadius: '6px',
                            padding: '14px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#38BDF8' }}>
                              Chunk #{chunk.chunk_index} {chunk.page_number ? `(Page ${chunk.page_number})` : ''}
                            </span>
                            {isHighlighted && (
                              <span className="badge badge-dispute" style={{ fontSize: '10px' }}>
                                Citation Match Target
                              </span>
                            )}
                          </div>
                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#F8FAFC', whiteSpace: 'pre-wrap' }}>
                            {chunk.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'raw_text' && (
                  <pre style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                    color: '#CBD5E1',
                    background: '#0B1120',
                    padding: '20px',
                    borderRadius: '6px',
                    border: '1px solid #1E293B',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {docContent?.content}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function FileIcon({ fileType }: { fileType: string }) {
  switch (fileType) {
    case 'PDF':
      return <FileText size={20} color="#EF4444" />;
    case 'CSV':
      return <FileSpreadsheet size={20} color="#10B981" />;
    case 'EML':
      return <Mail size={20} color="#F59E0B" />;
    default:
      return <FileCode size={20} color="#38BDF8" />;
  }
}
