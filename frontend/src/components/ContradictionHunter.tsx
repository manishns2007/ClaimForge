import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock
} from 'lucide-react';
import { Contradiction, Document } from '../types/api';

interface ContradictionHunterProps {
  contradictions: Contradiction[];
  documents: Document[];
  onOpenDocument: (doc: Document) => void;
}

export const ContradictionHunter: React.FC<ContradictionHunterProps> = ({
  contradictions,
  documents,
  onOpenDocument
}) => {
  const hasCritical = contradictions.some(c => c.severity === 'CRITICAL');

  return (
    <div className="card-panel" style={{
      marginBottom: '20px',
      border: hasCritical ? '1px solid #EF4444' : '1px solid #1E293B',
      background: hasCritical ? 'rgba(239, 68, 68, 0.04)' : '#0F172A'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: hasCritical ? '#EF4444' : '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color={hasCritical ? '#EF4444' : '#F59E0B'} />
          SECTION 5 — ADVERSARIAL EVIDENCE & CONTRADICTION HUNTER
        </h3>

        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          Active Adversarial Search Engine
        </span>
      </div>

      <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>
        The system actively searched for counter-evidence, contract amendments, or operational records that could invalidate the proposed recovery.
      </p>

      {contradictions.length === 0 ? (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '6px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <CheckCircle2 size={20} color="#34D399" />
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#34D399' }}>
              NO CONTRADICTIONS DISCOVERED
            </div>
            <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
              Adversarial agent scanned all uploaded contract clauses, emails, and telemetry files. No counter-evidence was found to invalidate the claim.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {contradictions.map((c) => {
            const isCritical = c.severity === 'CRITICAL';
            return (
              <div
                key={c.id}
                style={{
                  background: isCritical ? 'rgba(239, 68, 68, 0.12)' : '#0B1120',
                  border: isCritical ? '1px solid #EF4444' : '1px solid #334155',
                  borderRadius: '6px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${isCritical ? 'badge-critical' : c.severity === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                      <AlertTriangle size={12} /> {c.severity} SEVERITY CONTRADICTION
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#F8FAFC', fontFamily: 'monospace' }}>
                      {c.contradiction_type}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#F8FAFC', fontWeight: '600', lineHeight: 1.5 }}>
                  {c.description}
                </div>

                {/* Recommendation Override Notice */}
                {isCritical && (
                  <div style={{
                    marginTop: '12px',
                    background: '#0F172A',
                    border: '1px dashed #EF4444',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <XCircle size={16} color="#EF4444" />
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#EF4444', textTransform: 'uppercase' }}>
                          RECOMMENDATION OVERRIDE: DO NOT DISPUTE
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          Deterministic pipeline overrode recovery score because contract amendment invalidates claim.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
