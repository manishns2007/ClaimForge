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
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 font-body">
      <div className="bg-white border border-[#E5E5E2] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E2] flex items-center justify-between bg-[#F7F7F5]">
          <div className="flex items-center gap-3">
            <FileIcon fileType={document.file_type} />
            <div>
              <div className="text-sm font-bold text-[#20242A]">
                {document.filename}
              </div>
              <div className="text-xs text-[#737A80] flex items-center gap-2 mt-0.5">
                <span>Type: <strong className="text-[#20242A]">{document.file_type}</strong></span>
                <span>•</span>
                <span>Size: {(document.file_size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>Status: <span className="text-emerald-600 font-semibold">{document.status}</span></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Tabs */}
            <div className="flex bg-[#E5E5E2] rounded-xl p-1">
              {[
                { key: 'preview', label: 'Document Viewer' },
                { key: 'chunks', label: `Parsed Chunks (${docContent?.chunks.length || 0})` },
                { key: 'raw_text', label: 'Raw Text' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-white text-[#6C63E6] shadow-xs'
                      : 'text-[#737A80] hover:text-[#20242A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Direct File Link */}
            <a
              href={rawUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 rounded-full flex items-center gap-1 text-decoration-none"
            >
              <Download className="w-3.5 h-3.5" /> Raw File
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-[#737A80] hover:text-[#20242A] bg-transparent border-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {loading ? (
            <div className="py-20 text-center text-[#737A80] space-y-2 font-body">
              <div className="text-sm font-bold text-[#20242A]">Loading document evidence content...</div>
              <div className="text-xs text-[#737A80]">Verifying document path & security boundary</div>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-rose-600 space-y-2 font-body">
              <AlertCircle className="w-8 h-8 mx-auto" />
              <div className="text-base font-bold text-[#20242A]">Unable to load document content</div>
              <div className="text-xs text-[#737A80]">{error}</div>
            </div>
          ) : (
            <>
              {/* Filter / Search Bar */}
              <div className="px-6 py-3 bg-[#F7F7F5] border-b border-[#E5E5E2] flex items-center gap-3">
                <Search className="w-4 h-4 text-[#737A80]" />
                <input
                  type="text"
                  placeholder="Filter or search inside document text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-white border border-[#E5E5E2] rounded-xl px-3 py-1.5 text-xs text-[#20242A] outline-none"
                />
                {highlightPageNumber && (
                  <span className="badge badge-medium text-xs">
                    Citation Highlight: Page {highlightPageNumber}
                  </span>
                )}
              </div>

              {/* View Container */}
              <div className="flex-1 overflow-auto p-6">
                {activeTab === 'preview' && (
                  document.file_type === 'PDF' ? (
                    <iframe
                      src={rawUrl}
                      title={document.filename}
                      className="w-full h-full border border-[#E5E5E2] rounded-xl bg-white"
                    />
                  ) : (
                    <pre className="font-mono text-xs text-[#20242A] bg-[#F7F7F5] p-5 rounded-xl border border-[#E5E5E2] whitespace-pre-wrap word-break-all leading-relaxed">
                      {docContent?.content}
                    </pre>
                  )
                )}

                {activeTab === 'chunks' && (
                  <div className="space-y-3">
                    {docContent?.chunks.map((chunk) => {
                      const isHighlighted = highlightChunkIndex === chunk.chunk_index || (highlightPageNumber && chunk.page_number === highlightPageNumber);
                      return (
                        <div
                          key={chunk.chunk_index}
                          className={`rounded-xl p-4 border transition-all ${
                            isHighlighted
                              ? 'bg-[#6C63E6]/10 border-[#6C63E6]'
                              : 'bg-[#F7F7F5] border-[#E5E5E2]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[#6C63E6]">
                              Chunk #{chunk.chunk_index} {chunk.page_number ? `(Page ${chunk.page_number})` : ''}
                            </span>
                            {isHighlighted && (
                              <span className="badge badge-dispute text-[10px]">
                                Citation Match Target
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-[#20242A] whitespace-pre-wrap">
                            {chunk.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'raw_text' && (
                  <pre className="font-mono text-xs text-[#20242A] bg-[#F7F7F5] p-5 rounded-xl border border-[#E5E5E2] whitespace-pre-wrap">
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
      return <FileText className="w-5 h-5 text-rose-500" />;
    case 'CSV':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    case 'EML':
      return <Mail className="w-5 h-5 text-amber-500" />;
    default:
      return <FileCode className="w-5 h-5 text-[#6C63E6]" />;
  }
}
