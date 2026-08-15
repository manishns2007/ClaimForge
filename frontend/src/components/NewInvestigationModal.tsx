import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Upload,
  FileText,
  AlertCircle
} from 'lucide-react';
import { createInvestigation, uploadDocuments, runInvestigation } from '../services/api';

interface NewInvestigationModalProps {
  onClose: () => void;
  onSuccess: (newInvestigationId: string) => void;
}

export const NewInvestigationModal: React.FC<NewInvestigationModalProps> = ({
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [vertical, setVertical] = useState('EQUIPMENT_RENTAL');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the investigation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Investigation
      const inv = await createInvestigation(title, vertical);

      // 2. Upload Files if selected
      if (selectedFiles.length > 0) {
        await uploadDocuments(inv.id, selectedFiles);
        // 3. Trigger Investigation Pipeline
        await runInvestigation(inv.id);
      }

      setLoading(false);
      onSuccess(inv.id);
    } catch (err: any) {
      console.error('Error creating investigation:', err);
      setError(err.message || 'Failed to create investigation');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 font-body">
      <div className="bg-white border border-[#E5E5E2] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E2] flex items-center justify-between bg-[#F7F7F5]">
          <h3 className="text-sm font-bold text-[#20242A] flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-[#6C63E6]" />
            Create New Claim Investigation
          </h3>
          <button
            onClick={onClose}
            className="text-[#737A80] hover:text-[#20242A] bg-transparent border-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Investigation Title */}
          <div>
            <label className="block text-xs font-semibold text-[#737A80] mb-1.5">
              Investigation Title *
            </label>
            <input
              type="text"
              placeholder="e.g. CAT 320 Excavator Excess Rental Billing Audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl px-3.5 py-2.5 text-xs text-[#20242A] outline-none focus:ring-1 focus:ring-[#6C63E6]"
            />
          </div>

          {/* Industry Vertical */}
          <div>
            <label className="block text-xs font-semibold text-[#737A80] mb-1.5">
              Industry Vertical
            </label>
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="w-full bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl px-3.5 py-2.5 text-xs text-[#20242A] outline-none focus:ring-1 focus:ring-[#6C63E6] cursor-pointer"
            >
              <option value="EQUIPMENT_RENTAL">Equipment Rental</option>
              <option value="LOGISTICS">Logistics & Demurrage</option>
              <option value="CONSTRUCTION">Construction Operations</option>
            </select>
          </div>

          {/* Upload Evidence Files */}
          <div>
            <label className="block text-xs font-semibold text-[#737A80] mb-1.5">
              Upload Evidence Documents (PDF, CSV, EML, TXT)
            </label>
            <div className="border-2 border-dashed border-[#E5E5E2] hover:border-[#6C63E6] transition-colors rounded-xl p-6 text-center bg-[#F7F7F5] cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.eml,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer space-y-1 block">
                <Upload className="w-6 h-6 text-[#6C63E6] mx-auto mb-1" />
                <div className="text-xs font-semibold text-[#20242A]">
                  Click to select evidence files
                </div>
                <div className="text-[10px] text-[#737A80]">
                  Supported formats: Contract PDF, Invoice PDF, Telemetry CSV, Email EML
                </div>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="text-xs text-[#6C63E6] font-medium flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> {f.name} ({(f.size / 1024).toFixed(1)} KB)
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#E5E5E2] pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4 rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs py-2 px-5 rounded-full"
            >
              {loading ? 'Creating & Launching Pipeline...' : 'Launch Investigation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
