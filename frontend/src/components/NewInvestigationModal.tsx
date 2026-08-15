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
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0B1120'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} color="#38BDF8" />
            Create New Claim Investigation
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '4px', padding: '10px', color: '#EF4444', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Investigation Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
              Investigation Title *
            </label>
            <input
              type="text"
              placeholder="e.g. CAT 320 Excavator Excess Rental Billing Audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                background: '#0B1120',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '8px 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Industry Vertical */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
              Industry Vertical
            </label>
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              style={{
                width: '100%',
                background: '#0B1120',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '8px 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="EQUIPMENT_RENTAL">Equipment Rental</option>
              <option value="LOGISTICS">Logistics & Demurrage</option>
              <option value="CONSTRUCTION">Construction Operations</option>
            </select>
          </div>

          {/* Upload Evidence Files */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
              Upload Evidence Documents (PDF, CSV, EML, TXT)
            </label>
            <div style={{
              border: '2px dashed #334155',
              borderRadius: '6px',
              padding: '20px',
              textAlign: 'center',
              background: '#0B1120',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.eml,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" style={{ cursor: 'pointer' }}>
                <Upload size={24} color="#38BDF8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#F8FAFC' }}>
                  Click to select evidence files
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  Supported formats: Contract PDF, Invoice PDF, Telemetry CSV, Email EML
                </div>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedFiles.map((f, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={12} /> {f.name} ({(f.size / 1024).toFixed(1)} KB)
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #1E293B', paddingTop: '14px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating & Launching Pipeline...' : 'Launch Investigation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
