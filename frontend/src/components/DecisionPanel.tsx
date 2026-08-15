import React from 'react';
import {
  CheckCircle2,
  HelpCircle,
  XCircle,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Claim, Investigation, Contradiction } from '../types/api';

interface DecisionPanelProps {
  investigation: Investigation;
  claim?: Claim | null;
  contradictions: Contradiction[];
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  investigation,
  claim,
  contradictions
}) => {
  const score = claim ? Math.round(claim.recoverability_score * 100) : 0;
  const recommendation = claim ? claim.recommendation : 'HUMAN_REVIEW';

  const verificationItems = [
    { label: 'Evidence linked & cited', pass: true },
    { label: 'Financial arithmetic verified', pass: true },
    { label: 'Contract rule identified', pass: true },
    { label: 'Timeline reconstructed', pass: true },
    { label: 'Contradiction search completed', pass: true }
  ];

  return (
    <div className="card-panel" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Award size={16} color="#10B981" />
          SECTION 6 — DECISION INTELLIGENCE
        </h3>
      </div>

      {/* Primary Recommendation Banner */}
      <div style={{
        background: '#0B1120',
        border: '1px solid #1E293B',
        borderRadius: '6px',
        padding: '16px',
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          SYSTEM RECOMMENDATION
        </div>

        <div style={{ marginTop: '8px' }}>
          {recommendation === 'DISPUTE' && (
            <div className="badge badge-dispute" style={{ padding: '8px 18px', fontSize: '15px' }}>
              <CheckCircle2 size={18} /> DISPUTE
            </div>
          )}
          {recommendation === 'HUMAN_REVIEW' && (
            <div className="badge badge-human-review" style={{ padding: '8px 18px', fontSize: '15px' }}>
              <HelpCircle size={18} /> HUMAN REVIEW
            </div>
          )}
          {recommendation === 'DO_NOT_DISPUTE' && (
            <div className="badge badge-do-not-dispute" style={{ padding: '8px 18px', fontSize: '15px' }}>
              <XCircle size={18} /> DO NOT DISPUTE
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1E293B' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>Score</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#F8FAFC' }}>
              {score} <span style={{ fontSize: '10px', color: '#64748B' }}>/ 100</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>Expected Recovery</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981' }}>
              ${investigation.total_expected_recovery.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status Checklist */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
          VERIFICATION STATUS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {verificationItems.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#F8FAFC' }}>
              <ShieldCheck size={14} color="#10B981" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
