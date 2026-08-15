import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Mail,
  FileCode,
  Eye,
  Lock
} from 'lucide-react';
import type { Document, EvidenceFact } from '../types/api';

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
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 shadow-xs font-body flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E5E2]">
        <h3 className="text-xs font-bold text-[#20242A] flex items-center gap-1.5 uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5 text-[#6C63E6]" />
          Section 2 — Evidence Vault
        </h3>
        <span className="text-[10px] font-semibold text-[#737A80]">
          {documents.length} File(s)
        </span>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {documents.length === 0 ? (
          <div className="py-6 text-center text-[#737A80] text-xs">
            No evidence documents uploaded.
          </div>
        ) : (
          documents.map((doc) => {
            return (
              <div
                key={doc.id}
                onClick={() => onInspectDocument(doc)}
                className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-3 cursor-pointer hover:border-[#6C63E6] hover:bg-white transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <DocumentTypeIcon type={doc.file_type} />
                    <span className="text-xs font-semibold text-[#20242A] truncate max-w-[140px]">
                      {doc.filename}
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                    {doc.status}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 text-[10px] text-[#737A80]">
                  <span>{(doc.file_size / 1024).toFixed(1)} KB • {doc.file_type}</span>
                  <span className="text-[#6C63E6] font-semibold flex items-center gap-1 group-hover:underline">
                    <Eye className="w-3 h-3" /> Inspect
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Canonical Evidence Facts Counter */}
      <div className="mt-4 pt-3 border-t border-[#E5E5E2] text-xs text-[#737A80] flex items-center justify-between">
        <span>Canonical Facts Extracted:</span>
        <strong className="text-emerald-600 font-semibold">{evidenceFacts.length} Facts</strong>
      </div>
    </div>
  );
};

function DocumentTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'PDF':
      return <FileText className="w-4 h-4 text-rose-500" />;
    case 'CSV':
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    case 'EML':
      return <Mail className="w-4 h-4 text-amber-500" />;
    default:
      return <FileCode className="w-4 h-4 text-[#6C63E6]" />;
  }
}
